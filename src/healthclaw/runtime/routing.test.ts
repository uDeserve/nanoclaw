import { describe, expect, it } from 'vitest';

import { detectHealthClawRoute } from './routing.js';

describe('HealthClaw auto routing', () => {
  it('prioritizes explicit commands', () => {
    const decision = detectHealthClawRoute(
      [{ content: '/healthclaw chest pain for 2 hours' }],
      true,
    );

    expect(decision).toEqual({
      content: 'chest pain for 2 hours',
      source: 'command',
    });
  });

  it('routes symptom complaints automatically when auto route is enabled', () => {
    const decision = detectHealthClawRoute(
      [
        {
          content: 'I have fever and cough for 2 days with temperature 39C.',
        },
      ],
      true,
    );

    expect(decision).toEqual({
      content: 'I have fever and cough for 2 days with temperature 39C.',
      source: 'auto',
    });
  });

  it('routes non-symptom medical templates automatically when confidence is high', () => {
    const decision = detectHealthClawRoute(
      [{ content: 'Can you explain this blood test report result?' }],
      true,
    );

    expect(decision).toEqual({
      content: 'Can you explain this blood test report result?',
      source: 'auto',
    });
  });

  it('does not auto-route generic chat', () => {
    const decision = detectHealthClawRoute(
      [{ content: 'Please summarize yesterday meeting notes.' }],
      true,
    );

    expect(decision).toBeUndefined();
  });

  it('does not auto-route when disabled', () => {
    const decision = detectHealthClawRoute(
      [{ content: 'I have chest pain for 2 hours.' }],
      false,
    );

    expect(decision).toBeUndefined();
  });
});
