import { SafetyAssessment, StructuredMedicationFacts } from '../../types.js';
import { findMedicationReference } from '../../medication/reference.js';

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
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
  facts: StructuredMedicationFacts,
): MedicationConsultSummary {
  const primary = facts.medicationNames[0] ?? 'the medication';
  const primaryReference =
    facts.medicationNames.length > 0
      ? findMedicationReference(facts.medicationNames[0])
      : undefined;

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
        ...(primaryReference?.commonPrecautions ?? []).slice(0, 1),
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
    followUpQuestions.push(
      'What symptoms happened after taking the medication?',
    );
  }
  if (followUpQuestions.length === 0) {
    followUpQuestions.push(
      `What specific question do you have about ${primary}?`,
    );
  }

  const selfCareAdvice = dedupe([
    'Use the medication only as labeled until the question is clarified.',
    'Seek pharmacist or clinician support sooner if new warning signs appear.',
    ...(primaryReference?.commonPrecautions ?? []).slice(0, 2),
  ]);

  return {
    medicationSummary: content.trim(),
    likelyConcern:
      facts.missingRequiredFields.length > 0
        ? 'medication question requiring a bit more detail before safe guidance'
        : primaryReference
          ? `lower-acuity ${primaryReference.drugClass} question with no current deterministic red flags`
          : 'lower-acuity medication information request with no current deterministic red flags',
    followUpQuestions,
    selfCareAdvice,
  };
}
