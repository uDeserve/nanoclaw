export type MedicalTaskTemplateId =
  | 'symptom_triage'
  | 'medication_consult'
  | 'report_interpretation'
  | 'imaging_qa';

export type SafetyDisposition =
  | 'self_care'
  | 'routine_follow_up'
  | 'urgent_care'
  | 'emergency_now';

export type SafetyLevel = 'low' | 'moderate' | 'high' | 'critical';

export type SymptomSeverity = 'mild' | 'moderate' | 'severe';

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

export interface PatientViewOutput {
  summary: string;
  recommendedAction: string;
  followUpQuestions: string[];
  selfCareAdvice: string[];
  safetyWarnings: string[];
  missingInformation: string[];
}

export interface ExpertViewOutput {
  templateId: MedicalTaskTemplateId;
  extractedFacts: string[];
  structuredFacts?: StructuredSymptomFacts;
  safetyAssessment: SafetyAssessment;
  routingReason: string[];
}

export interface MedicalEvidenceLink {
  kind: 'user_statement' | 'rule' | 'extracted_fact';
  detail: string;
}

export interface MedicalTraceEvent {
  type:
    | 'template_classified'
    | 'structured_facts_extracted'
    | 'follow_up_merged'
    | 'safety_precheck_completed'
    | 'patient_output_created'
    | 'expert_output_created';
  createdAt: string;
  payload: Record<string, unknown>;
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
