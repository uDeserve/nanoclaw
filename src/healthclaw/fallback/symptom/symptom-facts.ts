import { StructuredSymptomFacts, SymptomSeverity } from '../../types.js';

const ASSOCIATED_SYMPTOM_KEYWORDS = [
  'fever',
  'cough',
  'vomiting',
  'nausea',
  'diarrhea',
  'dizziness',
  'headache',
  'rash',
  'shortness of breath',
  'difficulty breathing',
  'weakness',
  'bleeding',
] as const;

const LOCATION_KEYWORDS = [
  'chest',
  'abdomen',
  'stomach',
  'head',
  'throat',
  'back',
  'leg',
  'arm',
] as const;

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

function shouldKeepPreviousChiefComplaint(
  currentChiefComplaint: string | undefined,
): boolean {
  if (!currentChiefComplaint) {
    return true;
  }

  return /^(it|this|they)\b/i.test(currentChiefComplaint.trim());
}

function extractDuration(content: string): string | undefined {
  const normalized = content.toLowerCase();
  const explicit = normalized.match(
    /\b(?:for|since)\s+((?:\d+\s+(?:minute|minutes|hour|hours|day|days|week|weeks|month|months))|yesterday|today|last night|this morning)\b/,
  );
  if (explicit) {
    return explicit[1];
  }

  const standalone = normalized.match(
    /\b(\d+\s+(?:minute|minutes|hour|hours|day|days|week|weeks|month|months))\b/,
  );
  return standalone?.[1];
}

function extractAge(content: string): number | undefined {
  const match = content.match(/\b(\d{1,3})\s*(?:years old|year old|yo)\b/i);
  if (!match) {
    return undefined;
  }
  return Number.parseInt(match[1], 10);
}

function extractTemperatureCelsius(content: string): number | undefined {
  const celsius = content.match(/\b(3\d(?:\.\d+)?)\s*(?:度?\s*c|celsius)\b/i);
  if (celsius) {
    return Number.parseFloat(celsius[1]);
  }

  const fahrenheit = content.match(
    /\b(9\d|10\d(?:\.\d+)?)\s*(?:度?\s*f|fahrenheit)\b/i,
  );
  if (!fahrenheit) {
    return undefined;
  }

  const tempF = Number.parseFloat(fahrenheit[1]);
  return Number.parseFloat((((tempF - 32) * 5) / 9).toFixed(1));
}

function extractSeverity(content: string): SymptomSeverity | undefined {
  const normalized = content.toLowerCase();
  if (
    normalized.includes('worst') ||
    normalized.includes('severe') ||
    normalized.includes('10/10') ||
    normalized.includes('9/10')
  ) {
    return 'severe';
  }
  if (
    normalized.includes('moderate') ||
    normalized.includes('5/10') ||
    normalized.includes('6/10') ||
    normalized.includes('7/10')
  ) {
    return 'moderate';
  }
  if (
    normalized.includes('mild') ||
    normalized.includes('slight') ||
    normalized.includes('2/10') ||
    normalized.includes('3/10')
  ) {
    return 'mild';
  }
  return undefined;
}

function extractLocation(content: string): string | undefined {
  const normalized = content.toLowerCase();
  return LOCATION_KEYWORDS.find((location) => normalized.includes(location));
}

function extractAssociatedSymptoms(content: string): string[] {
  const normalized = content.toLowerCase();
  return ASSOCIATED_SYMPTOM_KEYWORDS.filter((symptom) =>
    normalized.includes(symptom),
  );
}

function extractChiefComplaint(
  content: string,
  location?: string,
): string | undefined {
  const normalized = content.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return undefined;
  }

  const sentence = normalized.split(/[.!?]/)[0]?.trim();
  if (!sentence) {
    return undefined;
  }

  if (location || sentence.length <= 140) {
    return sentence;
  }

  return `${sentence.slice(0, 137)}...`;
}

function extractOnset(content: string): string | undefined {
  const normalized = content.toLowerCase();
  if (
    normalized.includes('suddenly') ||
    normalized.includes('all of a sudden')
  ) {
    return 'sudden';
  }
  if (normalized.includes('gradually')) {
    return 'gradual';
  }
  return undefined;
}

export function extractStructuredSymptomFacts(
  content: string,
): StructuredSymptomFacts {
  const symptomLocation = extractLocation(content);
  const chiefComplaint = extractChiefComplaint(content, symptomLocation);
  const duration = extractDuration(content);
  const structuredFacts: StructuredSymptomFacts = {
    chiefComplaint,
    duration,
    severity: extractSeverity(content),
    ageYears: extractAge(content),
    temperatureC: extractTemperatureCelsius(content),
    symptomLocation,
    onset: extractOnset(content),
    associatedSymptoms: dedupe(extractAssociatedSymptoms(content)),
    missingRequiredFields: [],
  };

  if (!structuredFacts.chiefComplaint) {
    structuredFacts.missingRequiredFields.push('chief_complaint');
  }
  if (!structuredFacts.duration) {
    structuredFacts.missingRequiredFields.push('duration');
  }

  return structuredFacts;
}

export function mergeStructuredSymptomFacts(
  previous: StructuredSymptomFacts,
  current: StructuredSymptomFacts,
): StructuredSymptomFacts {
  const merged: StructuredSymptomFacts = {
    chiefComplaint: shouldKeepPreviousChiefComplaint(current.chiefComplaint)
      ? (previous.chiefComplaint ?? current.chiefComplaint)
      : current.chiefComplaint,
    duration: current.duration ?? previous.duration,
    severity: current.severity ?? previous.severity,
    ageYears: current.ageYears ?? previous.ageYears,
    temperatureC: current.temperatureC ?? previous.temperatureC,
    symptomLocation: current.symptomLocation ?? previous.symptomLocation,
    onset: current.onset ?? previous.onset,
    associatedSymptoms: dedupe([
      ...previous.associatedSymptoms,
      ...current.associatedSymptoms,
    ]),
    missingRequiredFields: [],
  };

  if (!merged.chiefComplaint) {
    merged.missingRequiredFields.push('chief_complaint');
  }
  if (!merged.duration) {
    merged.missingRequiredFields.push('duration');
  }

  return merged;
}
