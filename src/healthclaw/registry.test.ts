import { describe, expect, it } from 'vitest';

import {
  classifyMedicalTemplate,
  getTemplateDefinition,
} from './templates/registry.js';
import { runSymptomSafetyPrecheck } from './triage/symptom.js';

describe('HealthClaw template registry', () => {
  it('classifies medication questions from deterministic keywords', () => {
    const result = classifyMedicalTemplate(
      'I need help with the medication dose for this tablet.',
    );

    expect(result.templateId).toBe('medication_consult');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('classifies common drug-name questions as medication consults', () => {
    const result = classifyMedicalTemplate(
      'Can I take warfarin with ibuprofen?',
    );

    expect(result.templateId).toBe('medication_consult');
  });

  it('defaults to symptom triage when no stronger template matches', () => {
    const result = classifyMedicalTemplate(
      'I have a headache and sore throat.',
    );

    expect(result.templateId).toBe('symptom_triage');
  });

  it('returns the template definition for symptom triage', () => {
    const definition = getTemplateDefinition('symptom_triage');

    expect(definition.label).toBe('Symptom Triage');
    expect(definition.safetyChecks).toContain('red_flag_screen');
  });
});

describe('HealthClaw symptom safety precheck', () => {
  it('escalates chest pain symptoms to emergency disposition', () => {
    const result = runSymptomSafetyPrecheck(
      'The patient has chest pain and difficulty breathing right now.',
    );

    expect(result.disposition).toBe('emergency_now');
    expect(result.level).toBe('critical');
    expect(result.redFlags).toContain('possible chest pain emergency');
  });

  it('keeps non-red-flag symptom messages at routine follow-up', () => {
    const result = runSymptomSafetyPrecheck(
      'Mild cough for two days without worsening.',
    );

    expect(result.disposition).toBe('routine_follow_up');
    expect(result.redFlags).toHaveLength(0);
  });
});
