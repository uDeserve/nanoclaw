import { HealthEvent } from '../types.js';
import { createHealthEvent } from './events.js';

export function createHeartbeatEvent(options: {
  subjectId: string;
  chatJid: string;
  groupFolder: string;
  caseId?: string;
  occurredAt?: string;
}): HealthEvent {
  return createHealthEvent('heartbeat_tick', options);
}
