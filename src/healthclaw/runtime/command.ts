import { NewMessage } from '../../types.js';
import { PatientViewOutput } from '../types.js';

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
  const lines = [
    '[HealthClaw Symptom Triage]',
    `Summary: ${view.summary}`,
    `Recommended action: ${view.recommendedAction}`,
  ];

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
