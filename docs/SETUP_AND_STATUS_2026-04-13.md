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
- patient-facing output
- expert-facing output
- structured trace persistence in SQLite

## What Is Not Done Yet

Important gaps still remaining:

- multi-turn case completion is not implemented yet
- medication/report/imaging paths are mostly routing skeletons, not deep logic
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

- implement multi-turn symptom triage completion

Why:

- it turns current follow-up questions into a real continuing medical case flow
- it makes the existing extraction, safety logic, patient view, expert view, and
  trace system work across multiple turns instead of isolated single messages

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
