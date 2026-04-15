import { beforeEach, describe, expect, it } from 'vitest';

import { _initTestDatabase, getMedicalTraceEvents } from '../../db.js';
import { handleMedicalMessage } from './handle-medical-message.js';
import { createHeartbeatEvent } from './heartbeat.js';
import { createHealthEvent } from './events.js';
import { handleHealthEvent } from './handle-health-event.js';

beforeEach(() => {
  _initTestDatabase();
});

describe('HealthClaw event-driven runtime', () => {
  it('asks a proactive follow-up after presence is detected for a symptom draft case', () => {
    const first = handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content: 'I have a rash on my arm.',
    });

    const result = handleHealthEvent(
      createHealthEvent('presence_detected', {
        subjectId: 'subject-1',
        chatJid: 'test-chat',
        groupFolder: 'main',
        caseId: first.trace.id,
        payload: {
          locationHint: 'bedroom',
          confidence: 0.92,
        },
      }),
    );

    expect(result.acted).toBe(true);
    expect(result.actionPlan?.actionType).toBe('ask_follow_up');
    expect(result.patientMessage).toContain('Proactive Follow-up');
    expect(result.patientMessage).toContain('Follow-up:');

    const events = getMedicalTraceEvents(result.trace.id);
    expect(events.map((event) => event.type)).toContain(
      'health_event_received',
    );
    expect(events.map((event) => event.type)).toContain(
      'planner_decision_made',
    );
    expect(events.map((event) => event.type)).toContain(
      'proactive_action_created',
    );
  });

  it('creates a medication reminder for medication_due events', () => {
    handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content: 'I take ibuprofen 200 mg tablets twice daily.',
    });

    const result = handleHealthEvent(
      createHealthEvent('medication_due', {
        subjectId: 'subject-2',
        chatJid: 'test-chat',
        groupFolder: 'main',
        payload: {
          reminderWindow: 'evening',
        },
      }),
    );

    expect(result.acted).toBe(true);
    expect(result.actionPlan?.actionType).toBe('send_reminder');
    expect(result.patientMessage).toContain('Reminder:');
    expect(result.expertView.extractedFacts).toContain(
      `selection_reason=selected the most recent medication consult for medication_due`,
    );
  });

  it('keeps heartbeat silent when no active follow-up exists', () => {
    handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content: 'Can I take warfarin with ibuprofen 200 mg tablets?',
    });

    const result = handleHealthEvent(
      createHeartbeatEvent({
        subjectId: 'subject-3',
        chatJid: 'test-chat',
        groupFolder: 'main',
      }),
    );

    expect(result.acted).toBe(false);
    expect(result.patientMessage).toBeUndefined();

    const events = getMedicalTraceEvents(result.trace.id);
    expect(events.map((event) => event.type)).toContain(
      'proactive_action_skipped',
    );
  });

  it('uses the explicit case id when an external event targets a specific case', () => {
    const symptom = handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content: 'I have a rash on my arm.',
    });

    handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content: 'Can I take warfarin with ibuprofen 200 mg tablets?',
    });

    const result = handleHealthEvent(
      createHealthEvent('external_trigger', {
        subjectId: 'subject-4',
        chatJid: 'test-chat',
        groupFolder: 'main',
        caseId: symptom.trace.id,
        payload: {
          triggerName: 'manual_case_check',
        },
      }),
    );

    expect(result.trace.parentTraceId).toBe(symptom.trace.id);
    expect(result.expertView.extractedFacts).toContain(
      'selection_reason=explicit case id matched an existing trace',
    );
  });
});
