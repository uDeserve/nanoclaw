import {
  PlannerContext,
  PlannerDecision,
  ProactiveActionPlan,
} from '../../types.js';

function buildActionPlan(
  context: PlannerContext,
  action: Omit<ProactiveActionPlan, 'subjectId' | 'chatJid' | 'groupFolder'>,
): ProactiveActionPlan {
  return {
    subjectId: context.event.subjectId,
    chatJid: context.event.chatJid,
    groupFolder: context.event.groupFolder,
    ...action,
  };
}

export function runMockPlanner(context: PlannerContext): PlannerDecision {
  const caseState = context.activeCaseState;

  if (!caseState) {
    return {
      shouldAct: false,
      reasoning: ['no active case state was available for proactive planning'],
    };
  }

  const linkedTraceIds = context.activeTrace
    ? [context.activeTrace.id, ...caseState.linkedTraceIds]
    : caseState.linkedTraceIds;

  if (
    context.event.eventType === 'heartbeat_tick' &&
    caseState.caseStatus !== 'draft' &&
    !caseState.activeFollowUpGoal
  ) {
    return {
      shouldAct: false,
      reasoning: ['heartbeat found no active follow-up goal for this case'],
    };
  }

  if (
    context.event.eventType === 'medication_due' &&
    caseState.taskType === 'medication_consult'
  ) {
    return {
      shouldAct: true,
      reasoning: ['medication_due event should trigger a medication reminder'],
      actionPlan: buildActionPlan(context, {
        actionType: 'send_reminder',
        caseId: context.activeTrace?.id,
        linkedTraceIds,
        rationale: ['medication schedule hint is due for a reminder'],
        message:
          'HealthClaw reminder: it looks like it may be time to take your medication. Please confirm after you take it.',
      }),
    };
  }

  if (
    ['presence_detected', 'scheduled_checkin', 'state_transition_due'].includes(
      context.event.eventType,
    ) &&
    caseState.currentFollowUpFocus.length > 0
  ) {
    const nextFocus = caseState.currentFollowUpFocus[0];
    const question =
      caseState.taskType === 'symptom_triage'
        ? 'HealthClaw follow-up: since I noticed you are available, has the symptom improved, stayed the same, or become worse?'
        : caseState.taskType === 'medication_consult'
          ? 'HealthClaw follow-up: have you taken the medication, and have your symptoms improved yet?'
          : 'HealthClaw follow-up: what would you like clarified next about the report or result?';

    return {
      shouldAct: true,
      reasoning: ['event arrived while an active follow-up focus still exists'],
      actionPlan: buildActionPlan(context, {
        actionType: 'ask_follow_up',
        caseId: context.activeTrace?.id,
        linkedTraceIds,
        rationale: [`active follow-up focus remains: ${nextFocus}`],
        question,
      }),
    };
  }

  return {
    shouldAct: false,
    reasoning: ['event did not justify a proactive action in the mock planner'],
  };
}
