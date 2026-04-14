import {
  SafetyAssessment,
  StructuredSymptomFacts,
  SymptomTriageSummary,
} from '../../types.js';

const FOLLOW_UP_FIELD_PLAN: Record<string, string> = {
  chief_complaint: 'clarify the main symptom',
  duration: 'clarify how long the symptom has been present',
};

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

export function buildSymptomFollowUpPlan(
  facts: StructuredSymptomFacts,
  safety: SafetyAssessment,
): string[] {
  const plan: string[] = facts.missingRequiredFields.map(
    (field) => FOLLOW_UP_FIELD_PLAN[field] ?? `clarify ${field}`,
  );

  if (!facts.severity && safety.disposition !== 'emergency_now') {
    plan.push('clarify current severity');
  }
  if (
    !facts.temperatureC &&
    (facts.associatedSymptoms.includes('fever') ||
      facts.associatedSymptoms.includes('cough'))
  ) {
    plan.push('clarify measured temperature if available');
  }

  return dedupe(plan);
}

export function buildSymptomTriageSummary(
  content: string,
  safety: SafetyAssessment,
  facts: StructuredSymptomFacts,
): SymptomTriageSummary {
  const trimmed = content.trim();
  const mainSymptom = facts.symptomLocation
    ? `${facts.symptomLocation} symptom complaint`
    : 'symptom complaint';

  if (safety.disposition === 'emergency_now') {
    return {
      symptomSummary: trimmed,
      likelyConcern: 'possible emergency red flag symptoms',
      followUpQuestions: [
        'When did this start?',
        'Is the symptom getting worse right now?',
        'Are you alone or is someone with you right now?',
      ],
      selfCareAdvice: ['Do not delay in-person emergency evaluation.'],
      structuredFacts: facts,
    };
  }

  if (safety.disposition === 'urgent_care') {
    return {
      symptomSummary: trimmed,
      likelyConcern: 'symptoms may need urgent same-day evaluation',
      followUpQuestions: [
        facts.severity
          ? `You described the symptom as ${facts.severity}. Has it become worse in the last few hours?`
          : 'How severe is the symptom right now?',
        'Do you also have fever, vomiting, bleeding, or worsening pain?',
      ],
      selfCareAdvice: [
        'Monitor worsening symptoms closely.',
        'Seek urgent care if symptoms are escalating.',
      ],
      structuredFacts: facts,
    };
  }

  const followUpQuestions = [
    facts.missingRequiredFields.includes('chief_complaint')
      ? 'What is the main symptom you are most worried about?'
      : `Can you describe the ${mainSymptom} in a little more detail?`,
    facts.missingRequiredFields.includes('duration')
      ? 'How long has this been going on?'
      : `Has this been constant over the last ${facts.duration}?`,
    'What makes it better or worse?',
  ];

  if (!facts.severity) {
    followUpQuestions.splice(
      2,
      0,
      'How severe is it right now: mild, moderate, or severe?',
    );
  }

  return {
    symptomSummary: trimmed,
    likelyConcern:
      facts.missingRequiredFields.length > 0
        ? 'non-specific symptom complaint requiring structured follow-up'
        : 'lower-acuity symptom complaint with no current deterministic red flags',
    followUpQuestions,
    selfCareAdvice: [
      'Track symptom duration and severity.',
      'Escalate care sooner if new red flag symptoms appear.',
    ],
    structuredFacts: facts,
  };
}
