import { getMedicalTrace, getMedicalTracesForChat } from '../../db.js';
import { ActiveCaseSelection, HealthEvent, MedicalTrace } from '../types.js';

function isCaseStillActive(trace: MedicalTrace): boolean {
  return (
    trace.status === 'draft' ||
    trace.caseState.caseStatus === 'draft' ||
    trace.caseState.currentFollowUpFocus.length > 0 ||
    Boolean(trace.caseState.activeFollowUpGoal)
  );
}

function canHandleMedicationReminder(trace: MedicalTrace): boolean {
  return trace.templateId === 'medication_consult';
}

function selectFromCandidates(
  event: HealthEvent,
  traces: MedicalTrace[],
): ActiveCaseSelection {
  if (traces.length === 0) {
    return {
      candidateTraceIds: [],
      selectionReason: 'no medical traces were available for this chat',
    };
  }

  if (event.caseId) {
    const explicitTrace = getMedicalTrace(event.caseId);
    if (explicitTrace) {
      return {
        activeTrace: explicitTrace,
        activeCaseState: explicitTrace.caseState,
        candidateTraceIds: traces.map((trace) => trace.id),
        selectionReason: 'explicit case id matched an existing trace',
      };
    }
  }

  if (event.eventType === 'medication_due') {
    const medicationTrace = traces.find(canHandleMedicationReminder);
    if (medicationTrace) {
      return {
        activeTrace: medicationTrace,
        activeCaseState: medicationTrace.caseState,
        candidateTraceIds: traces.map((trace) => trace.id),
        selectionReason:
          'selected the most recent medication consult for medication_due',
      };
    }
  }

  const activeTrace = traces.find(isCaseStillActive);
  if (activeTrace) {
    return {
      activeTrace,
      activeCaseState: activeTrace.caseState,
      candidateTraceIds: traces.map((trace) => trace.id),
      selectionReason: 'selected the most recent active case for this chat',
    };
  }

  return {
    activeTrace: traces[0],
    activeCaseState: traces[0].caseState,
    candidateTraceIds: traces.map((trace) => trace.id),
    selectionReason: 'fell back to the most recent trace for this chat',
  };
}

export function selectActiveCaseForEvent(
  event: HealthEvent,
): ActiveCaseSelection {
  const traces = getMedicalTracesForChat(event.chatJid, 10);
  return selectFromCandidates(event, traces);
}
