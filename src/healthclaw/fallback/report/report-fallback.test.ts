import { describe, expect, it } from 'vitest';

import { extractStructuredReportFacts } from './report-facts.js';
import {
  buildReportFollowUpPlan,
  buildReportInterpretationSummary,
} from './report-response.js';
import { runReportSafetyPrecheck } from '../../safety/report/report-safety-shell.js';

describe('HealthClaw report fallback helpers', () => {
  it('extracts abnormal findings from basic lab report text', () => {
    const facts = extractStructuredReportFacts(
      'CBC report: hemoglobin 8.2, WBC 14.5, platelets 210.',
    );

    expect(facts.testType).toBe('cbc');
    expect(facts.abnormalFindings).toContain('low hemoglobin (8.2)');
    expect(facts.abnormalFindings).toContain(
      'elevated white blood cell count (14.5)',
    );
    expect(facts.missingRequiredFields).toEqual([]);
  });

  it('escalates critical troponin report findings', () => {
    const content = 'Lab result: troponin 0.32, flagged as critical value.';
    const facts = extractStructuredReportFacts(content);
    const safety = runReportSafetyPrecheck(content, facts);

    expect(facts.criticalFindings).toContain('elevated troponin (0.32)');
    expect(safety.disposition).toBe('emergency_now');
    expect(safety.redFlags).toContain('possible critical cardiac lab finding');
  });

  it('builds follow-up when the report text is not yet available', () => {
    const content = 'Can you interpret my report?';
    const facts = extractStructuredReportFacts(content);
    const safety = runReportSafetyPrecheck(content, facts);
    const followUpPlan = buildReportFollowUpPlan(facts);
    const summary = buildReportInterpretationSummary(content, safety, facts);

    expect(facts.missingRequiredFields).toContain('report_text');
    expect(followUpPlan).toContain('paste the key report lines or impression text');
    expect(summary.followUpQuestions[0]).toContain('paste the report impression');
  });
});
