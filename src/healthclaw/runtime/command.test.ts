import { describe, expect, it } from 'vitest';

import {
  extractHealthClawCommand,
  formatPatientViewMessage,
} from './command.js';

describe('HealthClaw command parsing', () => {
  it('extracts the explicit HealthClaw command body from the latest command message', () => {
    const content = extractHealthClawCommand([
      { content: 'normal text' },
      { content: '/healthclaw chest pain for two hours' },
    ]);

    expect(content).toBe('chest pain for two hours');
  });

  it('returns undefined when no explicit HealthClaw command exists', () => {
    const content = extractHealthClawCommand([{ content: 'normal text only' }]);
    expect(content).toBeUndefined();
  });
});

describe('HealthClaw patient formatting', () => {
  it('formats a patient-facing triage message', () => {
    const text = formatPatientViewMessage({
      summary:
        'Initial symptom triage assessment: possible emergency red flag symptoms',
      recommendedAction: 'Escalate to in-person evaluation now.',
      followUpQuestions: ['When did this start?'],
      selfCareAdvice: ['Do not delay in-person emergency evaluation.'],
      safetyWarnings: ['possible chest pain emergency'],
      missingInformation: [],
    });

    expect(text).toContain('[HealthClaw Symptom Triage]');
    expect(text).toContain(
      'Recommended action: Escalate to in-person evaluation now.',
    );
    expect(text).toContain('- When did this start?');
  });
});
