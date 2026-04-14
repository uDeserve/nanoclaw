import { TemplateClassification } from '../../types.js';
import { classifyMedicalTemplateByKeywordFallback } from '../../fallback/task-classifier/keyword-router.js';

export function classifyMedicalTemplate(
  content: string,
): TemplateClassification {
  // Placeholder for future agent routing. Current path uses deterministic fallback.
  return classifyMedicalTemplateByKeywordFallback(content);
}
