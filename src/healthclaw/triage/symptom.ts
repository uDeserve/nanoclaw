import { SafetyAssessment, SymptomTriageSummary } from '../types.js';

const RED_FLAG_RULES: Array<{
  label: string;
  keywords: string[];
  disposition: SafetyAssessment['disposition'];
  level: SafetyAssessment['level'];
}> = [
  {
    label: 'possible chest pain emergency',
    keywords: ['chest pain', 'crushing chest pressure'],
    disposition: 'emergency_now',
    level: 'critical',
  },
  {
    label: 'possible breathing emergency',
    keywords: ['shortness of breath', 'difficulty breathing', 'cannot breathe'],
    disposition: 'emergency_now',
    level: 'critical',
  },
  {
    label: 'possible stroke symptoms',
    keywords: ['one-sided weakness', 'slurred speech', 'face droop'],
    disposition: 'emergency_now',
    level: 'critical',
  },
  {
    label: 'high fever in symptom complaint',
    keywords: ['high fever', 'temperature 39', 'temperature 40'],
    disposition: 'urgent_care',
    level: 'high',
  },
  {
    label: 'severe abdominal pain',
    keywords: ['severe abdominal pain', 'worst stomach pain'],
    disposition: 'urgent_care',
    level: 'high',
  },
];

export function runSymptomSafetyPrecheck(content: string): SafetyAssessment {
  const normalized = content.toLowerCase();
  const matchedRules = RED_FLAG_RULES.filter((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  );

  if (matchedRules.length === 0) {
    return {
      level: 'moderate',
      disposition: 'routine_follow_up',
      redFlags: [],
      rationale: [
        'no emergency red flag keyword matched in the deterministic precheck',
      ],
    };
  }

  const order: Record<SafetyAssessment['level'], number> = {
    low: 0,
    moderate: 1,
    high: 2,
    critical: 3,
  };
  const highest = matchedRules.reduce((current, candidate) =>
    order[candidate.level] > order[current.level] ? candidate : current,
  );

  return {
    level: highest.level,
    disposition: highest.disposition,
    redFlags: matchedRules.map((rule) => rule.label),
    rationale: matchedRules.map(
      (rule) => `matched red flag rule: ${rule.label}`,
    ),
  };
}

export function buildSymptomTriageSummary(
  content: string,
  safety: SafetyAssessment,
): SymptomTriageSummary {
  const trimmed = content.trim();

  if (safety.disposition === 'emergency_now') {
    return {
      symptomSummary: trimmed,
      likelyConcern: 'possible emergency red flag symptoms',
      followUpQuestions: [
        'When did this start?',
        'Is the symptom getting worse right now?',
      ],
      selfCareAdvice: ['Do not delay in-person emergency evaluation.'],
    };
  }

  if (safety.disposition === 'urgent_care') {
    return {
      symptomSummary: trimmed,
      likelyConcern: 'symptoms may need urgent same-day evaluation',
      followUpQuestions: [
        'How severe is the symptom right now?',
        'Do you also have fever, vomiting, or worsening pain?',
      ],
      selfCareAdvice: [
        'Monitor worsening symptoms closely.',
        'Seek urgent care if symptoms are escalating.',
      ],
    };
  }

  return {
    symptomSummary: trimmed,
    likelyConcern:
      'non-specific symptom complaint requiring structured follow-up',
    followUpQuestions: [
      'What is the main symptom you are most worried about?',
      'How long has this been going on?',
      'What makes it better or worse?',
    ],
    selfCareAdvice: [
      'Track symptom duration and severity.',
      'Escalate care sooner if new red flag symptoms appear.',
    ],
  };
}
