# README_healthclaw

## Purpose

This file is the handoff entry point for the HealthClaw project.

A new contributor or new coding agent should start here before touching code.

The goal is to make the project understandable without relying on prior chat
history.

## What This Repository Is

This repository started from `NanoClaw`, but it is being adapted into
`HealthClaw`:

- a patient-facing
- safety-aware
- traceable
- template-driven

medical agent runtime.

Primary development now happens on the Linux server repository:

- `/data/lsj/healthclaw`

Primary remote backup repository:

- `git@github.com:uDeserve/nanoclaw.git`

Upstream base:

- `https://github.com/qwibitai/NanoClaw.git`

## First Documents To Read

Read these in order:

1. `docs/HEALTHCLAW_HOME_HEALTH_STORY.md`
   - why HealthClaw should be framed as a home robot / home agent health module
   - why proactive household follow-up is the stronger product story

2. `docs/HEALTHCLAW_EVENT_DRIVEN_RUNTIME_PLAN.md`
   - event-driven runtime refactor
   - heartbeat, cron, and external-trigger design
   - how to simulate embodied sensing before hardware exists

3. `docs/SETUP_AND_STATUS_2026-04-13.md`
   - environment setup
   - what already works
   - milestone-by-milestone implementation status

4. `docs/HANDOFF_2026-04-14.md`
   - practical implementation handoff
   - current code reality and next recommended engineering direction

5. `docs/HEALTHCLAW_RULE_RUNTIME_MIGRATION.md`
   - rule-code reorganization policy
   - where safety, fallback, and future legacy code now belong
   - import-boundary constraints for the runtime

## Historical / Secondary Documents

These documents are still useful as background reference, but they should not
override the home-health and event-driven direction above:

- `docs/HEALTHCLAW_RESEARCH_DIRECTION_2026-04.md`
- `docs/HEALTHCLAW_NEXT_PHASE_PLAN_2026-04.md`
- `docs/HEALTHCLAW_RUNTIME_PLAN.md`
- `docs/HEALTHCLAW_KNOWLEDGE_STRATEGY.md`

## Product / Concept Documents To Understand Intent

These project-level concept docs live outside this repo in the broader
workspace and describe the intended HealthClaw product:

- `E:\healthclaw\docs\HEALTHCLAW_CONCEPT.md`
- `E:\healthclaw\docs\README_FOR_AGENT.md`
- `E:\healthclaw\docs\ARCHITECTURE_DECISIONS.md`
- `E:\healthclaw\docs\TRACE_SCHEMA.md`
- `E:\healthclaw\docs\TASK_TEMPLATES_V1.md`

If working only on the server, treat the in-repo home-health story and
event-driven runtime docs as the current direction of truth.

## Current Implemented HealthClaw Features

Already implemented in code:

- feature-gated HealthClaw runtime path inside `src/index.ts`
- explicit `/healthclaw ...` command entry
- automatic routing of medically relevant messages when enabled
- first event-driven proactive runtime skeleton
- `HealthEvent` protocol types
- planner adapter boundary for proactive follow-up planning
- `handleHealthEvent(...)` proactive runtime entry
- first heartbeat event helper
- active case selection for proactive events
- shared medical trace persistence in SQLite
- shared `medical_case_state`
- first `symptom_triage` host-side path
- symptom multi-turn follow-up continuity
- first `medication_consult` host-side path
- medication multi-turn continuity
- first `report_interpretation` host-side text-report path
- patient-facing output
- expert-facing output

Main HealthClaw code lives under:

- `src/healthclaw/`

Important files:

- `src/healthclaw/types.ts`
- `src/healthclaw/case-state/medical-case-state.ts`
- `src/healthclaw/agents/planner/planner-adapter.ts`
- `src/healthclaw/agents/planner/mock-planner.ts`
- `src/healthclaw/runtime/active-case-selector.ts`
- `src/healthclaw/runtime/handle-health-event.ts`
- `src/healthclaw/runtime/heartbeat.ts`
- `src/healthclaw/runtime/handle-medical-message.ts`
- `src/healthclaw/runtime/command.ts`
- `src/healthclaw/agents/router/router-agent.ts`
- `src/healthclaw/fallback/`
- `src/healthclaw/safety/`
- `src/db.ts`
- `src/index.ts`

## Current Feature Gates

Current HealthClaw runtime flags:

- `HEALTHCLAW_ENABLED=true`
- `HEALTHCLAW_AUTO_ROUTE=true`

Behavior:

- if `HEALTHCLAW_ENABLED` is off, NanoClaw behaves normally
- if `HEALTHCLAW_ENABLED` is on:
  - `/healthclaw ...` uses HealthClaw
- if `HEALTHCLAW_AUTO_ROUTE` is also on:
  - ordinary messages that strongly look medical are auto-routed into
    HealthClaw

## Current Limits

Not done yet:

- agent-first task routing
- explicit agent-to-agent communication
- production planner agent
- richer active-case selection beyond trace-local heuristics
- persistent health cron scheduling
- external trigger ingress
- real presence-aware event wiring
- image-first report ingestion
- deep imaging orchestration
- richer household case continuity beyond the current host-side paths

The current strongest implemented paths are:

- `symptom_triage`
- `medication_consult`
- `report_interpretation` (first safe text path)

## Runtime / Environment Notes

Server environment:

- project root: `/data/lsj/healthclaw`
- conda env: `/data/lsj/conda-envs/healthclaw`

Important:

- the server repo is the code source of truth
- push milestones from the server repo to GitHub
- local Windows repo is mainly for documentation archive

Current credential model:

- native credential proxy
- custom Anthropic-compatible endpoint supported through `.env`

## Working Rules

If you are the next agent or contributor:

1. Read the four primary docs listed above before making code changes.
2. Treat the server repo as the authoritative implementation.
3. Keep HealthClaw changes isolated and conservative.
4. Do not break the default NanoClaw path while extending HealthClaw.
5. After each meaningful milestone:
   - update `docs/SETUP_AND_STATUS_2026-04-13.md`
   - push the server repo to `origin`
   - sync docs back to the local archive if needed

## Recommended Next Engineering Step

The currently recommended next milestone is no longer "add more task-specific
rules."

The next real milestone should be:

- replace the mock proactive planner with a real planner-agent path
- keep using the planner adapter boundary rather than calling any concrete planner directly from runtime
- add persistent health scheduling after the event runtime skeleton
- extend proactive event coverage beyond the first simulated cases

Reason:

- the event-driven runtime skeleton now exists, so the next value is in making
  the proactive planner and scheduler more real without falling back into
  rule-first design
