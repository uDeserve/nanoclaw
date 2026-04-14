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

1. `docs/SETUP_AND_STATUS_2026-04-13.md`
   - environment setup
   - what already works
   - milestone-by-milestone implementation status

2. `docs/HEALTHCLAW_RUNTIME_PLAN.md`
   - code-level implementation plan
   - intended architecture on top of NanoClaw

3. `docs/HEALTHCLAW_KNOWLEDGE_STRATEGY.md`
   - how medical knowledge, local rules, and external APIs should be used

## Additional Strategic Reading

These documents refine the updated medium-term direction after the current
symptom-triage and first medication-consult milestones:

4. `docs/HEALTHCLAW_RESEARCH_DIRECTION_2026-04.md`
   - updated research positioning
   - why Claw matters for HealthClaw
   - how recent agent papers and a light LangChain reading should influence the
     project direction

5. `docs/HEALTHCLAW_NEXT_PHASE_PLAN_2026-04.md`
   - next concrete development phases
   - what the team should implement next
   - near-term ordering and acceptance criteria

6. `docs/HEALTHCLAW_HOME_HEALTH_STORY.md`
   - why HealthClaw should be framed as a home robot / home agent health module
   - why proactive household follow-up is the stronger product story

7. `docs/HEALTHCLAW_EVENT_DRIVEN_RUNTIME_PLAN.md`
   - event-driven runtime refactor
   - heartbeat, cron, and external-trigger design
   - how to simulate embodied sensing before hardware exists

## Product / Concept Documents To Understand Intent

These project-level concept docs live outside this repo in the broader
workspace and describe the intended HealthClaw product:

- `E:\healthclaw\docs\HEALTHCLAW_CONCEPT.md`
- `E:\healthclaw\docs\README_FOR_AGENT.md`
- `E:\healthclaw\docs\ARCHITECTURE_DECISIONS.md`
- `E:\healthclaw\docs\TRACE_SCHEMA.md`
- `E:\healthclaw\docs\TASK_TEMPLATES_V1.md`

If working only on the server, assume the design intent summarized from those
docs is already reflected in:

- `docs/HEALTHCLAW_RUNTIME_PLAN.md`
- `docs/HEALTHCLAW_KNOWLEDGE_STRATEGY.md`
- `docs/SETUP_AND_STATUS_2026-04-13.md`

## Current Implemented HealthClaw Features

Already implemented in code:

- feature-gated HealthClaw runtime path inside `src/index.ts`
- explicit `/healthclaw ...` command entry
- automatic routing of medically relevant messages when enabled
- template classification skeleton
- deterministic symptom structuring
- deterministic symptom safety precheck
- deterministic medication question structuring
- deterministic medication safety precheck
- patient-facing output
- expert-facing output
- structured medical trace persistence in SQLite

Main HealthClaw code lives under:

- `src/healthclaw/`

Important files:

- `src/healthclaw/types.ts`
- `src/healthclaw/templates/registry.ts`
- `src/healthclaw/triage/symptom.ts`
- `src/healthclaw/runtime/handle-medical-message.ts`
- `src/healthclaw/runtime/command.ts`
- `src/healthclaw/runtime/routing.ts`
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

- deep medication consult logic
- deep report interpretation logic
- deep imaging QA logic
- external medical knowledge provider integration
- case-level memory stitching across turns

The current strongest implemented paths are:

- `symptom_triage`
- `medication_consult` (first host-side version)

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

1. Read the three core docs listed above before making code changes.
2. Treat the server repo as the authoritative implementation.
3. Keep HealthClaw changes isolated and conservative.
4. Do not break the default NanoClaw path while extending HealthClaw.
5. After each meaningful milestone:
   - update `docs/SETUP_AND_STATUS_2026-04-13.md`
   - push the server repo to `origin`
   - sync docs back to the local archive if needed

## Recommended Next Engineering Step

The currently recommended next milestone is:

- strengthen medication consult with structured local reference data and
  additional deterministic safety rules

Reason:

- the first medication consult path now exists, so the next highest-value work
  is to make that path safer and more useful before broadening scope
