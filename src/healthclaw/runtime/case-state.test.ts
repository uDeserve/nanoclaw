import { describe, expect, it } from 'vitest';

import {
  buildMedicationCaseState,
  buildSymptomCaseState,
} from './case-state.js';

describe('HealthClaw case state builders', () => {
  it('builds a symptom case state from structured symptom facts', () => {
    const state = buildSymptomCaseState(
      {
        chiefComplaint: 'rash on arm',
        duration: '3 days',
        severity: 'moderate',
        associatedSymptoms: ['rash'],
        missingRequiredFields: [],
      },
      {
        level: 'low',
        disposition: 'self_care',
        redFlags: [],
        rationale: ['no red flags matched'],
      },
      [],
      ['trace-1'],
    );

    expect(state.taskType).toBe('symptom_triage');
    expect(state.knownStructuredFacts.chiefComplaint).toBe('rash on arm');
    expect(state.caseStatus).toBe('completed');
    expect(state.linkedTraceIds).toEqual(['trace-1']);
  });

  it('builds a medication case state from structured medication facts', () => {
    const state = buildMedicationCaseState(
      {
        medicationNames: ['warfarin', 'ibuprofen'],
        questionType: 'interaction_check',
        allergyHistory: [],
        otherMedications: ['ibuprofen'],
        symptoms: [],
        missingRequiredFields: [],
      },
      {
        level: 'high',
        disposition: 'urgent_care',
        redFlags: ['high-risk interaction'],
        rationale: ['matched interaction rule'],
      },
      ['clarify clinician intent'],
      ['trace-2'],
    );

    expect(state.taskType).toBe('medication_consult');
    expect(state.knownStructuredFacts.medicationNames).toEqual([
      'warfarin',
      'ibuprofen',
    ]);
    expect(state.riskLevel).toBe('high');
    expect(state.currentFollowUpFocus).toEqual(['clarify clinician intent']);
  });
});
