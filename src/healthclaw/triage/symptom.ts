import {
  SafetyAssessment,
  StructuredSymptomFacts,
  SymptomSeverity,
  SymptomTriageSummary,
} from '../types.js';

const ASSOCIATED_SYMPTOM_KEYWORDS = [
  'fever',
  'cough',
  'vomiting',
  'nausea',
  'diarrhea',
  'dizziness',
  'headache',
  'rash',
  'shortness of breath',
  'difficulty breathing',
  'weakness',
  'bleeding',
] as const;

const LOCATION_KEYWORDS = [
  'chest',
  'abdomen',
  'stomach',
  'head',
  'throat',
  'back',
  'leg',
  'arm',
] as const;

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
    label: 'possible loss of consciousness event',
    keywords: ['passed out', 'fainted', 'loss of consciousness'],
    disposition: 'emergency_now',
    level: 'critical',
  },
  {
    label: 'possible seizure event',
    keywords: ['seizure', 'convulsion'],
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
  {
    label: 'pregnancy-related bleeding concern',
    keywords: [
      'pregnant and bleeding',
      'pregnancy bleeding',
      'bleeding while pregnant',
    ],
    disposition: 'urgent_care',
    level: 'high',
  },
];

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

function shouldKeepPreviousChiefComplaint(
  currentChiefComplaint: string | undefined,
): boolean {
  if (!currentChiefComplaint) {
    return true;
  }

  return /^(it|this|they)\b/i.test(currentChiefComplaint.trim());
}

function extractDuration(content: string): string | undefined {
  const normalized = content.toLowerCase();
  const explicit = normalized.match(
    /\b(?:for|since)\s+((?:\d+\s+(?:minute|minutes|hour|hours|day|days|week|weeks|month|months))|yesterday|today|last night|this morning)\b/,
  );
  if (explicit) {
    return explicit[1];
  }

  const standalone = normalized.match(
    /\b(\d+\s+(?:minute|minutes|hour|hours|day|days|week|weeks|month|months))\b/,
  );
  return standalone?.[1];
}

function extractAge(content: string): number | undefined {
  const match = content.match(/\b(\d{1,3})\s*(?:years old|year old|yo)\b/i);
  if (!match) {
    return undefined;
  }
  return Number.parseInt(match[1], 10);
}

function extractTemperatureCelsius(content: string): number | undefined {
  const celsius = content.match(/\b(3\d(?:\.\d+)?)\s*(?:°?\s*c|celsius)\b/i);
  if (celsius) {
    return Number.parseFloat(celsius[1]);
  }

  const fahrenheit = content.match(
    /\b(9\d|10\d(?:\.\d+)?)\s*(?:°?\s*f|fahrenheit)\b/i,
  );
  if (!fahrenheit) {
    return undefined;
  }

  const tempF = Number.parseFloat(fahrenheit[1]);
  return Number.parseFloat((((tempF - 32) * 5) / 9).toFixed(1));
}

function extractSeverity(content: string): SymptomSeverity | undefined {
  const normalized = content.toLowerCase();
  if (
    normalized.includes('worst') ||
    normalized.includes('severe') ||
    normalized.includes('10/10') ||
    normalized.includes('9/10')
  ) {
    return 'severe';
  }
  if (
    normalized.includes('moderate') ||
    normalized.includes('5/10') ||
    normalized.includes('6/10') ||
    normalized.includes('7/10')
  ) {
    return 'moderate';
  }
  if (
    normalized.includes('mild') ||
    normalized.includes('slight') ||
    normalized.includes('2/10') ||
    normalized.includes('3/10')
  ) {
    return 'mild';
  }
  return undefined;
}

function extractLocation(content: string): string | undefined {
  const normalized = content.toLowerCase();
  return LOCATION_KEYWORDS.find((location) => normalized.includes(location));
}

function extractAssociatedSymptoms(content: string): string[] {
  const normalized = content.toLowerCase();
  return ASSOCIATED_SYMPTOM_KEYWORDS.filter((symptom) =>
    normalized.includes(symptom),
  );
}

function extractChiefComplaint(
  content: string,
  location?: string,
): string | undefined {
  const normalized = content.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return undefined;
  }

  const sentence = normalized.split(/[.!?]/)[0]?.trim();
  if (!sentence) {
    return undefined;
  }

  if (location || sentence.length <= 140) {
    return sentence;
  }

  return `${sentence.slice(0, 137)}...`;
}

function extractOnset(content: string): string | undefined {
  const normalized = content.toLowerCase();
  if (
    normalized.includes('suddenly') ||
    normalized.includes('all of a sudden')
  ) {
    return 'sudden';
  }
  if (normalized.includes('gradually')) {
    return 'gradual';
  }
  return undefined;
}

export function extractStructuredSymptomFacts(
  content: string,
): StructuredSymptomFacts {
  const symptomLocation = extractLocation(content);
  const chiefComplaint = extractChiefComplaint(content, symptomLocation);
  const duration = extractDuration(content);
  const structuredFacts: StructuredSymptomFacts = {
    chiefComplaint,
    duration,
    severity: extractSeverity(content),
    ageYears: extractAge(content),
    temperatureC: extractTemperatureCelsius(content),
    symptomLocation,
    onset: extractOnset(content),
    associatedSymptoms: dedupe(extractAssociatedSymptoms(content)),
    missingRequiredFields: [],
  };

  if (!structuredFacts.chiefComplaint) {
    structuredFacts.missingRequiredFields.push('chief_complaint');
  }
  if (!structuredFacts.duration) {
    structuredFacts.missingRequiredFields.push('duration');
  }

  return structuredFacts;
}

export function mergeStructuredSymptomFacts(
  previous: StructuredSymptomFacts,
  current: StructuredSymptomFacts,
): StructuredSymptomFacts {
  const merged: StructuredSymptomFacts = {
    chiefComplaint: shouldKeepPreviousChiefComplaint(current.chiefComplaint)
      ? (previous.chiefComplaint ?? current.chiefComplaint)
      : current.chiefComplaint,
    duration: current.duration ?? previous.duration,
    severity: current.severity ?? previous.severity,
    ageYears: current.ageYears ?? previous.ageYears,
    temperatureC: current.temperatureC ?? previous.temperatureC,
    symptomLocation: current.symptomLocation ?? previous.symptomLocation,
    onset: current.onset ?? previous.onset,
    associatedSymptoms: dedupe([
      ...previous.associatedSymptoms,
      ...current.associatedSymptoms,
    ]),
    missingRequiredFields: [],
  };

  if (!merged.chiefComplaint) {
    merged.missingRequiredFields.push('chief_complaint');
  }
  if (!merged.duration) {
    merged.missingRequiredFields.push('duration');
  }

  return merged;
}

export function runSymptomSafetyPrecheck(
  content: string,
  facts: StructuredSymptomFacts = extractStructuredSymptomFacts(content),
): SafetyAssessment {
  const normalized = content.toLowerCase();
  const matchedRules = RED_FLAG_RULES.filter((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  );

  if ((facts.temperatureC ?? 0) >= 39) {
    matchedRules.push({
      label: 'measured high fever at or above 39C',
      keywords: [],
      disposition: 'urgent_care',
      level: 'high',
    });
  }

  if (
    facts.severity === 'severe' &&
    facts.symptomLocation !== undefined &&
    ['chest', 'abdomen', 'stomach', 'head'].includes(facts.symptomLocation)
  ) {
    matchedRules.push({
      label: `severe pain involving ${facts.symptomLocation}`,
      keywords: [],
      disposition: 'urgent_care',
      level: 'high',
    });
  }

  if (matchedRules.length === 0) {
    return {
      level: facts.missingRequiredFields.length > 0 ? 'moderate' : 'low',
      disposition:
        facts.missingRequiredFields.length > 0
          ? 'routine_follow_up'
          : 'self_care',
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
    redFlags: dedupe(matchedRules.map((rule) => rule.label)),
    rationale: dedupe(
      matchedRules.map((rule) => `matched red flag rule: ${rule.label}`),
    ),
  };
}

export function buildSymptomTriageSummary(
  content: string,
  safety: SafetyAssessment,
  facts: StructuredSymptomFacts = extractStructuredSymptomFacts(content),
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
