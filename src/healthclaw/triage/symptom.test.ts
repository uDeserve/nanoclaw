import { describe, expect, it } from 'vitest';

import {
  buildSymptomFollowUpPlan,
  buildSymptomTriageSummary,
  extractStructuredSymptomFacts,
  mergeStructuredSymptomFacts,
  runSymptomSafetyPrecheck,
} from './symptom.js';

describe('symptom triage extraction', () => {
  it('extracts structured symptom facts from a simple complaint', () => {
    const facts = extractStructuredSymptomFacts(
      'I am 67 years old with severe chest pain and shortness of breath for 2 hours. Temperature 39C.',
    );

    expect(facts.ageYears).toBe(67);
    expect(facts.duration).toBe('2 hours');
    expect(facts.severity).toBe('severe');
    expect(facts.symptomLocation).toBe('chest');
    expect(facts.temperatureC).toBe(39);
    expect(facts.associatedSymptoms).toContain('shortness of breath');
    expect(facts.missingRequiredFields).toEqual([]);
  });

  it('marks missing required fields when duration is absent', () => {
    const facts = extractStructuredSymptomFacts(
      'My stomach hurts and I feel nauseated.',
    );

    expect(facts.chiefComplaint).toContain('My stomach hurts');
    expect(facts.missingRequiredFields).toEqual(['duration']);
  });

  it('elevates measured high fever to urgent care', () => {
    const facts = extractStructuredSymptomFacts(
      'I have fever and cough for 1 day. Temperature 102.2F.',
    );
    const safety = runSymptomSafetyPrecheck(
      'I have fever and cough for 1 day. Temperature 102.2F.',
      facts,
    );
    const summary = buildSymptomTriageSummary(
      'I have fever and cough for 1 day. Temperature 102.2F.',
      safety,
      facts,
    );

    expect(safety.disposition).toBe('urgent_care');
    expect(summary.structuredFacts.temperatureC).toBeCloseTo(39, 0);
  });

  it('merges follow-up structured facts into the previous symptom case', () => {
    const previous = extractStructuredSymptomFacts('I have a rash on my arm.');
    const current = extractStructuredSymptomFacts(
      'It has been there for 3 days and feels severe.',
    );
    const merged = mergeStructuredSymptomFacts(previous, current);

    expect(merged.chiefComplaint).toContain('I have a rash');
    expect(merged.duration).toBe('3 days');
    expect(merged.severity).toBe('severe');
    expect(merged.missingRequiredFields).toEqual([]);
  });

  it('builds a targeted follow-up plan from missing fields and symptom context', () => {
    const facts = extractStructuredSymptomFacts(
      'I have fever and cough on my arm.',
    );
    const safety = runSymptomSafetyPrecheck(
      'I have fever and cough on my arm.',
      facts,
    );
    const plan = buildSymptomFollowUpPlan(facts, safety);

    expect(plan).toContain('clarify how long the symptom has been present');
    expect(plan).toContain('clarify current severity');
    expect(plan).toContain('clarify measured temperature if available');
  });
});
