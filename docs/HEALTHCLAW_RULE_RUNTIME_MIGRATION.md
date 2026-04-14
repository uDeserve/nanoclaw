# HEALTHCLAW_RULE_RUNTIME_MIGRATION

## Purpose

This document records the rule-code reorganization that moved HealthClaw away
from rule-first business logic and toward an agent-oriented runtime with a
deterministic safety shell.

## New Directory Policy

Current directory intent under `src/healthclaw/`:

- `agents/`
  - main intelligence-facing interfaces
  - current router entry lives here, even though it still calls a fallback
- `runtime/`
  - orchestration and trace-producing entrypoints
- `safety/`
  - narrow deterministic safety shell only
- `fallback/`
  - temporary degradation paths for extraction, formatting, and keyword routing
- `case-state/`
  - shared `medical_case_state` builders
- `legacy/`
  - reserved for code that has exited the main path and is waiting for deletion

## What Moved

The previous rule-heavy modules were split by responsibility:

- old `templates/registry.ts`
  - template definitions moved to `agents/router/template-catalog.ts`
  - keyword routing moved to `fallback/task-classifier/keyword-router.ts`
  - runtime entry now uses `agents/router/router-agent.ts`
- old `triage/symptom.ts`
  - structured extraction and patient/expert fallback response logic moved to
    `fallback/symptom/`
  - red-flag escalation moved to `safety/symptom/red-flag-precheck.ts`
- old `medication/consult.ts`
  - structured extraction and fallback summary logic moved to
    `fallback/medication/`
  - overdose / allergy / pregnancy / interaction checks moved to
    `safety/medication/medication-safety-shell.ts`
- old `report/interpret.ts`
  - report text parsing and fallback explanation logic moved to
    `fallback/report/`
  - critical-value screening moved to
    `safety/report/report-safety-shell.ts`
- old `runtime/case-state.ts`
  - moved to `case-state/medical-case-state.ts`

## What Still Counts As Acceptable Rules

Rules are still acceptable only in these roles:

- safety shell
- fallback execution path
- migration-period regression oracle

Rules are not acceptable as the main intelligence path.

## Deletion Direction

The following logic is expected to shrink over time:

- keyword-first task routing
- regex-first semantic extraction
- template-first explanation generation

The following logic is expected to remain, but stay narrow:

- hard safety escalation
- contraindication / critical-value detection
- schema-like completeness checks before agent output is shown

## Current Constraint

Two architectural constraints are now enforced in tests:

- `runtime/handle-medical-message.ts` must not import from old rule paths
- `runtime/` and `agents/` must not import from `legacy/`
