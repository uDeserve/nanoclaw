# Setup And Status (2026-04-13)

## Purpose

This document records the HealthClaw project setup, implementation progress,
and current engineering status as of `2026-04-13`.

It is intended to answer three questions for a new contributor or agent:

1. What environment is already working?
2. What HealthClaw functionality has already been implemented?
3. What is the safest next step?

## Source Of Truth

Primary development repository:

- Server repo: `/data/lsj/healthclaw`

Git remotes:

- `origin -> git@github.com:uDeserve/nanoclaw.git`
- `upstream -> https://github.com/qwibitai/NanoClaw.git`

Working rule adopted for this project:

- server repo is the code source of truth
- local Windows repo is mainly for documentation/archive convenience
- after each meaningful milestone:
  - update project documentation
  - push the server repo to `origin`

## Local Windows Setup

Local workspace:

- Path: `E:\healthclaw\healthclaw`

Git identity configured:

- `user.name = uDeserve`
- `user.email = 1157548404@qq.com`

Local environment work completed:

- conda env created at `E:\conda-envs\healthclaw`
- Node unified to `22.x`
- Docker Desktop + WSL2 installed and verified

Local engineering baseline was validated successfully:

- `npm install`
- `npm run build`
- `npm run typecheck`
- `npm run test`

Local repo now serves mainly as:

- documentation archive
- fallback code reference
- convenience workspace for notes

## Linux Server Setup

SSH target used:

- host alias: `lsj245`
- user: `lsj`
- port: `1181`

Recommended server paths:

- project repo: `/data/lsj/healthclaw`
- project conda env: `/data/lsj/conda-envs/healthclaw`

Server preparation completed:

- cleaned `~/.cache/pip`
- removed unused conda envs:
  - `hulumed`
  - `medvlm-r1`
- reused existing Miniconda installation under `/opt/miniconda3`
- created dedicated Node environment for HealthClaw work

## NanoClaw Baseline Validation

The upstream NanoClaw base was validated successfully on the Linux server.

Passed:

- `npm install`
- `npm run build`
- `npm run typecheck`
- `npm test`
- `npm run setup -- --step environment`
- `npm run setup -- --step container --runtime docker`

This confirmed:

- the repo is healthy on Linux
- Docker runtime works
- the agent container image builds
- container self-test passes

## Credential Decision

Problem discovered:

- current upstream Docker path had moved to `OneCLI Agent Vault`
- the server did not already have `onecli` configured
- this project needs a custom Anthropic-compatible endpoint

Decision taken:

- merged `upstream/skill/native-credential-proxy`
- kept the native credential proxy path instead of OneCLI

Result:

- credentials are read from `.env`
- host starts a local credential proxy
- containers use the host proxy
- custom base URL works directly

Configured model endpoint used for validation:

- `ANTHROPIC_BASE_URL=https://yunwu.ai`

## NanoClaw Real Runtime Validation

Validation went beyond build/test.

A real smoke run was completed successfully using:

- current server codebase
- Docker container execution
- native credential proxy
- configured Anthropic-compatible endpoint

This means NanoClaw is functionally working as a containerized LLM runtime on
the Linux server.

## Important Runtime Note

Why `npm start` may still exit with `No channels connected`:

- there is no always-on default channel configured in the active runtime path
- this does not invalidate the smoke test
- the underlying model/container/runtime chain was already verified separately

## HealthClaw Direction

The target system is not a generic agent platform.

HealthClaw is intended to be:

- patient-facing
- safety-aware
- traceable
- template-driven
- conservative about memory and action boundaries

V1 task scope remains intentionally narrow:

1. symptom consultation / light triage
2. medication consultation
3. report interpretation
4. imaging QA

## HealthClaw Milestones Completed

### 1. Initial HealthClaw skeleton

Implemented a first application-layer skeleton directly inside the server repo.

Added under `src/healthclaw/`:

- `types.ts`
- `templates/registry.ts`
- `triage/symptom.ts`
- `runtime/handle-medical-message.ts`
- `runtime/command.ts`
- tests for registry / command / runtime

Also added host-side medical trace persistence:

- `medical_traces`
- `medical_trace_events`

Main runtime integration:

- `src/config.ts` gained `HEALTHCLAW_ENABLED`
- `src/index.ts` gained feature-gated HealthClaw entry handling

Behavior at this stage:

- explicit `/healthclaw ...` messages can be handled by the host-side
  HealthClaw pipeline
- default NanoClaw behavior remains unchanged when the flag is off

Validated:

- `npm run build`
- `npm test`

Observed result at this milestone:

- `22` test files passed
- `260` tests passed

### 2. Symptom structuring milestone

Strengthened the symptom-triage path beyond simple keyword matching.

New deterministic structured extraction now handles, when present:

- chief complaint
- duration
- severity
- age
- temperature
- symptom location
- onset style
- associated symptoms
- missing required fields

Safety improvements added:

- high-fever escalation using measured temperature
- severe-pain escalation in sensitive locations
- added loss-of-consciousness and seizure keyword coverage
- clearer lower-risk follow-up handling when required fields are missing

Patient-facing output now includes:

- summary built from extracted facts
- missing-information fields
- targeted follow-up questions

Expert-facing output and trace now include:

- structured symptom facts
- extracted fact strings
- `structured_facts_extracted` trace event

Validated:

- `npm run build`
- `npm test`

Observed result at this milestone:

- `23` test files passed
- `264` tests passed

### 3. Auto-routing milestone

HealthClaw is no longer limited to explicit `/healthclaw` commands.

Added:

- `src/healthclaw/runtime/routing.ts`
- `src/healthclaw/runtime/routing.test.ts`

New config flag:

- `HEALTHCLAW_AUTO_ROUTE`

Current routing behavior:

- HealthClaw still requires `HEALTHCLAW_ENABLED=true`
- explicit `/healthclaw ...` always takes priority
- ordinary messages are auto-routed only when:
  - they strongly resemble medical content, or
  - template classification is strong enough, or
  - symptom evidence / safety signals are present
- generic non-medical chat remains on original NanoClaw path
- other slash-prefixed commands are not auto-routed

Validated:

- `npm run build`
- `npm test`

Observed result at this milestone:

- `24` test files passed
- `269` tests passed

## What Exists Right Now

The current HealthClaw implementation already provides:

- feature-gated medical entry inside NanoClaw runtime
- explicit and auto-routed HealthClaw entry
- template classification skeleton for:
  - `symptom_triage`
  - `medication_consult`
  - `report_interpretation`
  - `imaging_qa`
- deterministic symptom structuring
- deterministic red-flag precheck
- deterministic medication question structuring
- deterministic medication safety precheck
- patient-facing output
- expert-facing output
- structured trace persistence in SQLite

## What Is Not Done Yet

Important gaps still remaining:

- medication/report/imaging paths are still early compared with the symptom path
- evidence grounding is still limited to:
  - user statements
  - deterministic rules
  - extracted facts
- external medical knowledge providers are not integrated yet
- case-level memory and trace stitching across turns are not implemented yet

## Current Knowledge Integration Strategy

The project direction agreed so far is:

- do not start with one giant generic RAG layer
- keep high-risk safety logic local and deterministic
- use structured local knowledge first for stable safety-critical decisions
- use open medical APIs as optional external evidence services

Planned layers:

1. deterministic rule layer
   - symptom red flags
   - urgent-care / emergency heuristics
   - future medication interaction rules
   - future critical-value rules

2. structured reference layer
   - drug reference summaries
   - report/lab explanation data
   - patient education material

3. optional external evidence layer
   - biomedical literature APIs
   - guideline / drug / terminology APIs
   - invoked selectively, not on every turn

## Recommended Next Step

Most valuable next milestone:

- strengthen `medication_consult` with richer deterministic safety rules and
  structured local medication reference support

Why:

- the first host-side medication path now exists, so the next best use of time
  is improving depth and safety on that second core task before broadening scope

## Paths To Remember

- server project root: `/data/lsj/healthclaw`
- server conda env: `/data/lsj/conda-envs/healthclaw`
- server docs directory: `/data/lsj/healthclaw/docs`
- local archive root: `E:\healthclaw\healthclaw`

## HealthClaw Multi-Turn Symptom Follow-Up Milestone

The symptom-triage path can now continue a recent incomplete case instead of
always treating each medical turn as a brand-new case.

### What changed

The host-side HealthClaw runtime now checks the latest symptom trace for the
same chat and continues it when all of the following are true:

- the previous trace is a symptom_triage
- the previous trace is still missing required symptom details
- the new message also routes into symptom_triage

### New behavior

When a user answers a follow-up question such as duration or severity, the
runtime now:

- reads the previous symptom trace
- merges the newly extracted symptom facts into the older structured facts
- preserves the earlier chief complaint when the new reply is only referential
  (for example: it has been 3 days)
- recomputes safety assessment from the merged facts
- creates a new trace linked to the earlier one through parentTraceId
- records a ollow_up_merged trace event

### Status behavior

Symptom traces now distinguish between:

- draft: still missing required triage fields
- completed: enough required information has been collected for the current
  deterministic triage stage

### Example

Example progression now supported:

1. user: I have a rash on my arm.
2. system: asks for duration / missing details and stores a draft symptom trace
3. user: It has been there for 3 days and is getting worse.
4. system: merges this into the earlier symptom case, fills the duration field,
   updates the patient/expert view, and stores a linked follow-up trace

### Verification after this milestone

Validated successfully on the server after the multi-turn follow-up changes:

- 
pm run build
- 
pm test

Observed full test result at this milestone:

- 24 test files passed
- 271 tests passed

## HealthClaw Follow-Up Planner Milestone

The symptom-triage path now produces a more explicit next-step follow-up plan
instead of only exposing missing fields.

### What changed

A deterministic follow-up planner was added on top of the existing symptom
structuring and multi-turn case flow.

The runtime now converts missing or still-important fields into a focused
next-step plan, for example:

- clarify the main symptom
- clarify how long the symptom has been present
- clarify current severity
- clarify measured temperature if available

### Output improvements

Patient-facing output now includes:

- 
extStepFocus
- clearer targeted follow-up direction before the question list

Expert-facing output now includes:

- ollowUpPlan

Trace behavior now also includes:

- ollow_up_plan_created

### Example

If the user says:

- I have a rash on my arm.

The system can now produce not only missingInformation = ['duration'], but
also a more actionable next-step plan such as:

- clarify how long the symptom has been present
- clarify current severity

### Verification after this milestone

Validated successfully on the server after the follow-up planner changes:

- 
pm run build
- 
pm test

Observed full test result at this milestone:

- 24 test files passed
- 272 tests passed

## HealthClaw Medication Consult Milestone

The first real `medication_consult` path now exists as a host-side deterministic
HealthClaw flow instead of only a template-routing skeleton.

### What changed

Added a new medication consult helper module under:

- `src/healthclaw/medication/consult.ts`
- `src/healthclaw/medication/consult.test.ts`

The host-side runtime can now:

- identify common medication names from the user message
- classify the medication question type
  - interaction check
  - dose question
  - missed dose
  - side effect
  - general precaution
- extract dose and formulation when present
- detect missing critical fields such as exact medication name or second
  medication for an interaction question
- run deterministic medication safety precheck rules
- produce patient-facing and expert-facing medication outputs
- persist medication consult traces through the same trace pipeline

### First deterministic medication safety rules

Current medication safety coverage includes:

- severe medication-reaction emergency wording
- overdose wording
- high-risk `warfarin` plus `ibuprofen` / `aspirin` interaction rule
- pregnancy-related `ibuprofen` caution rule

### Runtime integration

`src/healthclaw/runtime/handle-medical-message.ts` now branches by template:

- `medication_consult` uses the medication handler path
- `symptom_triage` continues to use the symptom handler path

### Output behavior

Patient-facing output now supports a medication consult label and includes:

- summary
- recommended action
- next-step focus
- follow-up questions
- self-care advice
- safety warnings

Expert-facing output and trace now include:

- structured medication facts
- medication extracted fact strings
- medication follow-up planning through existing trace events

### Verification after this milestone

Validated successfully on the server on `2026-04-14` after the medication
consult changes:

- `npm run build`
- `npm test`

Observed full test result at this milestone:

- 25 test files passed
- 278 tests passed

## HealthClaw Medication Reference Hardening Milestone

The medication consult path now has a small structured local medication
reference layer instead of relying only on direct keyword rules inside one
helper file.

### What changed

Added a local medication reference module under:

- `src/healthclaw/medication/reference.ts`

The medication path now uses:

- structured medication reference records
- structured deterministic interaction rules
- medication-class-aware output hints
- reference-driven precautions in patient-facing output
- reference-derived extracted facts in expert-facing output and trace

### Safety and reasoning improvements

The deterministic medication path now additionally covers:

- medication-allergy conflict detection
  - for example: penicillin allergy versus amoxicillin
- unsafe missed-dose recovery logic
  - for example: doubling the next insulin dose
- broader interaction handling through structured local interaction rules
- pregnancy caution handling through medication reference metadata

### Output improvements

Patient-facing medication outputs can now include:

- medication-class-aware concern language
- medication-specific precautions from the local reference layer

Expert-facing outputs and traces now include:

- medication reference facts
- interaction rule facts
- richer structured rationale for medication decisions

### Verification after this milestone

Validated successfully on the server after the medication reference hardening
changes:

- `npm run build`
- `npm test`

Observed full test result at this milestone:

- 25 test files passed
- 282 tests passed

## HealthClaw Shared Case State Milestone

The runtime now includes a shared `medical_case_state` abstraction that is used
by both symptom and medication paths.

### What changed

Added a shared runtime helper module under:

- `src/healthclaw/runtime/case-state.ts`
- `src/healthclaw/runtime/case-state.test.ts`

The runtime now builds a unified case-state object for:

- `symptom_triage`
- `medication_consult`

### Current case-state fields

The current shared case state includes:

- `taskType`
- `knownStructuredFacts`
- `missingFields`
- `riskLevel`
- `disposition`
- `currentFollowUpFocus`
- `linkedTraceIds`
- `caseStatus`

### Runtime integration

The host-side runtime now:

- builds case state before trace persistence
- stores case state inside `MedicalTrace`
- records a `case_state_updated` trace event

This gives HealthClaw a stable shared representation layer between structured
fact extraction and future multi-turn planner behavior.

### Why this matters

This milestone moves the system one step closer to the intended
Plan-Act-plus-state runtime design.

The code is still host-side and conservative, but the runtime now has an
explicit representation for what the current medical case knows, what is still
missing, and what the next focus should be.

### Verification after this milestone

Validated successfully on the server after the shared case-state changes:

- `npm run build`
- `npm test`

Observed full test result at this milestone:

- 26 test files passed
- 284 tests passed

## HealthClaw Medication Multi-Turn Continuity Milestone

The medication consult path can now continue a recent unfinished medication
case across turns instead of treating each reply as a fully isolated consult.

### What changed

The medication runtime now:

- detects when a new `medication_consult` message should continue the latest
  draft medication trace
- merges newly extracted medication facts into the previous structured
  medication case
- reuses the shared `medical_case_state` layer to carry linked trace ids and
  updated follow-up focus
- records `follow_up_merged` for medication traces just like the symptom path

### Medication continuity behavior

The current multi-turn medication behavior now supports:

- filling in a missing second medication for interaction checking
- filling in a missing dose or formulation on a later turn
- preserving the previous question intent when a short follow-up reply only
  supplies details
- generating an `Updated medication consult` patient summary after merge

### Implementation notes

Key code paths involved in this milestone:

- `src/healthclaw/medication/consult.ts`
- `src/healthclaw/runtime/handle-medical-message.ts`
- `src/healthclaw/runtime/handle-medical-message.test.ts`

This keeps the runtime aligned with the staged design:

- deterministic host-side safety first
- shared case-state as the continuity substrate
- template-specific extraction merged into a reusable case-level runtime shape

### Verification after this milestone

Validated successfully on the server after the medication multi-turn
continuity changes:

- `npm run build`
- `npm test`

Observed full test result at this milestone:

- 26 test files passed
- 286 tests passed

## HealthClaw Report Interpretation First Path Milestone

HealthClaw now has the first conservative host-side `report_interpretation`
path.

### What changed

Added a dedicated report helper module under:

- `src/healthclaw/report/interpret.ts`
- `src/healthclaw/report/interpret.test.ts`

The runtime can now:

- classify common report/lab-result requests into `report_interpretation`
- extract structured report facts from pasted report text
- identify a small deterministic set of abnormal and critical lab findings
- produce patient-facing and expert-facing report outputs
- persist report traces using the same case-state and trace-event structure as
  the symptom and medication paths

### Current deterministic report coverage

The initial rule set is intentionally narrow and host-side:

- CBC-like findings such as low hemoglobin and elevated white blood cells
- chemistry-style findings such as potassium, sodium, creatinine, and glucose
- troponin critical-value escalation
- explicit `critical value` / `panic value` wording

This is not yet a broad medical-report interpreter. It is the first safe
runtime path for structured report text.

### Safety behavior

The current report path now supports:

- `draft` state when the user has not yet pasted the actual report wording
- `routine_follow_up` for non-critical abnormalities
- `urgent_care` for deterministic critical report findings
- `emergency_now` for critical cardiac-lab style signals such as elevated
  troponin

### Why this matters

This milestone establishes the third concrete HealthClaw task path while
preserving the same runtime shape:

- deterministic extraction
- deterministic safety precheck
- patient view
- expert view
- shared `medical_case_state`
- persisted trace and trace events

That consistency is important for the longer-term paper direction because it
makes new medical task paths comparable instead of ad hoc.

### Verification after this milestone

Validated successfully on the server after the first report interpretation
path changes:

- `npm run build`
- `npm test`

Observed full test result at this milestone:

- 27 test files passed
- 293 tests passed
