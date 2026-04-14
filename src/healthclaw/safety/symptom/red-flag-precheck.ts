import { SafetyAssessment, StructuredSymptomFacts } from '../../types.js';
import { extractStructuredSymptomFacts } from '../../fallback/symptom/symptom-facts.js';

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
        'no emergency red flag keyword matched in the deterministic safety shell',
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
      matchedRules.map((rule) => `matched safety shell rule: ${rule.label}`),
    ),
  };
}
