import {
  MedicalTaskTemplateId,
  TemplateClassification,
} from '../../types.js';

const TEMPLATE_SIGNALS: Array<{
  templateId: MedicalTaskTemplateId;
  confidence: number;
  keywords: string[];
}> = [
  {
    templateId: 'medication_consult',
    confidence: 0.82,
    keywords: [
      'medication',
      'medicine',
      'dose',
      'tablet',
      'capsule',
      'drug',
      'missed dose',
      'warfarin',
      'ibuprofen',
      'aspirin',
      'acetaminophen',
      'tylenol',
      'metformin',
      'amoxicillin',
    ],
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

export function classifyMedicalTemplateByKeywordFallback(
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
        reasons: matched.map(
          (keyword) => `fallback keyword router matched: ${keyword}`,
        ),
      };
    }
  }

  return {
    templateId: 'symptom_triage',
    confidence: 0.62,
    reasons: [
      'fallback keyword router defaulted to symptom_triage because no stronger signal matched',
    ],
  };
}
