import { SafetyAssessment, StructuredMedicationFacts } from '../../types.js';
import {
  extractStructuredMedicationFacts,
  hasRecordedMedicationAllergy,
} from '../../fallback/medication/medication-facts.js';
import {
  findMedicationInteractionRules,
  findMedicationReference,
} from '../../medication/reference.js';

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
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
        'matched medication safety shell rule for severe reaction symptoms',
      ],
    };
  }

  if (
    normalized.includes('overdose') ||
    normalized.includes('too many pills') ||
    normalized.includes('double dose twice')
  ) {
    redFlags.push('possible medication overdose');
    rationale.push('matched medication safety shell rule for overdose wording');
  }

  if (
    facts.questionType === 'missed_dose' &&
    normalized.includes('double') &&
    normalized.includes('next dose')
  ) {
    redFlags.push('unsafe missed-dose recovery plan');
    rationale.push(
      'matched medication safety shell rule for unsafe dose doubling',
    );
  }

  const matchedInteractions = findMedicationInteractionRules(
    facts.medicationNames,
  );
  for (const rule of matchedInteractions) {
    redFlags.push(rule.label);
    rationale.push(`matched medication safety shell rule: ${rule.label}`);
  }

  const allergyMedication = hasRecordedMedicationAllergy(facts);
  if (allergyMedication) {
    redFlags.push('possible medication-allergy conflict');
    rationale.push(
      `matched medication safety shell allergy history against ${allergyMedication}`,
    );
  }

  for (const medication of facts.medicationNames) {
    const reference = findMedicationReference(medication);
    if (
      facts.pregnancyStatus === 'pregnant' &&
      reference?.pregnancyCaution !== undefined
    ) {
      redFlags.push('pregnancy-related medication caution');
      rationale.push(
        `matched medication safety shell pregnancy rule for ${reference.canonicalName}`,
      );
    }
  }

  if (redFlags.length > 0) {
    const highestSeverity =
      matchedInteractions.some((rule) => rule.severity === 'high') ||
      redFlags.includes('possible medication overdose') ||
      redFlags.includes('possible medication-allergy conflict') ||
      redFlags.includes('unsafe missed-dose recovery plan');

    return {
      level: highestSeverity ? 'high' : 'moderate',
      disposition: highestSeverity ? 'urgent_care' : 'routine_follow_up',
      redFlags: dedupe(redFlags),
      rationale: dedupe(rationale),
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
      'no urgent medication safety shell rule matched in the current precheck',
    ],
  };
}
