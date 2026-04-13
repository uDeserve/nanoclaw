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
      content: 'I have chest pain and shortness of breath.',
    });

    expect(result.patientView.recommendedAction).toContain('Escalate');
    expect(result.expertView.safetyAssessment.disposition).toBe(
      'emergency_now',
    );

    const storedTrace = getMedicalTrace(result.trace.id);
    expect(storedTrace?.chatJid).toBe('test-chat');
    expect(storedTrace?.templateId).toBe('symptom_triage');

    const events = getMedicalTraceEvents(result.trace.id);
    expect(events.map((event) => event.type)).toEqual([
      'template_classified',
      'safety_precheck_completed',
      'patient_output_created',
      'expert_output_created',
    ]);
  });
});
