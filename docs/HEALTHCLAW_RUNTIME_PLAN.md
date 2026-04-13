# HealthClaw Runtime Plan v1

## Purpose

This document translates the HealthClaw concept documents into a code-level implementation plan on top of the current NanoClaw runtime.

The goal is not to redesign everything from scratch.

The goal is:

- keep NanoClaw's lightweight runtime and isolation model
- add a HealthClaw application layer for medical task handling
- keep v1 tightly scoped to the four defined medical tasks
- prioritize one end-to-end path first: symptom consultation and light triage

## High-Level Mapping

### Keep from NanoClaw

These parts are already a good base and should remain the runtime foundation:

- message polling and orchestration loop
- SQLite persistence
- group/session isolation
- container execution
- IPC between host and container
- task scheduling
- channel abstraction

Main existing files:

- `src/index.ts`
- `src/db.ts`
- `src/container-runner.ts`
- `src/task-scheduler.ts`
- `src/ipc.ts`
- `src/group-queue.ts`
- `container/agent-runner/src/index.ts`

### Add for HealthClaw

These are the new medical-system layers that do not exist yet:

- task-template selection
- structured medical understanding
- safety-aware triage
- specialist-agent orchestration
- trace generation
- evidence tracking
- dual-view output
- conservative structured memory

## Recommended Source Layout

The recommended approach is to leave the NanoClaw runtime files mostly intact and add a new application layer under `src/healthclaw`.

```text
src/
  healthclaw/
    index.ts
    types/
      task-types.ts
      trace-types.ts
      patient-profile.ts
      evidence-types.ts
    templates/
      registry.ts
      symptom-triage.ts
      medication-consult.ts
      report-interpretation.ts
      imaging-qa.ts
    intake/
      classify-task.ts
      extract-structured-input.ts
      normalize-modalities.ts
    safety/
      risk-level.ts
      symptom-red-flags.ts
      medication-safety-rules.ts
      report-urgency-rules.ts
      imaging-safety-rules.ts
      build-safe-boundary.ts
    orchestration/
      build-execution-plan.ts
      specialist-contracts.ts
      run-healthclaw-agent.ts
    prompts/
      main-agent.ts
      triage-agent.ts
      medication-agent.ts
      report-agent.ts
      vision-agent.ts
    evidence/
      evidence-registry.ts
      evidence-types.ts
      map-claims-to-evidence.ts
    trace/
      create-trace.ts
      trace-writer.ts
      trace-events.ts
      expert-view.ts
      patient-view.ts
    memory/
      patient-memory.ts
      memory-policy.ts
    runtime/
      handle-medical-message.ts
      healthclaw-router.ts
```

## Host Runtime Integration

### Current runtime role

`src/index.ts` currently does:

- read new messages
- format them as prompt text
- send them to the container agent
- forward streamed results to the user

### Target runtime role

For HealthClaw, the host runtime should do more before waking the container:

1. load conversation context
2. classify task template
3. extract minimal structured intake
4. run host-side safety precheck
5. build a medical execution envelope
6. invoke the container agent with that envelope
7. persist trace and derived structured outputs
8. send patient-facing output
9. optionally store expert-facing trace view

### Recommended integration point

Do not rewrite the whole message loop.

Instead, add a HealthClaw-specific processing function and call it from the existing group-processing path.

Suggested new file:

- `src/healthclaw/runtime/handle-medical-message.ts`

Suggested responsibility:

- transform raw conversation into `HealthClawExecutionInput`
- decide whether to ask follow-up questions immediately
- decide whether the container agent is needed for this turn
- return a structured result with:
  - patient-facing output
  - expert-facing output
  - trace object
  - memory updates if confirmed

## Core Runtime Data Flow

```text
Incoming Message
  -> Conversation Context Loader
  -> Task Template Classifier
  -> Structured Input Extractor
  -> Host Safety Precheck
  -> Execution Plan Builder
  -> Container Agent / Specialist Agents
  -> Trace Fusion
  -> Patient View Formatter
  -> Expert View Formatter
  -> DB Persistence
  -> Outbound Response
```

## Recommended Core Types

### Task type

```ts
export type HealthClawTaskType =
  | 'symptom_triage'
  | 'medication_consult'
  | 'report_interpretation'
  | 'imaging_qa'
  | 'unclassified';
```

### Intake envelope

```ts
export interface HealthClawExecutionInput {
  sessionId?: string;
  chatJid: string;
  groupFolder: string;
  language: string;
  rawUserQuery: string;
  conversationText: string;
  inputModalities: Array<'text' | 'image' | 'document'>;
  uploadedFiles: UploadedFileRef[];
  taskType: HealthClawTaskType;
  structuredInput: StructuredMedicalInput;
  safetyPrecheck: SafetyAssessment;
}
```

### Structured medical input

```ts
export interface StructuredMedicalInput {
  demographics: {
    age: number | null;
    sex: 'female' | 'male' | 'other' | 'unknown' | null;
    pregnancyStatus?: 'yes' | 'no' | 'unknown' | null;
  };
  entities: {
    symptoms: string[];
    medications: string[];
    labItems: string[];
    reportTerms: string[];
    imageContext: string[];
  };
  historyFlags: string[];
  missingInformation: string[];
  summary: string;
}
```

### Safety assessment

```ts
export interface SafetyAssessment {
  redFlagsDetected: string[];
  riskLevel: 'low' | 'moderate' | 'high' | 'urgent';
  escalationRequired: boolean;
  escalationType: 'self-care' | 'outpatient' | 'urgent-clinic' | 'emergency' | null;
  safeResponseBoundary: string;
  safetyRationale: string[];
}
```

### Output object

```ts
export interface HealthClawExecutionResult {
  taskType: HealthClawTaskType;
  patientOutput: PatientFacingOutput;
  expertOutput: ExpertFacingOutput;
  trace: HealthClawTrace;
  followUpQuestions: string[];
  shouldPersistMemory: boolean;
}
```

## Database Expansion Plan

Keep the existing NanoClaw tables.

Add HealthClaw-specific tables rather than overloading existing message tables.

### 1. `medical_cases`

Purpose:

- one row per medically interpreted interaction turn

Suggested fields:

```sql
CREATE TABLE medical_cases (
  id TEXT PRIMARY KEY,
  chat_jid TEXT NOT NULL,
  session_id TEXT,
  task_type TEXT NOT NULL,
  language TEXT,
  raw_user_query TEXT NOT NULL,
  structured_summary TEXT,
  risk_level TEXT NOT NULL,
  escalation_required INTEGER NOT NULL DEFAULT 0,
  escalation_type TEXT,
  patient_response_text TEXT NOT NULL,
  expert_summary_text TEXT,
  created_at TEXT NOT NULL
);
```

### 2. `medical_traces`

Purpose:

- persist the complete trace object defined in `TRACE_SCHEMA.md`

Suggested fields:

```sql
CREATE TABLE medical_traces (
  trace_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  trace_json TEXT NOT NULL,
  trace_complete INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES medical_cases(id)
);
```

### 3. `medical_evidence_items`

Purpose:

- normalize evidence sources used in a case

Suggested fields:

```sql
CREATE TABLE medical_evidence_items (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_name TEXT,
  title TEXT,
  retrieved_at TEXT,
  supports_json TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES medical_cases(id)
);
```

### 4. `patient_profiles`

Purpose:

- structured long-term memory only

Suggested fields:

```sql
CREATE TABLE patient_profiles (
  chat_jid TEXT PRIMARY KEY,
  allergies_json TEXT NOT NULL DEFAULT '[]',
  chronic_conditions_json TEXT NOT NULL DEFAULT '[]',
  medications_json TEXT NOT NULL DEFAULT '[]',
  recent_key_tests_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);
```

### 5. `patient_profile_audit`

Purpose:

- track explicit memory writes and removals

Suggested fields:

```sql
CREATE TABLE patient_profile_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_jid TEXT NOT NULL,
  action TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value_json TEXT,
  new_value_json TEXT,
  confirmed_by_user INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
```

## Trace Persistence Strategy

### Do not treat trace as logs

The trace should be created as a first-class structured object and stored deliberately.

Minimum write path:

1. create trace shell before container execution
2. append host-side understanding and safety assessment
3. append specialist-agent call summaries
4. append evidence items
5. append patient and expert outputs
6. persist final trace JSON

### Suggested implementation split

- `src/healthclaw/trace/create-trace.ts`
- `src/healthclaw/trace/trace-writer.ts`

Recommended rule:

- the host runtime owns the final trace object
- the container agent may propose intermediate artifacts
- the host runtime merges and persists the authoritative trace

This avoids a fragile design where the entire trace depends on the model narrating itself correctly.

## Specialist Agent Plan

For v1, do not create separate host processes or extra orchestrators.

Use one container session with one main medical agent and specialist subagents inside that session.

### Main Agent responsibilities

- understand user intent within the selected template
- ask for missing critical information
- coordinate specialist agents
- produce final patient-facing answer
- produce expert-facing structured rationale

### Specialist agents

- `triage-agent`
- `medication-agent`
- `report-agent`
- `vision-agent`

### Why this is the right first implementation

- simpler than multi-container orchestration
- preserves NanoClaw's small runtime
- aligns with Claude Agent SDK team model
- keeps traceability manageable

## Prompt Contract Plan

The container agent should no longer receive only a raw conversation transcript.

It should receive a structured medical execution packet.

Suggested prompt sections:

1. task template
2. raw user request
3. structured understanding
4. missing information
5. safety assessment
6. safe response boundary
7. output schema requirements
8. specialist-agent use guidance

Suggested host-to-container packet shape:

```ts
export interface MedicalAgentPacket {
  taskType: HealthClawTaskType;
  rawUserQuery: string;
  structuredInput: StructuredMedicalInput;
  safetyAssessment: SafetyAssessment;
  responseRequirements: {
    producePatientView: true;
    produceExpertView: true;
    preserveUncertainty: true;
  };
}
```

## Symptom Triage First Path

The first end-to-end implementation should be exactly one path:

- `symptom_triage`

This should be the first complete workflow because it exercises the most important system ideas:

- structured intake
- missing-information follow-up
- red-flag detection
- risk escalation
- patient-safe response boundaries
- expert trace output

### Required first-path modules

- `templates/symptom-triage.ts`
- `intake/classify-task.ts`
- `intake/extract-structured-input.ts`
- `safety/symptom-red-flags.ts`
- `trace/create-trace.ts`
- `trace/patient-view.ts`
- `trace/expert-view.ts`
- `runtime/handle-medical-message.ts`

### Minimal symptom triage algorithm

1. classify the turn as `symptom_triage`
2. extract symptoms, age, sex, duration, severity if possible
3. identify missing required information
4. run red-flag rules
5. assign risk level
6. determine safe response boundary
7. if information is critically missing, ask follow-up first
8. otherwise call the medical agent
9. generate patient view and expert view
10. persist trace

## Rules vs Model Boundary

This boundary matters and should be explicit.

### Rules should own

- task-type gating
- minimum required inputs
- red-flag phrase detection
- escalation floor
- memory write policy
- trace persistence contract

### Model should own

- plain-language explanation
- nuanced summarization
- uncertainty wording
- follow-up question phrasing
- specialist reasoning inside safe boundaries

### Model should not own alone

- emergency escalation decision floor
- long-term memory writes
- whether trace exists

## IPC / MCP Expansion Plan

The current IPC pattern is a strong fit for HealthClaw.

Add host-side MCP/IPC capabilities for:

- writing trace events
- querying template definitions
- retrieving patient profile
- proposing memory updates
- recording evidence items

Suggested future MCP tools:

- `get_task_template`
- `get_patient_profile`
- `propose_patient_profile_update`
- `append_trace_event`
- `record_evidence_item`
- `get_safe_response_boundary`

## Evidence Layer Plan

Do not block the first path on full evidence retrieval.

For v1 implementation order:

1. support `structured_rule` as an evidence type
2. support manually curated evidence registry files
3. later add retrieval from medical databases or literature

This means the first version can already populate the trace `evidence` section even before full retrieval exists.

## Suggested File-by-File Build Order

### Phase 1: foundation

1. add HealthClaw type definitions
2. add task template registry
3. add database migration for medical tables
4. add trace writer

### Phase 2: symptom triage path

1. add task classifier
2. add symptom structured extractor
3. add red-flag rules
4. add safety boundary builder
5. add host-side medical message handler
6. adapt container prompt contract
7. add patient and expert output formatters

### Phase 3: other templates

1. medication consultation
2. report interpretation
3. imaging QA

### Phase 4: evidence and memory hardening

1. evidence registry
2. patient profile reads
3. explicit confirmation flow for memory writes

## Recommended Non-Goals During Initial Build

Do not spend early time on:

- many communication channels
- clinician workflow automation
- broad scheduling features
- unrestricted memory
- fully autonomous agent teams without hard task contracts
- rich UI before the trace and safety pipeline exists

## Immediate Next Coding Task

The next implementation step should be:

build the `src/healthclaw` skeleton plus the minimum database additions and wire one host-side `symptom_triage` flow into the existing runtime.

That is the smallest step that turns the current repo from a generic agent runtime into a real HealthClaw codebase.
