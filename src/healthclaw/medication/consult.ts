import {
  MedicationQuestionType,
  PregnancyStatus,
  SafetyAssessment,
  StructuredMedicationFacts,
} from '../types.js';

const KNOWN_MEDICATIONS: Array<{
  canonical: string;
  aliases: string[];
}> = [
  {
    canonical: 'acetaminophen',
    aliases: ['acetaminophen', 'paracetamol', 'tylenol'],
  },
  { canonical: 'ibuprofen', aliases: ['ibuprofen', 'advil', 'motrin'] },
  { canonical: 'aspirin', aliases: ['aspirin'] },
  { canonical: 'warfarin', aliases: ['warfarin', 'coumadin'] },
  { canonical: 'amoxicillin', aliases: ['amoxicillin'] },
  { canonical: 'metformin', aliases: ['metformin'] },
  { canonical: 'lisinopril', aliases: ['lisinopril'] },
  { canonical: 'insulin', aliases: ['insulin'] },
  { canonical: 'prednisone', aliases: ['prednisone'] },
];

const SYMPTOM_KEYWORDS = [
  'rash',
  'hives',
  'swelling',
  'vomiting',
  'nausea',
  'dizziness',
  'bleeding',
  'shortness of breath',
  'difficulty breathing',
] as const;

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

function extractMedicationNames(content: string): string[] {
  const normalized = content.toLowerCase();
  return dedupe(
    KNOWN_MEDICATIONS.flatMap((entry) => {
      const positions = entry.aliases
        .map((alias) => normalized.indexOf(alias))
        .filter((index) => index >= 0);
      if (positions.length === 0) {
        return [];
      }
      return [{ canonical: entry.canonical, position: Math.min(...positions) }];
    })
      .sort((a, b) => a.position - b.position)
      .map((item) => item.canonical),
  );
}

function extractDoseText(content: string): string | undefined {
  const match = content.match(/\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units?)\b/i);
  return match ? `${match[1]} ${match[2].toLowerCase()}` : undefined;
}

function extractFrequency(content: string): string | undefined {
  const explicit = content.match(
    /\b(once daily|twice daily|three times daily|every \d+ hours?|daily|weekly)\b/i,
  );
  return explicit?.[1].toLowerCase();
}

function extractFormulation(content: string): string | undefined {
  const match = content.match(
    /\b(tablet|tablets|capsule|capsules|syrup|injection|cream|ointment|patch)\b/i,
  );
  if (!match) return undefined;
  const normalized = match[1].toLowerCase();
  if (normalized.endsWith('s')) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

function extractAge(content: string): number | undefined {
  const match = content.match(/\b(\d{1,3})\s*(?:years old|year old|yo)\b/i);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function extractPregnancyStatus(content: string): PregnancyStatus | undefined {
  const normalized = content.toLowerCase();
  if (normalized.includes('not pregnant')) {
    return 'not_pregnant';
  }
  if (normalized.includes('pregnant') || normalized.includes('pregnancy')) {
    return 'pregnant';
  }
  return undefined;
}

function extractSymptoms(content: string): string[] {
  const normalized = content.toLowerCase();
  return SYMPTOM_KEYWORDS.filter((item) => normalized.includes(item));
}

function extractAllergyHistory(content: string): string[] {
  const match = content.match(/allergic to ([a-zA-Z0-9 ,/-]+)/i);
  if (!match) return [];
  return dedupe(
    match[1]
      .split(/,|and|\//)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function classifyQuestionType(
  content: string,
  medicationNames: string[],
): MedicationQuestionType {
  const normalized = content.toLowerCase();
  if (
    normalized.includes('missed dose') ||
    normalized.includes('forgot a dose') ||
    normalized.includes('missed taking')
  ) {
    return 'missed_dose';
  }
  if (
    normalized.includes('side effect') ||
    normalized.includes('reaction') ||
    normalized.includes('after taking')
  ) {
    return 'side_effect';
  }
  if (
    normalized.includes('dose') ||
    normalized.includes('how much') ||
    normalized.includes('how many')
  ) {
    return 'dose_question';
  }
  if (
    medicationNames.length >= 2 ||
    normalized.includes('together') ||
    normalized.includes('take with') ||
    normalized.includes('combine')
  ) {
    return 'interaction_check';
  }
  return 'general_precaution';
}

export function extractStructuredMedicationFacts(
  content: string,
): StructuredMedicationFacts {
  const medicationNames = extractMedicationNames(content);
  const questionType = classifyQuestionType(content, medicationNames);
  const facts: StructuredMedicationFacts = {
    medicationNames,
    questionType,
    doseText: extractDoseText(content),
    frequency: extractFrequency(content),
    formulation: extractFormulation(content),
    ageYears: extractAge(content),
    pregnancyStatus: extractPregnancyStatus(content),
    allergyHistory: extractAllergyHistory(content),
    otherMedications: medicationNames.slice(1),
    symptoms: dedupe(extractSymptoms(content)),
    missingRequiredFields: [],
  };

  if (facts.medicationNames.length === 0) {
    facts.missingRequiredFields.push('medication_name');
  }
  if (
    facts.questionType === 'interaction_check' &&
    facts.medicationNames.length < 2
  ) {
    facts.missingRequiredFields.push('second_medication');
  }
  if (
    (facts.questionType === 'dose_question' ||
      facts.questionType === 'missed_dose') &&
    !facts.doseText
  ) {
    facts.missingRequiredFields.push('dose');
  }

  return facts;
}

export function runMedicationSafetyPrecheck(
  content: string,
  facts: StructuredMedicationFacts = extractStructuredMedicationFacts(content),
): SafetyAssessment {
  const normalized = content.toLowerCase();
  const redFlags: string[] = [];
  const rationale: string[] = [];

  if (
    normalized.includes('difficulty breathing') ||
    normalized.includes('shortness of breath') ||
    normalized.includes('swelling of lips') ||
    normalized.includes('throat is closing')
  ) {
    return {
      level: 'critical',
      disposition: 'emergency_now',
      redFlags: ['possible severe medication reaction'],
      rationale: [
        'matched emergency medication reaction symptoms after medication use',
      ],
    };
  }

  if (
    normalized.includes('overdose') ||
    normalized.includes('too many pills') ||
    normalized.includes('double dose twice')
  ) {
    redFlags.push('possible medication overdose');
    rationale.push('matched possible overdose wording');
  }

  if (
    facts.medicationNames.includes('warfarin') &&
    (facts.medicationNames.includes('ibuprofen') ||
      facts.medicationNames.includes('aspirin'))
  ) {
    redFlags.push('high-risk anticoagulant and pain-reliever combination');
    rationale.push(
      'matched deterministic interaction rule: warfarin with ibuprofen or aspirin',
    );
  }

  if (
    facts.pregnancyStatus === 'pregnant' &&
    facts.medicationNames.includes('ibuprofen')
  ) {
    redFlags.push('pregnancy-related medication caution');
    rationale.push('matched pregnancy caution rule for ibuprofen use');
  }

  if (redFlags.length > 0) {
    return {
      level: 'high',
      disposition: 'urgent_care',
      redFlags: dedupe(redFlags),
      rationale: dedupe(rationale),
    };
  }

  return {
    level: facts.missingRequiredFields.length > 0 ? 'moderate' : 'low',
    disposition:
      facts.missingRequiredFields.length > 0 ? 'routine_follow_up' : 'self_care',
    redFlags: [],
    rationale: [
      'no emergency or urgent medication safety rule matched in the deterministic precheck',
    ],
  };
}

function buildMissingFieldPlan(field: string): string {
  switch (field) {
    case 'medication_name':
      return 'clarify the exact medication name';
    case 'second_medication':
      return 'clarify the second medication for interaction checking';
    case 'dose':
      return 'clarify the dose or strength';
    default:
      return `clarify ${field}`;
  }
}

export function buildMedicationFollowUpPlan(
  facts: StructuredMedicationFacts,
): string[] {
  return dedupe(facts.missingRequiredFields.map(buildMissingFieldPlan));
}

export interface MedicationConsultSummary {
  medicationSummary: string;
  likelyConcern: string;
  followUpQuestions: string[];
  selfCareAdvice: string[];
}

export function buildMedicationConsultSummary(
  content: string,
  safety: SafetyAssessment,
  facts: StructuredMedicationFacts = extractStructuredMedicationFacts(content),
): MedicationConsultSummary {
  const primary = facts.medicationNames[0] ?? 'the medication';

  if (safety.disposition === 'emergency_now') {
    return {
      medicationSummary: content.trim(),
      likelyConcern: 'possible severe medication reaction',
      followUpQuestions: [
        'What medication did you take and when was the last dose?',
        'What symptoms are happening right now?',
      ],
      selfCareAdvice: ['Seek emergency evaluation now and do not delay care.'],
    };
  }

  if (safety.disposition === 'urgent_care') {
    return {
      medicationSummary: content.trim(),
      likelyConcern: 'possible higher-risk medication safety concern',
      followUpQuestions: [
        'What are the exact medication names involved?',
        'What dose did you take and when was the last dose?',
      ],
      selfCareAdvice: [
        'Avoid taking extra doses until the medication question is clarified.',
      ],
    };
  }

  const followUpQuestions: string[] = [];
  if (facts.missingRequiredFields.includes('medication_name')) {
    followUpQuestions.push('What is the exact medication name?');
  }
  if (facts.missingRequiredFields.includes('second_medication')) {
    followUpQuestions.push(
      'What is the other medication you want to compare it with?',
    );
  }
  if (facts.missingRequiredFields.includes('dose')) {
    followUpQuestions.push('What dose or strength is listed on the package?');
  }
  if (facts.questionType === 'side_effect' && facts.symptoms.length === 0) {
    followUpQuestions.push('What symptoms happened after taking the medication?');
  }
  if (followUpQuestions.length === 0) {
    followUpQuestions.push(`What specific question do you have about ${primary}?`);
  }

  return {
    medicationSummary: content.trim(),
    likelyConcern:
      facts.missingRequiredFields.length > 0
        ? 'medication question requiring a bit more detail before safe guidance'
        : 'lower-acuity medication information request with no current deterministic red flags',
    followUpQuestions,
    selfCareAdvice: [
      'Use the medication only as labeled until the question is clarified.',
      'Seek pharmacist or clinician support sooner if new warning signs appear.',
    ],
  };
}
