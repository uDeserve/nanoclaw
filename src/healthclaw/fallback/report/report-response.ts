import {
  ReportInterpretationSummary,
  SafetyAssessment,
  StructuredReportFacts,
} from '../../types.js';

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

function buildMissingFieldPlan(field: string): string {
  switch (field) {
    case 'report_text':
      return 'paste the key report lines or impression text';
    default:
      return `clarify ${field}`;
  }
}

export function buildReportFollowUpPlan(
  facts: StructuredReportFacts,
): string[] {
  const plan = facts.missingRequiredFields.map(buildMissingFieldPlan);
  if (!facts.testType || facts.testType === 'unknown') {
    plan.push('clarify what kind of report or lab test this is');
  }
  return dedupe(plan);
}

export function buildReportInterpretationSummary(
  content: string,
  safety: SafetyAssessment,
  facts: StructuredReportFacts,
): ReportInterpretationSummary {
  if (facts.missingRequiredFields.length > 0) {
    return {
      reportSummary: 'report text not yet available for safe interpretation',
      likelyConcern:
        'need the exact report wording before giving a safer interpretation',
      followUpQuestions: [
        'Can you paste the report impression or the exact abnormal lines?',
      ],
      selfCareAdvice: [
        'Keep the original report wording available so the next review can be more precise.',
      ],
    };
  }

  if (safety.disposition === 'emergency_now') {
    return {
      reportSummary: facts.reportText ?? content.trim(),
      likelyConcern:
        'possible critical report finding needing emergency evaluation',
      followUpQuestions: [
        'What symptoms are happening right now, if any?',
        'Was this report already reviewed by a clinician today?',
      ],
      selfCareAdvice: [
        'Do not wait for text-only interpretation if you have chest pain, breathing symptoms, or worsening condition.',
      ],
    };
  }

  if (safety.disposition === 'urgent_care') {
    return {
      reportSummary: facts.reportText ?? content.trim(),
      likelyConcern:
        'possible critical report finding needing urgent clinician review',
      followUpQuestions: [
        'Has a clinician already contacted you about these results?',
        'When was this report issued?',
      ],
      selfCareAdvice: [
        'Arrange prompt clinician follow-up and keep the original report available.',
      ],
    };
  }

  const firstFinding = facts.abnormalFindings[0];
  return {
    reportSummary: facts.reportText ?? content.trim(),
    likelyConcern: firstFinding
      ? `report shows ${firstFinding} without a current deterministic critical-value rule`
      : 'no deterministic critical report finding matched in the current text',
    followUpQuestions: [
      !facts.testType || facts.testType === 'unknown'
        ? 'What type of report or lab panel is this from?'
        : 'What question do you want answered about this report?',
    ],
    selfCareAdvice: [
      'Use the exact report wording when discussing results with a clinician.',
      'Do not change medication or treatment plans based only on this text summary.',
    ],
  };
}
