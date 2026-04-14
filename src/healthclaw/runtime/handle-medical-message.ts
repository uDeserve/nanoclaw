import { randomUUID } from 'crypto';

import {
  appendMedicalTraceEvent,
  getLatestMedicalTraceForChat,
  saveMedicalTrace,
} from '../../db.js';
import {
  buildMedicationCaseState,
  buildSymptomCaseState,
} from './case-state.js';
import {
  buildMedicationConsultSummary,
  buildMedicationFollowUpPlan,
  extractStructuredMedicationFacts,
  mergeStructuredMedicationFacts,
  runMedicationSafetyPrecheck,
} from '../medication/consult.js';
import {
  findMedicationInteractionRules,
  findMedicationReference,
} from '../medication/reference.js';
import { classifyMedicalTemplate } from '../templates/registry.js';
import {
  buildSymptomTriageSummary,
  buildSymptomFollowUpPlan,
  extractStructuredSymptomFacts,
  mergeStructuredSymptomFacts,
  runSymptomSafetyPrecheck,
} from '../triage/symptom.js';
import {
  ExpertViewOutput,
  MedicalRuntimeInput,
  MedicalRuntimeResult,
  MedicalTrace,
  PatientViewOutput,
  StructuredMedicationFacts,
  StructuredSymptomFacts,
} from '../types.js';

function formatStructuredSymptomFacts(facts: StructuredSymptomFacts): string[] {
  const extractedFacts: string[] = [];

  if (facts.chiefComplaint) {
    extractedFacts.push(`chief_complaint=${facts.chiefComplaint}`);
  }
  if (facts.duration) {
    extractedFacts.push(`duration=${facts.duration}`);
  }
  if (facts.severity) {
    extractedFacts.push(`severity=${facts.severity}`);
  }
  if (facts.ageYears !== undefined) {
    extractedFacts.push(`age_years=${facts.ageYears}`);
  }
  if (facts.temperatureC !== undefined) {
    extractedFacts.push(`temperature_c=${facts.temperatureC}`);
  }
  if (facts.symptomLocation) {
    extractedFacts.push(`symptom_location=${facts.symptomLocation}`);
  }
  if (facts.onset) {
    extractedFacts.push(`onset=${facts.onset}`);
  }
  for (const symptom of facts.associatedSymptoms) {
    extractedFacts.push(`associated_symptom=${symptom}`);
  }
  if (facts.missingRequiredFields.length > 0) {
    extractedFacts.push(
      `missing_required_fields=${facts.missingRequiredFields.join(',')}`,
    );
  }

  return extractedFacts;
}

function formatMedicationFacts(facts: StructuredMedicationFacts): string[] {
  const extractedFacts: string[] = [];

  for (const medication of facts.medicationNames) {
    extractedFacts.push(`medication_name=${medication}`);
  }
  extractedFacts.push(`question_type=${facts.questionType}`);
  if (facts.doseText) {
    extractedFacts.push(`dose=${facts.doseText}`);
  }
  if (facts.frequency) {
    extractedFacts.push(`frequency=${facts.frequency}`);
  }
  if (facts.formulation) {
    extractedFacts.push(`formulation=${facts.formulation}`);
  }
  if (facts.ageYears !== undefined) {
    extractedFacts.push(`age_years=${facts.ageYears}`);
  }
  if (facts.pregnancyStatus) {
    extractedFacts.push(`pregnancy_status=${facts.pregnancyStatus}`);
  }
  for (const allergy of facts.allergyHistory) {
    extractedFacts.push(`allergy_history=${allergy}`);
  }
  for (const medication of facts.otherMedications) {
    extractedFacts.push(`other_medication=${medication}`);
  }
  for (const symptom of facts.symptoms) {
    extractedFacts.push(`symptom=${symptom}`);
  }
  if (facts.missingRequiredFields.length > 0) {
    extractedFacts.push(
      `missing_required_fields=${facts.missingRequiredFields.join(',')}`,
    );
  }

  return extractedFacts;
}

function formatMedicationReferenceFacts(
  facts: StructuredMedicationFacts,
): string[] {
  const extractedFacts: string[] = [];

  for (const medication of facts.medicationNames) {
    const reference = findMedicationReference(medication);
    if (!reference) {
      continue;
    }
    extractedFacts.push(
      `medication_reference=${reference.canonicalName}:${reference.drugClass}`,
    );
    for (const use of reference.commonUses) {
      extractedFacts.push(`common_use=${reference.canonicalName}:${use}`);
    }
    for (const precaution of reference.commonPrecautions) {
      extractedFacts.push(
        `common_precaution=${reference.canonicalName}:${precaution}`,
      );
    }
    if (reference.pregnancyCaution) {
      extractedFacts.push(
        `pregnancy_caution=${reference.canonicalName}:${reference.pregnancyCaution}`,
      );
    }
  }

  for (const rule of findMedicationInteractionRules(facts.medicationNames)) {
    extractedFacts.push(
      `interaction_rule=${rule.medications.join('+')}:${rule.label}`,
    );
  }

  return extractedFacts;
}

function buildSymptomPatientSummary(
  facts: StructuredSymptomFacts,
  wasFollowUpMerge: boolean,
): string {
  const parts: string[] = [];

  if (facts.chiefComplaint) {
    parts.push(facts.chiefComplaint);
  } else {
    parts.push('symptom complaint');
  }

  if (facts.duration) {
    parts.push(`for ${facts.duration}`);
  }
  if (facts.severity) {
    parts.push(`severity reported as ${facts.severity}`);
  }
  if (facts.temperatureC !== undefined) {
    parts.push(`temperature about ${facts.temperatureC}C`);
  }

  const prefix = wasFollowUpMerge
    ? 'Updated symptom triage assessment'
    : 'Initial symptom triage assessment';

  return `${prefix}: ${parts.join(', ')}`;
}

function buildSymptomPatientView(
  summary: ReturnType<typeof buildSymptomTriageSummary>,
  safetyAssessment: ReturnType<typeof runSymptomSafetyPrecheck>,
  facts: StructuredSymptomFacts,
  wasFollowUpMerge: boolean,
  followUpPlan: string[],
): PatientViewOutput {
  let recommendedAction: string;
  if (safetyAssessment.disposition === 'emergency_now') {
    recommendedAction =
      'Seek emergency in-person evaluation now. If symptoms are worsening, call emergency services.';
  } else if (safetyAssessment.disposition === 'urgent_care') {
    recommendedAction =
      'Arrange same-day in-person medical evaluation. Escalate sooner if symptoms are worsening.';
  } else if (facts.missingRequiredFields.length > 0) {
    recommendedAction =
      'Answer the follow-up questions first so the next triage step can be made more safely.';
  } else {
    recommendedAction =
      'Continue symptom monitoring and seek routine care if the symptom persists or new warning signs appear.';
  }

  return {
    templateLabel: 'Symptom Triage',
    summary: buildSymptomPatientSummary(facts, wasFollowUpMerge),
    recommendedAction,
    nextStepFocus: followUpPlan,
    followUpQuestions: summary.followUpQuestions,
    selfCareAdvice: summary.selfCareAdvice,
    safetyWarnings: safetyAssessment.redFlags,
    missingInformation: facts.missingRequiredFields,
  };
}

function buildSymptomExpertView(
  input: MedicalRuntimeInput,
  classification: ReturnType<typeof classifyMedicalTemplate>,
  safetyAssessment: ReturnType<typeof runSymptomSafetyPrecheck>,
  facts: StructuredSymptomFacts,
  followUpPlan: string[],
  parentTraceId?: string,
): ExpertViewOutput {
  return {
    templateId: classification.templateId,
    extractedFacts: [
      ...formatStructuredSymptomFacts(facts),
      `raw_user_message=${input.content}`,
      `group_folder=${input.groupFolder}`,
      `chat_jid=${input.chatJid}`,
      ...(parentTraceId ? [`parent_trace_id=${parentTraceId}`] : []),
    ],
    structuredSymptomFacts: facts,
    safetyAssessment,
    routingReason: classification.reasons,
    followUpPlan,
  };
}

function buildMedicationPatientView(
  summary: ReturnType<typeof buildMedicationConsultSummary>,
  safetyAssessment: ReturnType<typeof runMedicationSafetyPrecheck>,
  facts: StructuredMedicationFacts,
  wasFollowUpMerge: boolean,
  followUpPlan: string[],
): PatientViewOutput {
  let recommendedAction: string;
  if (safetyAssessment.disposition === 'emergency_now') {
    recommendedAction =
      'Seek emergency evaluation now because this may represent a severe medication reaction.';
  } else if (safetyAssessment.disposition === 'urgent_care') {
    recommendedAction =
      'Arrange urgent pharmacist or clinician review before taking more medication doses.';
  } else if (facts.missingRequiredFields.length > 0) {
    recommendedAction =
      'Answer the follow-up questions first so medication guidance can be given more safely.';
  } else {
    recommendedAction =
      'Review the medication question carefully and seek routine pharmacist or clinician support if anything remains unclear.';
  }

  const summaryPrefix =
    facts.medicationNames.length > 0
      ? `${wasFollowUpMerge ? 'Updated' : 'Initial'} medication consult: ${facts.medicationNames.join(', ')}`
      : `${wasFollowUpMerge ? 'Updated' : 'Initial'} medication consult`;

  return {
    templateLabel: 'Medication Consult',
    summary: `${summaryPrefix}. ${summary.likelyConcern}`,
    recommendedAction,
    nextStepFocus: followUpPlan,
    followUpQuestions: summary.followUpQuestions,
    selfCareAdvice: summary.selfCareAdvice,
    safetyWarnings: safetyAssessment.redFlags,
    missingInformation: facts.missingRequiredFields,
  };
}

function buildMedicationExpertView(
  input: MedicalRuntimeInput,
  classification: ReturnType<typeof classifyMedicalTemplate>,
  safetyAssessment: ReturnType<typeof runMedicationSafetyPrecheck>,
  facts: StructuredMedicationFacts,
  followUpPlan: string[],
  parentTraceId?: string,
): ExpertViewOutput {
  return {
    templateId: classification.templateId,
    extractedFacts: [
      ...formatMedicationFacts(facts),
      ...formatMedicationReferenceFacts(facts),
      `raw_user_message=${input.content}`,
      `group_folder=${input.groupFolder}`,
      `chat_jid=${input.chatJid}`,
      ...(parentTraceId ? [`parent_trace_id=${parentTraceId}`] : []),
    ],
    structuredMedicationFacts: facts,
    safetyAssessment,
    routingReason: classification.reasons,
    followUpPlan,
  };
}

function shouldContinuePreviousSymptomCase(
  previousTrace: MedicalTrace | undefined,
  classification: ReturnType<typeof classifyMedicalTemplate>,
): previousTrace is MedicalTrace {
  return (
    previousTrace !== undefined &&
    previousTrace.templateId === 'symptom_triage' &&
    previousTrace.patientView.missingInformation.length > 0 &&
    classification.templateId === 'symptom_triage'
  );
}

function shouldContinuePreviousMedicationCase(
  previousTrace: MedicalTrace | undefined,
  classification: ReturnType<typeof classifyMedicalTemplate>,
): previousTrace is MedicalTrace {
  return (
    previousTrace !== undefined &&
    previousTrace.templateId === 'medication_consult' &&
    previousTrace.patientView.missingInformation.length > 0 &&
    classification.templateId === 'medication_consult'
  );
}

function buildLinkedTraceIds(previousTrace: MedicalTrace | undefined): string[] {
  if (!previousTrace) {
    return [];
  }

  return Array.from(
    new Set([previousTrace.id, ...previousTrace.caseState.linkedTraceIds]),
  );
}

function persistTrace(trace: MedicalTrace): void {
  saveMedicalTrace(trace);
  for (const event of trace.events) {
    appendMedicalTraceEvent(
      trace.id,
      event.type,
      event.payload,
      event.createdAt,
    );
  }
}

export function handleMedicalMessage(
  input: MedicalRuntimeInput,
): MedicalRuntimeResult {
  const now = new Date().toISOString();
  const classification = classifyMedicalTemplate(input.content);

  if (classification.templateId === 'medication_consult') {
    const currentFacts = extractStructuredMedicationFacts(input.content);
    const latestTrace = getLatestMedicalTraceForChat(
      input.chatJid,
      classification.templateId,
    );
    const continuingPreviousCase = shouldContinuePreviousMedicationCase(
      latestTrace,
      classification,
    );
    const facts = continuingPreviousCase
      ? mergeStructuredMedicationFacts(
          latestTrace.expertView.structuredMedicationFacts ?? {
            medicationNames: [],
            questionType: 'general_precaution',
            allergyHistory: [],
            otherMedications: [],
            symptoms: [],
            missingRequiredFields: [],
          },
          currentFacts,
        )
      : currentFacts;
    const linkedTraceIds = buildLinkedTraceIds(
      continuingPreviousCase ? latestTrace : undefined,
    );
    const safetyAssessment = runMedicationSafetyPrecheck(input.content, facts);
    const consultSummary = buildMedicationConsultSummary(
      input.content,
      safetyAssessment,
      facts,
    );
    const followUpPlan = buildMedicationFollowUpPlan(facts);
    const patientView = buildMedicationPatientView(
      consultSummary,
      safetyAssessment,
      facts,
      continuingPreviousCase,
      followUpPlan,
    );
    const expertView = buildMedicationExpertView(
      input,
      classification,
      safetyAssessment,
      facts,
      followUpPlan,
      continuingPreviousCase ? latestTrace.id : undefined,
    );

    const caseState = buildMedicationCaseState(
      facts,
      safetyAssessment,
      followUpPlan,
      linkedTraceIds,
    );
    const trace: MedicalTrace = {
      id: randomUUID(),
      chatJid: input.chatJid,
      groupFolder: input.groupFolder,
      templateId: classification.templateId,
      createdAt: now,
      updatedAt: now,
      status: facts.missingRequiredFields.length > 0 ? 'draft' : 'completed',
      parentTraceId: continuingPreviousCase ? latestTrace.id : undefined,
      userMessage: input.content,
      classification,
      safetyAssessment,
      caseState,
      patientView,
      expertView,
      evidence: [
        { kind: 'user_statement', detail: input.content },
        ...formatMedicationFacts(facts).map((fact) => ({
          kind: 'extracted_fact' as const,
          detail: fact,
        })),
        ...classification.reasons.map((reason) => ({
          kind: 'rule' as const,
          detail: reason,
        })),
        ...safetyAssessment.rationale.map((reason) => ({
          kind: 'rule' as const,
          detail: reason,
        })),
      ],
      events: [
        {
          type: 'template_classified',
          createdAt: now,
          payload: {
            templateId: classification.templateId,
            confidence: classification.confidence,
            reasons: classification.reasons,
          },
        },
        {
          type: 'structured_facts_extracted',
          createdAt: now,
          payload: {
            ...facts,
          },
        },
        ...(continuingPreviousCase
          ? [
              {
                type: 'follow_up_merged' as const,
                createdAt: now,
                payload: {
                  parentTraceId: latestTrace.id,
                  previousMissingInformation:
                    latestTrace.patientView.missingInformation,
                },
              },
            ]
          : []),
        {
          type: 'safety_precheck_completed',
          createdAt: now,
          payload: {
            level: safetyAssessment.level,
            disposition: safetyAssessment.disposition,
            redFlags: safetyAssessment.redFlags,
          },
        },
        {
          type: 'follow_up_plan_created',
          createdAt: now,
          payload: {
            followUpPlan,
            followUpQuestions: patientView.followUpQuestions,
          },
        },
        {
          type: 'case_state_updated',
          createdAt: now,
          payload: caseState,
        },
        {
          type: 'patient_output_created',
          createdAt: now,
          payload: {
            recommendedAction: patientView.recommendedAction,
            missingInformation: patientView.missingInformation,
            nextStepFocus: patientView.nextStepFocus,
          },
        },
        {
          type: 'expert_output_created',
          createdAt: now,
          payload: {
            extractedFacts: expertView.extractedFacts,
          },
        },
      ],
    };

    persistTrace(trace);
    return {
      patientView,
      expertView,
      trace,
    };
  }

  const currentFacts = extractStructuredSymptomFacts(input.content);
  const latestTrace = getLatestMedicalTraceForChat(
    input.chatJid,
    classification.templateId,
  );

  const continuingPreviousCase = shouldContinuePreviousSymptomCase(
    latestTrace,
    classification,
  );
  const structuredFacts = continuingPreviousCase
    ? mergeStructuredSymptomFacts(
        latestTrace.expertView.structuredSymptomFacts ?? {
          associatedSymptoms: [],
          missingRequiredFields: [],
        },
        currentFacts,
      )
    : currentFacts;

  const safetyAssessment = runSymptomSafetyPrecheck(
    input.content,
    structuredFacts,
  );
  const triageSummary = buildSymptomTriageSummary(
    input.content,
    safetyAssessment,
    structuredFacts,
  );
  const followUpPlan = buildSymptomFollowUpPlan(
    structuredFacts,
    safetyAssessment,
  );
  const patientView = buildSymptomPatientView(
    triageSummary,
    safetyAssessment,
    structuredFacts,
    continuingPreviousCase,
    followUpPlan,
  );
  const expertView = buildSymptomExpertView(
    input,
    classification,
    safetyAssessment,
    structuredFacts,
    followUpPlan,
    continuingPreviousCase ? latestTrace.id : undefined,
  );
  const linkedTraceIds = buildLinkedTraceIds(
    continuingPreviousCase ? latestTrace : undefined,
  );
  const caseState = buildSymptomCaseState(
    structuredFacts,
    safetyAssessment,
    followUpPlan,
    linkedTraceIds,
  );

  const trace: MedicalTrace = {
    id: randomUUID(),
    chatJid: input.chatJid,
    groupFolder: input.groupFolder,
    templateId: classification.templateId,
    createdAt: now,
    updatedAt: now,
    status: structuredFacts.missingRequiredFields.length > 0 ? 'draft' : 'completed',
    parentTraceId: continuingPreviousCase ? latestTrace.id : undefined,
    userMessage: input.content,
    classification,
    safetyAssessment,
    caseState,
    patientView,
    expertView,
    evidence: [
      { kind: 'user_statement', detail: input.content },
      ...formatStructuredSymptomFacts(structuredFacts).map((fact) => ({
        kind: 'extracted_fact' as const,
        detail: fact,
      })),
      ...classification.reasons.map((reason) => ({
        kind: 'rule' as const,
        detail: reason,
      })),
      ...safetyAssessment.rationale.map((reason) => ({
        kind: 'rule' as const,
        detail: reason,
      })),
    ],
    events: [
      {
        type: 'template_classified',
        createdAt: now,
        payload: {
          templateId: classification.templateId,
          confidence: classification.confidence,
          reasons: classification.reasons,
        },
      },
      {
        type: 'structured_facts_extracted',
        createdAt: now,
        payload: {
          ...structuredFacts,
        },
      },
      ...(continuingPreviousCase
        ? [
            {
              type: 'follow_up_merged' as const,
              createdAt: now,
              payload: {
                parentTraceId: latestTrace.id,
                previousMissingInformation:
                  latestTrace.patientView.missingInformation,
              },
            },
          ]
        : []),
      {
        type: 'safety_precheck_completed',
        createdAt: now,
        payload: {
          level: safetyAssessment.level,
          disposition: safetyAssessment.disposition,
          redFlags: safetyAssessment.redFlags,
        },
      },
      {
        type: 'follow_up_plan_created',
        createdAt: now,
        payload: {
          followUpPlan,
          followUpQuestions: patientView.followUpQuestions,
        },
      },
      {
        type: 'case_state_updated',
        createdAt: now,
        payload: caseState,
      },
      {
        type: 'patient_output_created',
        createdAt: now,
        payload: {
          recommendedAction: patientView.recommendedAction,
          missingInformation: patientView.missingInformation,
          nextStepFocus: patientView.nextStepFocus,
        },
      },
      {
        type: 'expert_output_created',
        createdAt: now,
        payload: {
          extractedFacts: expertView.extractedFacts,
        },
      },
    ],
  };

  persistTrace(trace);
  return {
    patientView,
    expertView,
    trace,
  };
}
