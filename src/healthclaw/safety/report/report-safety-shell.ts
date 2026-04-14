import { SafetyAssessment, StructuredReportFacts } from '../../types.js';
import { extractStructuredReportFacts } from '../../fallback/report/report-facts.js';

export function runReportSafetyPrecheck(
  content: string,
  facts: StructuredReportFacts = extractStructuredReportFacts(content),
): SafetyAssessment {
  if (facts.criticalFindings.some((item) => item.includes('troponin'))) {
    return {
      level: 'critical',
      disposition: 'emergency_now',
      redFlags: ['possible critical cardiac lab finding'],
      rationale: ['matched report safety shell rule for elevated troponin'],
    };
  }

  if (facts.criticalFindings.length > 0) {
    return {
      level: 'high',
      disposition: 'urgent_care',
      redFlags: facts.criticalFindings,
      rationale: ['matched report safety shell rule for critical findings'],
    };
  }

  if (facts.abnormalFindings.length > 0) {
    return {
      level: 'moderate',
      disposition: 'routine_follow_up',
      redFlags: [],
      rationale: [
        'matched report fallback abnormal finding without a critical rule',
      ],
    };
  }

  return {
    level: facts.missingRequiredFields.length > 0 ? 'moderate' : 'low',
    disposition:
      facts.missingRequiredFields.length > 0
        ? 'routine_follow_up'
        : 'self_care',
    redFlags: [],
    rationale: [
      'no deterministic report safety shell rule matched in the current precheck',
    ],
  };
}
