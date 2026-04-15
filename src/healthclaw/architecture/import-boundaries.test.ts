import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src', 'healthclaw');

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

describe('HealthClaw architecture import boundaries', () => {
  it('keeps runtime out of legacy imports', () => {
    const source = read(join('runtime', 'handle-medical-message.ts'));
    const eventSource = read(join('runtime', 'handle-health-event.ts'));

    expect(source.includes('/legacy/')).toBe(false);
    expect(eventSource.includes('/legacy/')).toBe(false);
    expect(source.includes('../templates/registry.js')).toBe(false);
    expect(source.includes('../triage/symptom.js')).toBe(false);
    expect(source.includes('../medication/consult.js')).toBe(false);
    expect(source.includes('../report/interpret.js')).toBe(false);
  });

  it('keeps the router agent out of legacy imports', () => {
    const source = read(join('agents', 'router', 'router-agent.ts'));

    expect(source.includes('/legacy/')).toBe(false);
  });
});
