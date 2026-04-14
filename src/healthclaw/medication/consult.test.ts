import { describe, expect, it } from 'vitest';

import {
  buildMedicationConsultSummary,
  buildMedicationFollowUpPlan,
  extractStructuredMedicationFacts,
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
});
