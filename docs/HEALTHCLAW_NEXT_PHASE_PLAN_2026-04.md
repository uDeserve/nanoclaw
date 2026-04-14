# HealthClaw Next Phase Plan (2026-04)

## Purpose

This document defines the next concrete development phases for HealthClaw after
the current symptom-triage and first medication-consult milestones.

It is not a concept note. It is a decision-complete near-term execution plan
for the next stages of the project.

## Current Baseline

The current system already has a usable first-stage HealthClaw runtime on top
of NanoClaw.

Implemented baseline:

- `symptom_triage` host-side path
- multi-turn symptom follow-up merge
- deterministic follow-up planner
- first `medication_consult` host-side path
- patient-facing and expert-facing outputs
- trace persistence in SQLite
- feature-gated HealthClaw entry in the main runtime

This means the next phase should not restart architecture work from zero. It
should deepen the most promising existing path and generalize the right shared
runtime abstractions.

## What The Next Phase Should Optimize For

The next phase should optimize for:

- safety depth
- case continuity
- evidence-ready architecture
- paper-friendly system clarity

Translated into engineering priorities:

- make medication consult safer before broadening task breadth
- convert current per-template logic into reusable runtime structure
- prepare interfaces for future evidence and specialist integration
- keep the system understandable enough to support both papers and long-term
  maintenance

## Phase 1: Strengthen Medication Consult

This should be the immediate top priority.

### Deliverables

- richer deterministic medication safety rules
- small structured local medication reference layer
- clearer question-type-specific outputs
- better interaction / allergy / pregnancy / overdose handling
- stronger follow-up planning for missing drug details

### Recommended scope

The first medication-depth phase should include:

- more high-risk interaction rules
- basic drug-class or medication metadata support
- clearer separation between information request and safety escalation
- more explicit expert-view rationale for medication decisions

### Explicit non-goals for this phase

- full external medication API integration
- broad pharmacy workflow automation
- unrestricted medical retrieval

The point of this phase is to make the existing medication path deeper and
safer, not to make it broad.

## Phase 2: Introduce Shared Medical Case State

After medication depth, the next foundational step should be a shared
`medical_case_state` abstraction.

This state should cover both symptom and medication tasks.

### Required fields

The shared state should include:

- `taskType`
- `knownStructuredFacts`
- `missingFields`
- `riskLevel`
- `disposition`
- `currentFollowUpFocus`
- `linkedTraceIds`
- `caseStatus`

### Intended uses

- multi-turn continuity
- planner input
- future evidence grounding
- future specialist-agent dispatch
- consistent patient/expert output generation

这一步非常重要，因为它把 HealthClaw 从“模板函数集合”推进成真正的 case-driven
medical runtime。

## Phase 3: Expand Into Report Interpretation

Only after medication depth and shared case state are in place should the next
major task expansion begin.

The next expansion target should be:

- first safe host-side `report_interpretation` path

This phase should:

- keep the first implementation conservative
- focus on report text and deterministic abnormality handling
- avoid jumping immediately into full multimodal agent-team complexity

The goal is to create the third real task path without losing system clarity.

## Imaging Direction

`imaging_qa` should remain a later phase, but its direction should already be
clear.

Recommended future direction:

- combine HealthClaw's planner/runtime with `3DMedAgent`-style specialist
  dispatch thinking
- align future multimodal orchestration with prior HealthGPT strengths

The intended pattern is:

- planner orchestrates specialist visual tools/models
- visual artifacts become structured trace/evidence inputs
- patient and expert outputs are generated from those structured artifacts

This is a better direction than treating imaging as a single-shot multimodal QA
prompt.

## Planned Architectural Refactor

As more task paths are added, `handleMedicalMessage` should be progressively
split into clearer medical runtime modules.

The target decomposition should be:

- classifier
- per-template extractor
- per-template safety checker
- case-state updater
- patient formatter
- expert formatter
- trace writer

This refactor lightly absorbs the good modular lesson from LangChain while
keeping HealthClaw explicitly medical-specific and safety-first.

We want modularity, not framework drift.

## Acceptance Criteria For The Next Phase

For any next-phase milestone to count as complete, all of the following must be
true:

- build/test pass
- new tests added for new rules and follow-up behavior
- docs updated after milestone
- code and docs pushed to GitHub

These are hard completion criteria, not optional hygiene.

## Order Of Execution

The next implementation order should be:

1. medication safety and reference depth
2. shared case-state layer
3. medication multi-turn continuity
4. report interpretation first path
5. imaging orchestration groundwork

This sequence preserves the current strengths of the system while moving toward
the larger research direction in a controlled way.
