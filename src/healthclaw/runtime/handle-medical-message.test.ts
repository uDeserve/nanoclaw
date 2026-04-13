import { beforeEach, describe, expect, it } from 'vitest';

import {
  _initTestDatabase,
  getMedicalTrace,
  getMedicalTraceEvents,
} from '../../db.js';
import { handleMedicalMessage } from './handle-medical-message.js';

beforeEach(() => {
  _initTestDatabase();
});

describe('HealthClaw runtime handler', () => {
  it('creates patient and expert views and persists a trace', () => {
    const result = handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content:
        'I am 67 years old with chest pain and shortness of breath for 2 hours.',
    });

    expect(result.patientView.recommendedAction).toContain('Seek emergency');
    expect(result.patientView.missingInformation).toEqual([]);
    expect(result.expertView.safetyAssessment.disposition).toBe(
      'emergency_now',
    );
    expect(result.expertView.structuredFacts?.ageYears).toBe(67);
    expect(result.expertView.extractedFacts).toContain('duration=2 hours');

    const storedTrace = getMedicalTrace(result.trace.id);
    expect(storedTrace?.chatJid).toBe('test-chat');
    expect(storedTrace?.templateId).toBe('symptom_triage');
    expect(storedTrace?.expertView.structuredFacts?.symptomLocation).toBe(
      'chest',
    );

    const events = getMedicalTraceEvents(result.trace.id);
    expect(events.map((event) => event.type)).toEqual([
      'template_classified',
      'structured_facts_extracted',
      'safety_precheck_completed',
      'patient_output_created',
      'expert_output_created',
    ]);
  });

  it('requests missing details for lower-risk symptom complaints', () => {
    const result = handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content: 'I have a rash on my arm.',
    });

    expect(result.patientView.recommendedAction).toContain(
      'follow-up questions',
    );
    expect(result.patientView.missingInformation).toEqual(['duration']);
    expect(result.expertView.safetyAssessment.disposition).toBe(
      'routine_follow_up',
    );
  });
});
