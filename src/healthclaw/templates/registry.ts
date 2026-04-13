import {
  HealthClawTemplateDefinition,
  MedicalTaskTemplateId,
  TemplateClassification,
} from '../types.js';

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

const TEMPLATE_SIGNALS: Array<{
  templateId: MedicalTaskTemplateId;
  confidence: number;
  keywords: string[];
}> = [
  {
    templateId: 'medication_consult',
    confidence: 0.82,
    keywords: ['medication', 'medicine', 'dose', 'tablet', 'capsule', 'drug'],
  },
  {
    templateId: 'report_interpretation',
    confidence: 0.88,
    keywords: ['report', 'lab', 'cbc', 'blood test', 'panel', 'result'],
  },
  {
    templateId: 'imaging_qa',
    confidence: 0.88,
    keywords: ['ct', 'mri', 'x-ray', 'scan', 'ultrasound', 'imaging'],
  },
];

export function getTemplateDefinition(
  templateId: MedicalTaskTemplateId,
): HealthClawTemplateDefinition {
  return TEMPLATE_DEFINITIONS[templateId];
}

export function listTemplateDefinitions(): HealthClawTemplateDefinition[] {
  return Object.values(TEMPLATE_DEFINITIONS);
}

export function classifyMedicalTemplate(
  content: string,
): TemplateClassification {
  const normalized = content.toLowerCase();

  for (const signal of TEMPLATE_SIGNALS) {
    const matched = signal.keywords.filter((keyword) =>
      normalized.includes(keyword.toLowerCase()),
    );
    if (matched.length > 0) {
      return {
        templateId: signal.templateId,
        confidence: signal.confidence,
        reasons: matched.map((keyword) => `matched keyword: ${keyword}`),
      };
    }
  }

  return {
    templateId: 'symptom_triage',
    confidence: 0.62,
    reasons: [
      'defaulted to symptom_triage because no stronger template signal matched',
    ],
  };
}
