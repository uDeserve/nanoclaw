import { describe, expect, it } from 'vitest';

import {
  buildMedicationConsultSummary,
  buildMedicationFollowUpPlan,
  extractStructuredMedicationFacts,
  mergeStructuredMedicationFacts,
  runMedicationSafetyPrecheck,
} from './consult.js';

describe('HealthClaw medication consult helpers', () => {
  it('extracts medication facts and interaction intent', () => {
    const facts = extractStructuredMedicationFacts(
      'Can I take warfarin with ibuprofen 200 mg tablets?',
    );

    expect(facts.medicationNames).toEqual(['warfarin', 'ibuprofen']);
    expect(facts.questionType).toBe('interaction_check');
    expect(facts.doseText).toBe('200 mg');
    expect(facts.formulation).toBe('tablet');
  });

  it('flags high-risk medication combinations deterministically', () => {
    const facts = extractStructuredMedicationFacts(
      'Can I take warfarin with ibuprofen?',
    );
    const safety = runMedicationSafetyPrecheck(
      'Can I take warfarin with ibuprofen?',
      facts,
    );

    expect(safety.disposition).toBe('urgent_care');
    expect(safety.redFlags).toContain(
      'high-risk anticoagulant and pain-reliever combination',
    );
  });

  it('flags medication-allergy conflicts deterministically', () => {
    const content = 'I am allergic to penicillin. Can I take amoxicillin?';
    const facts = extractStructuredMedicationFacts(content);
    const safety = runMedicationSafetyPrecheck(content, facts);

    expect(facts.allergyHistory).toContain('penicillin');
    expect(safety.redFlags).toContain('possible medication-allergy conflict');
    expect(safety.disposition).toBe('urgent_care');
  });

  it('flags unsafe missed-dose doubling plans', () => {
    const content =
      'I missed a dose of insulin and plan to double the next dose.';
    const facts = extractStructuredMedicationFacts(content);
    const safety = runMedicationSafetyPrecheck(content, facts);

    expect(facts.questionType).toBe('missed_dose');
    expect(safety.redFlags).toContain('unsafe missed-dose recovery plan');
  });

  it('adds structured medication precautions to lower-risk output', () => {
    const content = 'What should I watch out for when taking ibuprofen 200 mg tablets?';
    const facts = extractStructuredMedicationFacts(content);
    const safety = runMedicationSafetyPrecheck(content, facts);
    const summary = buildMedicationConsultSummary(content, safety, facts);

    expect(summary.likelyConcern).toContain('nsaid');
    expect(summary.selfCareAdvice.some((item) => item.includes('blood thinners'))).toBe(true);
  });

  it('builds follow-up prompts when medication details are missing', () => {
    const content = 'Can I take this medicine together with another one?';
    const facts = extractStructuredMedicationFacts(content);
    const safety = runMedicationSafetyPrecheck(content, facts);
    const followUpPlan = buildMedicationFollowUpPlan(facts);
    const summary = buildMedicationConsultSummary(content, safety, facts);

    expect(facts.missingRequiredFields).toContain('medication_name');
    expect(followUpPlan).toContain('clarify the exact medication name');
    expect(summary.followUpQuestions[0]).toContain('exact medication name');
  });

  it('merges medication follow-up details into a previous draft case', () => {
    const first = extractStructuredMedicationFacts(
      'Can I take warfarin with another medicine?',
    );
    const second = extractStructuredMedicationFacts('It is ibuprofen 200 mg tablets.');
    const merged = mergeStructuredMedicationFacts(first, second);

    expect(merged.medicationNames).toEqual(['warfarin', 'ibuprofen']);
    expect(merged.questionType).toBe('interaction_check');
    expect(merged.doseText).toBe('200 mg');
    expect(merged.formulation).toBe('tablet');
    expect(merged.missingRequiredFields).toEqual([]);
  });
});
