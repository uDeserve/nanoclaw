import { describe, expect, it } from 'vitest';

import { classifyMedicalTemplate } from './router-agent.js';
import { getTemplateDefinition } from './template-catalog.js';

describe('HealthClaw router agent adapter', () => {
  it('classifies medication questions through the fallback router', () => {
    const result = classifyMedicalTemplate(
      'I need help with the medication dose for this tablet.',
    );

    expect(result.templateId).toBe('medication_consult');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.reasons[0]).toContain('fallback keyword router');
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

  it('classifies report questions from deterministic report keywords', () => {
    const result = classifyMedicalTemplate(
      'Please explain this CBC report result for me.',
    );

    expect(result.templateId).toBe('report_interpretation');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('returns the template definition for symptom triage', () => {
    const definition = getTemplateDefinition('symptom_triage');

    expect(definition.label).toBe('Symptom Triage');
    expect(definition.safetyChecks).toContain('red_flag_screen');
  });
});
