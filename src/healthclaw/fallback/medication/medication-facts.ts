import {
  MedicationQuestionType,
  PregnancyStatus,
  StructuredMedicationFacts,
} from '../../types.js';
import {
  findMedicationReference,
  MEDICATION_REFERENCE,
} from '../../medication/reference.js';

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

function mergePreferredQuestionType(
  previous: MedicationQuestionType,
  current: MedicationQuestionType,
): MedicationQuestionType {
  return current === 'general_precaution' ? previous : current;
}

function extractMedicationNames(content: string): string[] {
  const normalized = content.toLowerCase();
  return dedupe(
    MEDICATION_REFERENCE.flatMap((entry) => {
      const positions = entry.aliases
        .map((alias) => normalized.indexOf(alias))
        .filter((index) => index >= 0);
      if (positions.length === 0) {
        return [];
      }
      return [
        {
          canonical: entry.canonicalName,
          position: Math.min(...positions),
        },
      ];
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
  return normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
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
  const mentionsCombinedUse =
    /\b(take|taking|combine|mix)\b[^?.!]*\bwith\b/.test(normalized) ||
    normalized.includes('together');

  if (
    normalized.includes('missed dose') ||
    normalized.includes('missed a dose') ||
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
    mentionsCombinedUse ||
    normalized.includes('combine')
  ) {
    return 'interaction_check';
  }
  return 'general_precaution';
}

export function computeMedicationMissingRequiredFields(
  facts: Pick<
    StructuredMedicationFacts,
    'medicationNames' | 'questionType' | 'doseText'
  >,
): string[] {
  const missingRequiredFields: string[] = [];

  if (facts.medicationNames.length === 0) {
    missingRequiredFields.push('medication_name');
  }
  if (
    facts.questionType === 'interaction_check' &&
    facts.medicationNames.length < 2
  ) {
    missingRequiredFields.push('second_medication');
  }
  if (
    (facts.questionType === 'dose_question' ||
      facts.questionType === 'missed_dose') &&
    !facts.doseText
  ) {
    missingRequiredFields.push('dose');
  }

  return missingRequiredFields;
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

  facts.missingRequiredFields = computeMedicationMissingRequiredFields(facts);
  return facts;
}

export function mergeStructuredMedicationFacts(
  previous: StructuredMedicationFacts,
  current: StructuredMedicationFacts,
): StructuredMedicationFacts {
  const questionType = mergePreferredQuestionType(
    previous.questionType,
    current.questionType,
  );
  const medicationNames = dedupe([
    ...previous.medicationNames,
    ...current.medicationNames,
  ]);

  return {
    medicationNames,
    questionType,
    doseText: current.doseText ?? previous.doseText,
    frequency: current.frequency ?? previous.frequency,
    formulation: current.formulation ?? previous.formulation,
    ageYears: current.ageYears ?? previous.ageYears,
    pregnancyStatus: current.pregnancyStatus ?? previous.pregnancyStatus,
    allergyHistory: dedupe([
      ...previous.allergyHistory,
      ...current.allergyHistory,
    ]),
    otherMedications: medicationNames.slice(1),
    symptoms: dedupe([...previous.symptoms, ...current.symptoms]),
    missingRequiredFields: computeMedicationMissingRequiredFields({
      medicationNames,
      questionType,
      doseText: current.doseText ?? previous.doseText,
    }),
  };
}

export function hasRecordedMedicationAllergy(
  facts: StructuredMedicationFacts,
): string | undefined {
  for (const medication of facts.medicationNames) {
    const reference = findMedicationReference(medication);
    if (
      facts.allergyHistory.includes(medication) ||
      (reference?.allergyCrossCheckGroup &&
        facts.allergyHistory.includes(reference.allergyCrossCheckGroup))
    ) {
      return medication;
    }
  }
  return undefined;
}
