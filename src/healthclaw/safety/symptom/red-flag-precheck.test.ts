import { describe, expect, it } from 'vitest';

import { runSymptomSafetyPrecheck } from './red-flag-precheck.js';

describe('HealthClaw symptom safety shell', () => {
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
