import { randomUUID } from 'crypto';

import {
  appendMedicalTraceEvent,
  getLatestMedicalTraceForChat,
  saveMedicalTrace,
} from '../../db.js';
import { runMockPlanner } from '../agents/planner/mock-planner.js';
import {
  ExpertViewOutput,
  HealthEvent,
  HealthEventRuntimeResult,
  MedicalTrace,
  PatientViewOutput,
  PlannerContext,
} from '../types.js';
import { formatProactiveActionMessage } from './command.js';

function buildRecentTraceSummary(trace: MedicalTrace | undefined): string[] {
  if (!trace) {
    return [];
  }

  return [
    `template=${trace.templateId}`,
    `status=${trace.status}`,
    `risk=${trace.safetyAssessment.level}`,
    `follow_up_focus=${trace.caseState.currentFollowUpFocus.join('|')}`,
  ];
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

export function handleHealthEvent(
  event: HealthEvent,
): HealthEventRuntimeResult {
  const now = new Date().toISOString();
  const activeTrace = getLatestMedicalTraceForChat(event.chatJid);
  const plannerContext: PlannerContext = {
    event,
    activeTrace,
    activeCaseState: activeTrace?.caseState,
    recentTraceSummary: buildRecentTraceSummary(activeTrace),
  };
  const plannerDecision = runMockPlanner(plannerContext);

  const patientView: PatientViewOutput | undefined = plannerDecision.shouldAct
    ? {
        templateLabel: 'Proactive Follow-up',
        summary:
          plannerDecision.actionPlan?.question ??
          plannerDecision.actionPlan?.message ??
          'HealthClaw proactive follow-up',
        recommendedAction:
          plannerDecision.actionPlan?.actionType === 'send_reminder'
            ? 'Acknowledge the reminder after you complete the medication step.'
            : 'Reply to continue the active health follow-up.',
        nextStepFocus: plannerDecision.actionPlan?.rationale ?? [],
        followUpQuestions: plannerDecision.actionPlan?.question
          ? [plannerDecision.actionPlan.question]
          : [],
        selfCareAdvice: [],
        safetyWarnings: [],
        missingInformation: [],
      }
    : undefined;

  const expertView: ExpertViewOutput = {
    templateId: activeTrace?.templateId ?? 'symptom_triage',
    extractedFacts: [
      `health_event_type=${event.eventType}`,
      `health_event_source=${event.source}`,
      `subject_id=${event.subjectId}`,
      ...plannerContext.recentTraceSummary,
      ...plannerDecision.reasoning.map(
        (reason: string) => `planner_reason=${reason}`,
      ),
    ],
    safetyAssessment: activeTrace?.safetyAssessment ?? {
      level: 'low',
      disposition: 'self_care',
      redFlags: [],
      rationale: ['no active safety concern attached to the proactive event'],
    },
    routingReason: [`health event trigger: ${event.eventType}`],
    followUpPlan: plannerDecision.actionPlan?.rationale ?? [],
  };

  const caseState = activeTrace?.caseState
    ? {
        ...activeTrace.caseState,
        subjectId: event.subjectId,
        eventSourceHistory: Array.from(
          new Set([
            ...(activeTrace.caseState.eventSourceHistory ?? []),
            event.source,
          ]),
        ),
        lastProactiveContactAt: plannerDecision.shouldAct
          ? now
          : activeTrace.caseState.lastProactiveContactAt,
        casePhase: plannerDecision.shouldAct
          ? 'follow_up'
          : activeTrace.caseState.casePhase,
      }
    : {
        subjectId: event.subjectId,
        taskType: 'symptom_triage' as const,
        caseKind: 'symptom_triage' as const,
        knownStructuredFacts: {},
        missingFields: [],
        riskLevel: 'low' as const,
        disposition: 'self_care' as const,
        currentFollowUpFocus: [],
        linkedTraceIds: [],
        eventSourceHistory: [event.source],
        caseStatus: 'completed' as const,
        casePhase: 'follow_up' as const,
      };

  const trace: MedicalTrace = {
    id: randomUUID(),
    chatJid: event.chatJid,
    groupFolder: event.groupFolder,
    templateId: activeTrace?.templateId ?? 'symptom_triage',
    createdAt: now,
    updatedAt: now,
    status: plannerDecision.shouldAct ? 'draft' : 'completed',
    parentTraceId: activeTrace?.id,
    userMessage: JSON.stringify(event.payload),
    classification: activeTrace?.classification ?? {
      templateId: activeTrace?.templateId ?? 'symptom_triage',
      confidence: 1,
      reasons: [`event-driven follow-up from ${event.eventType}`],
    },
    safetyAssessment: expertView.safetyAssessment,
    caseState,
    patientView: patientView ?? {
      summary: 'HealthClaw heartbeat completed with no proactive action.',
      recommendedAction: 'No action required.',
      nextStepFocus: [],
      followUpQuestions: [],
      selfCareAdvice: [],
      safetyWarnings: [],
      missingInformation: [],
    },
    expertView,
    evidence: [
      {
        kind: 'event',
        detail: `health_event=${event.eventType}:${event.source}`,
      },
      ...plannerDecision.reasoning.map((reason: string) => ({
        kind: 'rule' as const,
        detail: reason,
      })),
    ],
    events: [
      {
        type: 'health_event_received',
        createdAt: now,
        payload: {
          eventType: event.eventType,
          source: event.source,
          subjectId: event.subjectId,
        },
      },
      {
        type: 'planner_context_built',
        createdAt: now,
        payload: {
          activeTraceId: activeTrace?.id,
          recentTraceSummary: plannerContext.recentTraceSummary,
        },
      },
      {
        type: 'planner_decision_made',
        createdAt: now,
        payload: {
          shouldAct: plannerDecision.shouldAct,
          reasoning: plannerDecision.reasoning,
        },
      },
      {
        type: plannerDecision.shouldAct
          ? 'proactive_action_created'
          : 'proactive_action_skipped',
        createdAt: now,
        payload: plannerDecision.actionPlan
          ? {
              actionType: plannerDecision.actionPlan.actionType,
              subjectId: plannerDecision.actionPlan.subjectId,
              chatJid: plannerDecision.actionPlan.chatJid,
              groupFolder: plannerDecision.actionPlan.groupFolder,
              caseId: plannerDecision.actionPlan.caseId,
              rationale: plannerDecision.actionPlan.rationale,
              question: plannerDecision.actionPlan.question,
              message: plannerDecision.actionPlan.message,
              linkedTraceIds: plannerDecision.actionPlan.linkedTraceIds,
            }
          : {
              reason: plannerDecision.reasoning,
            },
      },
      {
        type: 'case_state_updated',
        createdAt: now,
        payload: caseState,
      },
      {
        type: 'expert_output_created',
        createdAt: now,
        payload: {
          extractedFacts: expertView.extractedFacts,
        },
      },
      ...(patientView
        ? [
            {
              type: 'patient_output_created' as const,
              createdAt: now,
              payload: {
                summary: patientView.summary,
                recommendedAction: patientView.recommendedAction,
              },
            },
          ]
        : []),
    ],
  };

  persistTrace(trace);

  return {
    acted: plannerDecision.shouldAct,
    actionPlan: plannerDecision.actionPlan,
    patientView,
    patientMessage: plannerDecision.actionPlan
      ? formatProactiveActionMessage(plannerDecision.actionPlan)
      : undefined,
    expertView,
    trace,
  };
}
