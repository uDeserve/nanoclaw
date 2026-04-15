import { randomUUID } from 'crypto';

import { HealthEvent, HealthEventType } from '../types.js';

interface BaseEventOptions {
  subjectId: string;
  chatJid: string;
  groupFolder: string;
  occurredAt?: string;
  caseId?: string;
  payload?: Record<string, unknown>;
}

export function createHealthEvent(
  eventType: HealthEventType,
  options: BaseEventOptions,
): HealthEvent {
  return {
    eventId: randomUUID(),
    eventType,
    subjectId: options.subjectId,
    chatJid: options.chatJid,
    groupFolder: options.groupFolder,
    caseId: options.caseId,
    occurredAt: options.occurredAt ?? new Date().toISOString(),
    source:
      eventType === 'user_message'
        ? 'user'
        : eventType === 'heartbeat_tick'
          ? 'heartbeat'
          : eventType === 'presence_detected'
            ? 'presence_sensor'
            : eventType === 'external_trigger'
              ? 'external_system'
              : 'scheduler',
    payload: options.payload ?? {},
  };
}
