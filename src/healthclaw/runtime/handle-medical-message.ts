import { randomUUID } from 'crypto';

import { appendMedicalTraceEvent, saveMedicalTrace } from '../../db.js';
import { classifyMedicalTemplate } from '../templates/registry.js';
import {
  buildSymptomTriageSummary,
  runSymptomSafetyPrecheck,
} from '../triage/symptom.js';
import {
  ExpertViewOutput,
  MedicalRuntimeInput,
  MedicalRuntimeResult,
  MedicalTrace,
  PatientViewOutput,
} from '../types.js';

function buildPatientView(
  summary: ReturnType<typeof buildSymptomTriageSummary>,
  redFlags: string[],
): PatientViewOutput {
  return {
    summary: `Initial symptom triage assessment: ${summary.likelyConcern}`,
    recommendedAction:
      redFlags.length > 0
        ? 'Escalate to in-person evaluation now. If symptoms are worsening, use emergency care.'
        : 'Collect the missing follow-up details first, then decide if in-person care is needed.',
    followUpQuestions: summary.followUpQuestions,
    selfCareAdvice: summary.selfCareAdvice,
    safetyWarnings: redFlags,
  };
}

function buildExpertView(
  input: MedicalRuntimeInput,
  classification: ReturnType<typeof classifyMedicalTemplate>,
  safetyAssessment: ReturnType<typeof runSymptomSafetyPrecheck>,
): ExpertViewOutput {
  return {
    templateId: classification.templateId,
    extractedFacts: [
      `raw_user_message=${input.content}`,
      `group_folder=${input.groupFolder}`,
      `chat_jid=${input.chatJid}`,
    ],
    safetyAssessment,
    routingReason: classification.reasons,
  };
}

export function handleMedicalMessage(
  input: MedicalRuntimeInput,
): MedicalRuntimeResult {
  const now = new Date().toISOString();
  const classification = classifyMedicalTemplate(input.content);
  const safetyAssessment = runSymptomSafetyPrecheck(input.content);
  const triageSummary = buildSymptomTriageSummary(
    input.content,
    safetyAssessment,
  );
  const patientView = buildPatientView(
    triageSummary,
    safetyAssessment.redFlags,
  );
  const expertView = buildExpertView(input, classification, safetyAssessment);

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
