import { NewMessage } from '../../types.js';
import { classifyMedicalTemplate } from '../agents/router/router-agent.js';
import { extractStructuredSymptomFacts } from '../fallback/symptom/symptom-facts.js';
import { runSymptomSafetyPrecheck } from '../safety/symptom/red-flag-precheck.js';
import { extractHealthClawCommand } from './command.js';

export interface HealthClawRouteDecision {
  content: string;
  source: 'command' | 'auto';
}

function getLatestCandidateContent(
  messages: Pick<NewMessage, 'content'>[],
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const trimmed = messages[i].content.trim();
    if (!trimmed) continue;
    return trimmed;
  }
  return undefined;
}

function looksLikeMedicalSymptomMessage(content: string): boolean {
  const normalized = content.toLowerCase();
  return [
    'i have',
    'i feel',
    'my ',
    'pain',
    'fever',
    'cough',
    'rash',
    'vomiting',
    'dizziness',
    'headache',
    'bleeding',
  ].some((signal) => normalized.includes(signal));
}

export function detectHealthClawRoute(
  messages: Pick<NewMessage, 'content'>[],
  autoRouteEnabled: boolean,
): HealthClawRouteDecision | undefined {
  const explicitCommand = extractHealthClawCommand(messages);
  if (explicitCommand) {
    return {
      content: explicitCommand,
      source: 'command',
    };
  }

  if (!autoRouteEnabled) {
    return undefined;
  }

  const content = getLatestCandidateContent(messages);
  if (!content || content.startsWith('/')) {
    return undefined;
  }

  const facts = extractStructuredSymptomFacts(content);
  const safetyAssessment = runSymptomSafetyPrecheck(content, facts);
  const classification = classifyMedicalTemplate(content);

  const symptomEvidenceScore = [
    facts.duration !== undefined,
    facts.temperatureC !== undefined,
    facts.severity !== undefined,
    facts.symptomLocation !== undefined,
    facts.associatedSymptoms.length > 0,
    safetyAssessment.redFlags.length > 0,
  ].filter(Boolean).length;

  const nonSymptomTemplate =
    classification.templateId !== 'symptom_triage' &&
    classification.confidence >= 0.8;

  const symptomTriageCandidate =
    looksLikeMedicalSymptomMessage(content) &&
    (safetyAssessment.redFlags.length > 0 || symptomEvidenceScore >= 2);

  if (!nonSymptomTemplate && !symptomTriageCandidate) {
    return undefined;
  }

  return {
    content,
    source: 'auto',
  };
}
