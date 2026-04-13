import { randomUUID } from 'crypto';

import { appendMedicalTraceEvent, saveMedicalTrace } from '../../db.js';
import { classifyMedicalTemplate } from '../templates/registry.js';
import {
  buildSymptomTriageSummary,
  extractStructuredSymptomFacts,
  runSymptomSafetyPrecheck,
} from '../triage/symptom.js';
import {
  ExpertViewOutput,
  MedicalRuntimeInput,
  MedicalRuntimeResult,
  MedicalTrace,
  PatientViewOutput,
  StructuredSymptomFacts,
} from '../types.js';

function formatStructuredFacts(facts: StructuredSymptomFacts): string[] {
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

function buildPatientSummary(facts: StructuredSymptomFacts): string {
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

  return `Initial symptom triage assessment: ${parts.join(', ')}`;
}

function buildPatientView(
  summary: ReturnType<typeof buildSymptomTriageSummary>,
  safetyAssessment: ReturnType<typeof runSymptomSafetyPrecheck>,
  facts: StructuredSymptomFacts,
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
    summary: buildPatientSummary(facts),
    recommendedAction,
    followUpQuestions: summary.followUpQuestions,
    selfCareAdvice: summary.selfCareAdvice,
    safetyWarnings: safetyAssessment.redFlags,
    missingInformation: facts.missingRequiredFields,
  };
}

function buildExpertView(
  input: MedicalRuntimeInput,
  classification: ReturnType<typeof classifyMedicalTemplate>,
  safetyAssessment: ReturnType<typeof runSymptomSafetyPrecheck>,
  facts: StructuredSymptomFacts,
): ExpertViewOutput {
  return {
    templateId: classification.templateId,
    extractedFacts: [
      ...formatStructuredFacts(facts),
      `raw_user_message=${input.content}`,
      `group_folder=${input.groupFolder}`,
      `chat_jid=${input.chatJid}`,
    ],
    structuredFacts: facts,
    safetyAssessment,
    routingReason: classification.reasons,
  };
}

export function handleMedicalMessage(
  input: MedicalRuntimeInput,
): MedicalRuntimeResult {
  const now = new Date().toISOString();
  const classification = classifyMedicalTemplate(input.content);
  const structuredFacts = extractStructuredSymptomFacts(input.content);
  const safetyAssessment = runSymptomSafetyPrecheck(
    input.content,
    structuredFacts,
  );
  const triageSummary = buildSymptomTriageSummary(
    input.content,
    safetyAssessment,
    structuredFacts,
  );
  const patientView = buildPatientView(
    triageSummary,
    safetyAssessment,
    structuredFacts,
  );
  const expertView = buildExpertView(
    input,
    classification,
    safetyAssessment,
    structuredFacts,
  );

  const trace: MedicalTrace = {
    id: randomUUID(),
    chatJid: input.chatJid,
    groupFolder: input.groupFolder,
    templateId: classification.templateId,
    createdAt: now,
    updatedAt: now,
    status: 'completed',
    userMessage: input.content,
    classification,
    safetyAssessment,
    patientView,
    expertView,
    evidence: [
      { kind: 'user_statement', detail: input.content },
      ...formatStructuredFacts(structuredFacts).map((fact) => ({
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
        type: 'patient_output_created',
        createdAt: now,
        payload: {
          recommendedAction: patientView.recommendedAction,
          missingInformation: patientView.missingInformation,
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

  saveMedicalTrace(trace);
  for (const event of trace.events) {
    appendMedicalTraceEvent(
      trace.id,
      event.type,
      event.payload,
      event.createdAt,
    );
  }

  return {
    patientView,
    expertView,
    trace,
  };
}
