import {
  MedicalCaseState,
  MedicalTaskTemplateId,
  SafetyAssessment,
  StructuredMedicationFacts,
  StructuredReportFacts,
  StructuredSymptomFacts,
} from '../types.js';

function compactStructuredFacts(
  facts: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(facts).filter(([, value]) => {
      if (value === undefined || value === null) {
        return false;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return true;
    }),
  );
}

export function buildSymptomCaseState(
  facts: StructuredSymptomFacts,
  safety: SafetyAssessment,
  followUpPlan: string[],
  linkedTraceIds: string[],
): MedicalCaseState {
  return {
    taskType: 'symptom_triage',
    knownStructuredFacts: compactStructuredFacts({
      chiefComplaint: facts.chiefComplaint,
      duration: facts.duration,
      severity: facts.severity,
      ageYears: facts.ageYears,
      temperatureC: facts.temperatureC,
      symptomLocation: facts.symptomLocation,
      onset: facts.onset,
      associatedSymptoms: facts.associatedSymptoms,
    }),
    missingFields: facts.missingRequiredFields,
    riskLevel: safety.level,
    disposition: safety.disposition,
    currentFollowUpFocus: followUpPlan,
    linkedTraceIds,
    caseStatus: facts.missingRequiredFields.length > 0 ? 'draft' : 'completed',
  };
}

export function buildMedicationCaseState(
  facts: StructuredMedicationFacts,
  safety: SafetyAssessment,
  followUpPlan: string[],
  linkedTraceIds: string[],
): MedicalCaseState {
  return {
    taskType: 'medication_consult',
    knownStructuredFacts: compactStructuredFacts({
      medicationNames: facts.medicationNames,
      questionType: facts.questionType,
      doseText: facts.doseText,
      frequency: facts.frequency,
      formulation: facts.formulation,
      ageYears: facts.ageYears,
      pregnancyStatus: facts.pregnancyStatus,
      allergyHistory: facts.allergyHistory,
      otherMedications: facts.otherMedications,
      symptoms: facts.symptoms,
    }),
    missingFields: facts.missingRequiredFields,
    riskLevel: safety.level,
    disposition: safety.disposition,
    currentFollowUpFocus: followUpPlan,
    linkedTraceIds,
    caseStatus: facts.missingRequiredFields.length > 0 ? 'draft' : 'completed',
  };
}

export function buildReportCaseState(
  facts: StructuredReportFacts,
  safety: SafetyAssessment,
  followUpPlan: string[],
  linkedTraceIds: string[],
): MedicalCaseState {
  return {
    taskType: 'report_interpretation',
    knownStructuredFacts: compactStructuredFacts({
      reportText: facts.reportText,
      testType: facts.testType,
      abnormalFindings: facts.abnormalFindings,
      criticalFindings: facts.criticalFindings,
      impressionText: facts.impressionText,
    }),
    missingFields: facts.missingRequiredFields,
    riskLevel: safety.level,
    disposition: safety.disposition,
    currentFollowUpFocus: followUpPlan,
    linkedTraceIds,
    caseStatus: facts.missingRequiredFields.length > 0 ? 'draft' : 'completed',
  };
}

export function isCompatibleCaseStateTask(
  taskType: MedicalTaskTemplateId,
  previousTaskType: MedicalTaskTemplateId | undefined,
): boolean {
  return previousTaskType === taskType;
}
