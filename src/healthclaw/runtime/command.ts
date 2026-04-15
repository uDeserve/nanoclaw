import { NewMessage } from '../../types.js';
import { PatientViewOutput, ProactiveActionPlan } from '../types.js';

export const HEALTHCLAW_COMMAND_PREFIX = '/healthclaw';

export function extractHealthClawCommand(
  messages: Pick<NewMessage, 'content'>[],
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const trimmed = messages[i].content.trim();
    if (!trimmed.toLowerCase().startsWith(HEALTHCLAW_COMMAND_PREFIX)) {
      continue;
    }
    const content = trimmed.slice(HEALTHCLAW_COMMAND_PREFIX.length).trim();
    return content || undefined;
  }
  return undefined;
}

export function formatPatientViewMessage(view: PatientViewOutput): string {
  const templateLabel = view.templateLabel || 'Symptom Triage';
  const lines = [
    `[HealthClaw ${templateLabel}]`,
    `Summary: ${view.summary}`,
    `Recommended action: ${view.recommendedAction}`,
  ];

  if (view.nextStepFocus.length > 0) {
    lines.push('Next-step focus:');
    for (const item of view.nextStepFocus) {
      lines.push(`- ${item}`);
    }
  }

  if (view.missingInformation.length > 0) {
    lines.push('Missing information:');
    for (const item of view.missingInformation) {
      lines.push(`- ${item}`);
    }
  }

  if (view.followUpQuestions.length > 0) {
    lines.push('Follow-up questions:');
    for (const question of view.followUpQuestions) {
      lines.push(`- ${question}`);
    }
  }

  if (view.selfCareAdvice.length > 0) {
    lines.push('Self-care advice:');
    for (const advice of view.selfCareAdvice) {
      lines.push(`- ${advice}`);
    }
  }

  if (view.safetyWarnings.length > 0) {
    lines.push('Safety warnings:');
    for (const warning of view.safetyWarnings) {
      lines.push(`- ${warning}`);
    }
  }

  return lines.join('\n');
}

export function formatProactiveActionMessage(
  actionPlan: ProactiveActionPlan,
): string {
  const lines = ['[HealthClaw Proactive Follow-up]'];

  if (actionPlan.actionType === 'send_reminder') {
    lines.push(`Reminder: ${actionPlan.message ?? 'A health reminder is due.'}`);
  } else if (actionPlan.actionType === 'ask_follow_up') {
    lines.push(
      `Follow-up: ${actionPlan.question ?? actionPlan.message ?? 'HealthClaw has a follow-up question.'}`,
    );
  } else if (actionPlan.actionType === 'escalate_review') {
    lines.push(
      `Escalation: ${actionPlan.message ?? 'A higher-priority review is recommended.'}`,
    );
  } else {
    lines.push('No proactive action is needed right now.');
  }

  if (actionPlan.rationale.length > 0) {
    lines.push('Reason:');
    for (const item of actionPlan.rationale) {
      lines.push(`- ${item}`);
    }
  }

  return lines.join('\n');
}
