import {
  HealthClawTemplateDefinition,
  MedicalTaskTemplateId,
} from '../../types.js';

const TEMPLATE_DEFINITIONS: Record<
  MedicalTaskTemplateId,
  HealthClawTemplateDefinition
> = {
  symptom_triage: {
    id: 'symptom_triage',
    label: 'Symptom Triage',
    requiredFields: [
      { key: 'chief_complaint', label: 'Chief complaint', required: true },
      { key: 'duration', label: 'Duration', required: true },
    ],
    optionalFields: [
      { key: 'age', label: 'Age', required: false },
      { key: 'temperature', label: 'Temperature', required: false },
      { key: 'location', label: 'Pain location', required: false },
    ],
    outputSections: ['summary', 'recommended_action', 'follow_up_questions'],
    safetyChecks: ['red_flag_screen', 'urgency_disposition'],
  },
  medication_consult: {
    id: 'medication_consult',
    label: 'Medication Consult',
    requiredFields: [
      { key: 'medication_name', label: 'Medication name', required: true },
    ],
    optionalFields: [
      { key: 'dose', label: 'Dose', required: false },
      { key: 'frequency', label: 'Frequency', required: false },
    ],
    outputSections: ['summary', 'key_risks', 'follow_up_questions'],
    safetyChecks: ['interaction_screen', 'allergy_screen'],
  },
  report_interpretation: {
    id: 'report_interpretation',
    label: 'Report Interpretation',
    requiredFields: [
      { key: 'report_text', label: 'Report text', required: true },
    ],
    optionalFields: [{ key: 'test_type', label: 'Test type', required: false }],
    outputSections: ['summary', 'abnormal_findings', 'follow_up_questions'],
    safetyChecks: ['critical_value_screen'],
  },
  imaging_qa: {
    id: 'imaging_qa',
    label: 'Imaging QA',
    requiredFields: [
      { key: 'image_question', label: 'Imaging question', required: true },
    ],
    optionalFields: [{ key: 'modality', label: 'Modality', required: false }],
    outputSections: ['summary', 'limitations', 'follow_up_questions'],
    safetyChecks: ['acute_finding_screen'],
  },
};

export function getTemplateDefinition(
  templateId: MedicalTaskTemplateId,
): HealthClawTemplateDefinition {
  return TEMPLATE_DEFINITIONS[templateId];
}

export function listTemplateDefinitions(): HealthClawTemplateDefinition[] {
  return Object.values(TEMPLATE_DEFINITIONS);
}
