import { beforeEach, describe, expect, it } from 'vitest';

import {
  _initTestDatabase,
  getMedicalTrace,
  getMedicalTraceEvents,
} from '../../db.js';
import { handleMedicalMessage } from './handle-medical-message.js';

beforeEach(() => {
  _initTestDatabase();
});

describe('HealthClaw runtime handler', () => {
  it('creates patient and expert views and persists a trace', () => {
    const result = handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content:
        'I am 67 years old with chest pain and shortness of breath for 2 hours.',
    });

    expect(result.patientView.recommendedAction).toContain('Seek emergency');
    expect(result.patientView.missingInformation).toEqual([]);
    expect(result.patientView.nextStepFocus).toEqual([]);
    expect(result.patientView.templateLabel).toBe('Symptom Triage');
    expect(result.expertView.safetyAssessment.disposition).toBe(
      'emergency_now',
    );
    expect(result.expertView.structuredSymptomFacts?.ageYears).toBe(67);
    expect(result.expertView.extractedFacts).toContain('duration=2 hours');

    const storedTrace = getMedicalTrace(result.trace.id);
    expect(storedTrace?.chatJid).toBe('test-chat');
    expect(storedTrace?.templateId).toBe('symptom_triage');
    expect(
      storedTrace?.expertView.structuredSymptomFacts?.symptomLocation,
    ).toBe('chest');
    expect(storedTrace?.caseState.taskType).toBe('symptom_triage');
    expect(storedTrace?.caseState.riskLevel).toBe('critical');

    const events = getMedicalTraceEvents(result.trace.id);
    expect(events.map((event) => event.type)).toEqual([
      'template_classified',
      'structured_facts_extracted',
      'safety_precheck_completed',
      'follow_up_plan_created',
      'case_state_updated',
      'patient_output_created',
      'expert_output_created',
    ]);
  });

  it('keeps symptom traces in draft when required details are still missing', () => {
    const result = handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content: 'I have a rash on my arm.',
    });

    expect(result.trace.status).toBe('draft');
    expect(result.patientView.missingInformation).toEqual(['duration']);
    expect(result.patientView.nextStepFocus).toContain(
      'clarify how long the symptom has been present',
    );
    expect(result.expertView.followUpPlan).toContain(
      'clarify current severity',
    );
    expect(result.expertView.safetyAssessment.disposition).toBe(
      'routine_follow_up',
    );
  });

  it('merges a follow-up reply into the previous draft symptom trace', () => {
    const first = handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content: 'I have a rash on my arm.',
    });

    const second = handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content: 'It has been there for 3 days and is getting worse.',
    });

    expect(first.trace.status).toBe('draft');
    expect(second.trace.parentTraceId).toBe(first.trace.id);
    expect(second.trace.status).toBe('completed');
    expect(second.patientView.summary).toContain('Updated symptom triage');
    expect(second.patientView.missingInformation).toEqual([]);
    expect(second.patientView.nextStepFocus).toEqual([
      'clarify current severity',
    ]);
    expect(second.expertView.extractedFacts).toContain('duration=3 days');
    expect(second.trace.caseState.linkedTraceIds).toEqual([first.trace.id]);

    const events = getMedicalTraceEvents(second.trace.id);
    expect(events.map((event) => event.type)).toContain('follow_up_merged');
    expect(events.map((event) => event.type)).toContain(
      'follow_up_plan_created',
    );
  });

  it('creates a medication consult trace with deterministic interaction guidance', () => {
    const result = handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content: 'Can I take warfarin with ibuprofen 200 mg tablets?',
    });

    expect(result.trace.templateId).toBe('medication_consult');
    expect(result.trace.status).toBe('completed');
    expect(result.patientView.templateLabel).toBe('Medication Consult');
    expect(result.patientView.recommendedAction).toContain('urgent');
    expect(result.trace.caseState.taskType).toBe('medication_consult');
    expect(result.trace.caseState.knownStructuredFacts.questionType).toBe(
      'interaction_check',
    );
    expect(
      result.expertView.structuredMedicationFacts?.medicationNames,
    ).toEqual(['warfarin', 'ibuprofen']);
    expect(result.expertView.safetyAssessment.redFlags).toContain(
      'high-risk anticoagulant and pain-reliever combination',
    );
    expect(
      result.expertView.extractedFacts.some((fact) =>
        fact.includes('interaction_rule=warfarin+ibuprofen'),
      ),
    ).toBe(true);
  });

  it('keeps medication consult traces in draft when drug details are missing', () => {
    const result = handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content: 'Can I take this medicine together with another one?',
    });

    expect(result.trace.templateId).toBe('medication_consult');
    expect(result.trace.status).toBe('draft');
    expect(result.patientView.missingInformation).toContain('medication_name');
    expect(result.patientView.nextStepFocus).toContain(
      'clarify the exact medication name',
    );
  });

  it('merges a follow-up reply into the previous draft medication trace', () => {
    const first = handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content: 'Can I take warfarin with another medicine?',
    });

    const second = handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content: 'It is ibuprofen 200 mg tablets.',
    });

    expect(first.trace.status).toBe('draft');
    expect(second.trace.parentTraceId).toBe(first.trace.id);
    expect(second.trace.status).toBe('completed');
    expect(second.patientView.summary).toContain('Updated medication consult');
    expect(second.patientView.missingInformation).toEqual([]);
    expect(
      second.expertView.structuredMedicationFacts?.medicationNames,
    ).toEqual(['warfarin', 'ibuprofen']);
    expect(second.expertView.extractedFacts).toContain(
      `parent_trace_id=${first.trace.id}`,
    );
    expect(second.trace.caseState.linkedTraceIds).toEqual([first.trace.id]);

    const events = getMedicalTraceEvents(second.trace.id);
    expect(events.map((event) => event.type)).toContain('follow_up_merged');
  });

  it('surfaces medication allergy conflicts in patient and expert outputs', () => {
    const result = handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content: 'I am allergic to penicillin. Can I take amoxicillin?',
    });

    expect(result.trace.templateId).toBe('medication_consult');
    expect(result.patientView.safetyWarnings).toContain(
      'possible medication-allergy conflict',
    );
    expect(
      result.expertView.extractedFacts.some((fact) =>
        fact.includes('medication_reference=amoxicillin:penicillin_antibiotic'),
      ),
    ).toBe(true);
  });

  it('creates a report interpretation trace with abnormal lab findings', () => {
    const result = handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content:
        'CBC report: hemoglobin 8.2, WBC 14.5, impression: anemia workup needed.',
    });

    expect(result.trace.templateId).toBe('report_interpretation');
    expect(result.trace.status).toBe('completed');
    expect(result.patientView.templateLabel).toBe('Report Interpretation');
    expect(result.trace.caseState.taskType).toBe('report_interpretation');
    expect(result.expertView.structuredReportFacts?.testType).toBe('cbc');
    expect(result.expertView.structuredReportFacts?.abnormalFindings).toContain(
      'low hemoglobin (8.2)',
    );
    expect(result.expertView.extractedFacts).toContain('test_type=cbc');
  });

  it('keeps report interpretation in draft when report text is still missing', () => {
    const result = handleMedicalMessage({
      chatJid: 'test-chat',
      groupFolder: 'main',
      content: 'Can you explain my report?',
    });

    expect(result.trace.templateId).toBe('report_interpretation');
    expect(result.trace.status).toBe('draft');
    expect(result.patientView.missingInformation).toContain('report_text');
    expect(result.patientView.nextStepFocus).toContain(
      'paste the key report lines or impression text',
    );
  });
});
