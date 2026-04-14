import {
  ReportInterpretationSummary,
  ReportTestType,
  SafetyAssessment,
  StructuredReportFacts,
} from '../types.js';

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

function detectTestType(content: string): ReportTestType | undefined {
  const normalized = content.toLowerCase();
  if (normalized.includes('cbc')) {
    return 'cbc';
  }
  if (
    normalized.includes('bmp') ||
    normalized.includes('basic metabolic panel')
  ) {
    return 'bmp';
  }
  if (
    normalized.includes('cmp') ||
    normalized.includes('comprehensive metabolic panel')
  ) {
    return 'cmp';
  }
  if (normalized.includes('troponin')) {
    return 'troponin';
  }
  if (normalized.includes('urinalysis') || normalized.includes('urine')) {
    return 'urinalysis';
  }
  if (
    normalized.includes('impression') ||
    normalized.includes('findings') ||
    normalized.includes('radiology')
  ) {
    return 'radiology_report';
  }
  if (
    normalized.includes('lab') ||
    normalized.includes('panel') ||
    normalized.includes('result')
  ) {
    return 'general_lab';
  }
  return undefined;
}

function extractImpressionText(content: string): string | undefined {
  const match = content.match(/impression[:\-]\s*([^.\n]+(?:\.[^.\n]+)*)/i);
  return match?.[1]?.trim();
}

function hasUsableReportText(content: string): boolean {
  const normalized = content.toLowerCase().trim();
  if (normalized.length < 20) {
    return false;
  }

  return (
    /(?:result|report|impression|findings)[:\-]/i.test(normalized) ||
    /\b(?:wbc|hgb|hemoglobin|platelets?|potassium|sodium|creatinine|glucose|troponin)\b/i.test(
      normalized,
    ) ||
    (/\b(?:high|low|elevated|abnormal|critical value)\b/i.test(normalized) &&
      /\d/.test(normalized))
  );
}

function pushFinding(
  findings: string[],
  criticalFindings: string[],
  finding: string,
  critical: boolean = false,
): void {
  findings.push(finding);
  if (critical) {
    criticalFindings.push(finding);
  }
}

function extractNumericValue(
  content: string,
  pattern: RegExp,
): number | undefined {
  const match = content.match(pattern);
  return match?.[1] ? Number.parseFloat(match[1]) : undefined;
}

function extractFindings(content: string): Pick<
  StructuredReportFacts,
  'abnormalFindings' | 'criticalFindings'
> {
  const abnormalFindings: string[] = [];
  const criticalFindings: string[] = [];
  const normalized = content.toLowerCase();

  const hemoglobin = extractNumericValue(
    normalized,
    /\b(?:hgb|hemoglobin)\s*(?:[:=]|\bis\b|\bat\b)?\s*(\d+(?:\.\d+)?)/i,
  );
  if (hemoglobin !== undefined && hemoglobin < 12) {
    pushFinding(
      abnormalFindings,
      criticalFindings,
      `low hemoglobin (${hemoglobin})`,
      hemoglobin < 7,
    );
  }

  const wbc = extractNumericValue(
    normalized,
    /\b(?:wbc|white blood cells?)\s*(?:[:=]|\bis\b|\bat\b)?\s*(\d+(?:\.\d+)?)/i,
  );
  if (wbc !== undefined && (wbc > 11 || wbc < 4)) {
    pushFinding(
      abnormalFindings,
      criticalFindings,
      wbc > 11 ? `elevated white blood cell count (${wbc})` : `low white blood cell count (${wbc})`,
    );
  }

  const platelets = extractNumericValue(
    normalized,
    /\bplatelets?\s*(?:[:=]|\bis\b|\bat\b)?\s*(\d+(?:\.\d+)?)/i,
  );
  if (platelets !== undefined && platelets < 150) {
    pushFinding(
      abnormalFindings,
      criticalFindings,
      `low platelets (${platelets})`,
      platelets < 50,
    );
  }

  const potassium = extractNumericValue(
    normalized,
    /\bpotassium\s*(?:[:=]|\bis\b|\bat\b)?\s*(\d+(?:\.\d+)?)/i,
  );
  if (potassium !== undefined && (potassium < 3.5 || potassium > 5.1)) {
    pushFinding(
      abnormalFindings,
      criticalFindings,
      potassium < 3.5 ? `low potassium (${potassium})` : `high potassium (${potassium})`,
      potassium < 3 || potassium >= 6,
    );
  }

  const sodium = extractNumericValue(
    normalized,
    /\bsodium\s*(?:[:=]|\bis\b|\bat\b)?\s*(\d+(?:\.\d+)?)/i,
  );
  if (sodium !== undefined && (sodium < 135 || sodium > 145)) {
    pushFinding(
      abnormalFindings,
      criticalFindings,
      sodium < 135 ? `low sodium (${sodium})` : `high sodium (${sodium})`,
      sodium < 125 || sodium > 155,
    );
  }

  const creatinine = extractNumericValue(
    normalized,
    /\bcreatinine\s*(?:[:=]|\bis\b|\bat\b)?\s*(\d+(?:\.\d+)?)/i,
  );
  if (creatinine !== undefined && creatinine > 1.3) {
    pushFinding(
      abnormalFindings,
      criticalFindings,
      `elevated creatinine (${creatinine})`,
    );
  }

  const glucose = extractNumericValue(
    normalized,
    /\bglucose\s*(?:[:=]|\bis\b|\bat\b)?\s*(\d+(?:\.\d+)?)/i,
  );
  if (glucose !== undefined && glucose > 140) {
    pushFinding(
      abnormalFindings,
      criticalFindings,
      `elevated glucose (${glucose})`,
      glucose >= 400,
    );
  }

  const troponin = extractNumericValue(
    normalized,
    /\btroponin\s*(?:[:=]|\bis\b|\bat\b)?\s*(\d+(?:\.\d+)?)/i,
  );
  if (troponin !== undefined && troponin > 0.04) {
    pushFinding(
      abnormalFindings,
      criticalFindings,
      `elevated troponin (${troponin})`,
      true,
    );
  }

  if (
    normalized.includes('critical value') ||
    normalized.includes('panic value')
  ) {
    pushFinding(
      abnormalFindings,
      criticalFindings,
      'report includes critical-value wording',
      true,
    );
  }

  return {
    abnormalFindings: dedupe(abnormalFindings),
    criticalFindings: dedupe(criticalFindings),
  };
}

export function extractStructuredReportFacts(
  content: string,
): StructuredReportFacts {
  const reportText = hasUsableReportText(content) ? content.trim() : undefined;
  const findings = extractFindings(content);
  const facts: StructuredReportFacts = {
    reportText,
    testType: detectTestType(content) ?? (reportText ? 'unknown' : undefined),
    abnormalFindings: findings.abnormalFindings,
    criticalFindings: findings.criticalFindings,
    impressionText: extractImpressionText(content),
    missingRequiredFields: [],
  };

  if (!facts.reportText) {
    facts.missingRequiredFields.push('report_text');
  }

  return facts;
}

export function runReportSafetyPrecheck(
  content: string,
  facts: StructuredReportFacts = extractStructuredReportFacts(content),
): SafetyAssessment {
  if (facts.criticalFindings.some((item) => item.includes('troponin'))) {
    return {
      level: 'critical',
      disposition: 'emergency_now',
      redFlags: ['possible critical cardiac lab finding'],
      rationale: ['matched elevated troponin critical-value rule'],
    };
  }

  if (facts.criticalFindings.length > 0) {
    return {
      level: 'high',
      disposition: 'urgent_care',
      redFlags: facts.criticalFindings,
      rationale: ['matched deterministic critical lab/report finding rule'],
    };
  }

  if (facts.abnormalFindings.length > 0) {
    return {
      level: 'moderate',
      disposition: 'routine_follow_up',
      redFlags: [],
      rationale: ['matched abnormal lab/report finding without critical-value rule'],
    };
  }

  return {
    level: facts.missingRequiredFields.length > 0 ? 'moderate' : 'low',
    disposition:
      facts.missingRequiredFields.length > 0 ? 'routine_follow_up' : 'self_care',
    redFlags: [],
    rationale: [
      'no deterministic critical report rule matched in the current precheck',
    ],
  };
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
  facts: StructuredReportFacts = extractStructuredReportFacts(content),
): ReportInterpretationSummary {
  if (facts.missingRequiredFields.length > 0) {
    return {
      reportSummary: 'report text not yet available for safe interpretation',
      likelyConcern: 'need the exact report wording before giving a safer interpretation',
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
      likelyConcern: 'possible critical report finding needing emergency evaluation',
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
      likelyConcern: 'possible critical report finding needing urgent clinician review',
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
