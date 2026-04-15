export type MedicalTaskTemplateId =
  | 'symptom_triage'
  | 'medication_consult'
  | 'report_interpretation'
  | 'imaging_qa';

export type HealthEventType =
  | 'user_message'
  | 'heartbeat_tick'
  | 'scheduled_checkin'
  | 'medication_due'
  | 'presence_detected'
  | 'state_transition_due'
  | 'external_trigger';

export type HealthEventSource =
  | 'user'
  | 'heartbeat'
  | 'scheduler'
  | 'presence_sensor'
  | 'external_system'
  | 'runtime';

export type SafetyDisposition =
  | 'self_care'
  | 'routine_follow_up'
  | 'urgent_care'
  | 'emergency_now';

export type SafetyLevel = 'low' | 'moderate' | 'high' | 'critical';

export type SymptomSeverity = 'mild' | 'moderate' | 'severe';
export type MedicationQuestionType =
  | 'interaction_check'
  | 'dose_question'
  | 'missed_dose'
  | 'side_effect'
  | 'general_precaution';
export type PregnancyStatus = 'pregnant' | 'not_pregnant' | 'unknown';
export type ReportTestType =
  | 'cbc'
  | 'bmp'
  | 'cmp'
  | 'troponin'
  | 'urinalysis'
  | 'radiology_report'
  | 'general_lab'
  | 'unknown';

export interface TemplateFieldDefinition {
  key: string;
  label: string;
  required: boolean;
}

export interface HealthClawTemplateDefinition {
  id: MedicalTaskTemplateId;
  label: string;
  requiredFields: TemplateFieldDefinition[];
  optionalFields: TemplateFieldDefinition[];
  outputSections: string[];
  safetyChecks: string[];
}

export interface TemplateClassification {
  templateId: MedicalTaskTemplateId;
  confidence: number;
  reasons: string[];
}

export interface HealthEvent {
  eventId: string;
  eventType: HealthEventType;
  subjectId: string;
  chatJid: string;
  groupFolder: string;
  caseId?: string;
  occurredAt: string;
  source: HealthEventSource;
  payload: Record<string, unknown>;
}

export interface StructuredSymptomFacts {
  chiefComplaint?: string;
  duration?: string;
  severity?: SymptomSeverity;
  ageYears?: number;
  temperatureC?: number;
  symptomLocation?: string;
  onset?: string;
  associatedSymptoms: string[];
  missingRequiredFields: string[];
}

export interface StructuredMedicationFacts {
  medicationNames: string[];
  questionType: MedicationQuestionType;
  doseText?: string;
  frequency?: string;
  formulation?: string;
  ageYears?: number;
  pregnancyStatus?: PregnancyStatus;
  allergyHistory: string[];
  otherMedications: string[];
  symptoms: string[];
  missingRequiredFields: string[];
}

export interface StructuredReportFacts {
  reportText?: string;
  testType?: ReportTestType;
  abnormalFindings: string[];
  criticalFindings: string[];
  impressionText?: string;
  missingRequiredFields: string[];
}

export interface MedicationReferenceRecord {
  canonicalName: string;
  aliases: string[];
  drugClass: string;
  commonUses: string[];
  commonPrecautions: string[];
  pregnancyCaution?: string;
  allergyCrossCheckGroup?: string;
}

export interface MedicationInteractionRule {
  medications: [string, string];
  severity: 'moderate' | 'high';
  label: string;
  recommendation: string;
}

export interface SafetyAssessment {
  level: SafetyLevel;
  disposition: SafetyDisposition;
  redFlags: string[];
  rationale: string[];
}

export interface SymptomTriageSummary {
  symptomSummary: string;
  likelyConcern: string;
  followUpQuestions: string[];
  selfCareAdvice: string[];
  structuredFacts: StructuredSymptomFacts;
}

export interface ReportInterpretationSummary {
  reportSummary: string;
  likelyConcern: string;
  followUpQuestions: string[];
  selfCareAdvice: string[];
}

export interface PatientViewOutput {
  templateLabel?: string;
  summary: string;
  recommendedAction: string;
  nextStepFocus: string[];
  followUpQuestions: string[];
  selfCareAdvice: string[];
  safetyWarnings: string[];
  missingInformation: string[];
}

export interface ExpertViewOutput {
  templateId: MedicalTaskTemplateId;
  extractedFacts: string[];
  structuredSymptomFacts?: StructuredSymptomFacts;
  structuredMedicationFacts?: StructuredMedicationFacts;
  structuredReportFacts?: StructuredReportFacts;
  safetyAssessment: SafetyAssessment;
  routingReason: string[];
  followUpPlan: string[];
}

export interface MedicalEvidenceLink {
  kind: 'event' | 'user_statement' | 'rule' | 'extracted_fact';
  detail: string;
}

export interface MedicalCaseState {
  [key: string]: unknown;
  subjectId?: string;
  caseKind?: MedicalTaskTemplateId;
  taskType: MedicalTaskTemplateId;
  knownStructuredFacts: Record<string, unknown>;
  missingFields: string[];
  riskLevel: SafetyLevel;
  disposition: SafetyDisposition;
  currentFollowUpFocus: string[];
  linkedTraceIds: string[];
  activeFollowUpGoal?: string;
  nextSuggestedCheckAt?: string;
  lastProactiveContactAt?: string;
  medicationScheduleHints?: string[];
  casePhase?: 'intake' | 'monitoring' | 'follow_up' | 'closed';
  eventSourceHistory?: HealthEventSource[];
  caseStatus: 'draft' | 'completed';
}

export interface MedicalTraceEvent {
  type:
    | 'template_classified'
    | 'structured_facts_extracted'
    | 'follow_up_merged'
    | 'follow_up_plan_created'
    | 'case_state_updated'
    | 'safety_precheck_completed'
    | 'patient_output_created'
    | 'expert_output_created'
    | 'health_event_received'
    | 'planner_context_built'
    | 'planner_decision_made'
    | 'proactive_action_created'
    | 'proactive_action_skipped';
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface PlannerContext {
  event: HealthEvent;
  activeTrace?: MedicalTrace;
  activeCaseState?: MedicalCaseState;
  recentTraceSummary: string[];
}

export type ProactiveActionType =
  | 'ask_follow_up'
  | 'send_reminder'
  | 'stay_silent'
  | 'escalate_review';

export interface ProactiveActionPlan {
  actionType: ProactiveActionType;
  subjectId: string;
  chatJid: string;
  groupFolder: string;
  caseId?: string;
  rationale: string[];
  question?: string;
  message?: string;
  linkedTraceIds: string[];
}

export interface PlannerDecision {
  shouldAct: boolean;
  actionPlan?: ProactiveActionPlan;
  reasoning: string[];
}

export interface MedicalTrace {
  id: string;
  chatJid: string;
  groupFolder: string;
  templateId: MedicalTaskTemplateId;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'completed';
  parentTraceId?: string;
  userMessage: string;
  classification: TemplateClassification;
  safetyAssessment: SafetyAssessment;
  caseState: MedicalCaseState;
  patientView: PatientViewOutput;
  expertView: ExpertViewOutput;
  evidence: MedicalEvidenceLink[];
  events: MedicalTraceEvent[];
}

export interface MedicalRuntimeInput {
  chatJid: string;
  groupFolder: string;
  content: string;
}

export interface MedicalRuntimeResult {
  patientView: PatientViewOutput;
  expertView: ExpertViewOutput;
  trace: MedicalTrace;
}

export interface HealthEventRuntimeResult {
  acted: boolean;
  actionPlan?: ProactiveActionPlan;
  patientView?: PatientViewOutput;
  patientMessage?: string;
  expertView: ExpertViewOutput;
  trace: MedicalTrace;
}
