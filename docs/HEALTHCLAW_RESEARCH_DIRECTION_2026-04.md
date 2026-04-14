# HealthClaw Research Direction (2026-04)

## Purpose

This document defines the updated strategic research direction for HealthClaw.

It is meant to clarify the project's paper-oriented positioning, the system
boundary we want to defend, and the kind of contribution HealthClaw should make
to both medical agent research and open-source engineering.

## Current Thesis

HealthClaw should be developed as a patient-facing, safety-aware, traceable
medical Plan-Act runtime rather than as a generic medical chatbot or a broad
autonomous agent platform.

用更直接的话说，HealthClaw 的目标不是做一个“医学味的通用 Agent”，而是做一个
以患者咨询任务为中心、以安全分流和结构化追踪为核心的 medical runtime。

## What Claw Contributes

The value of the Claw-style base in HealthClaw is not mainly that it can call a
model. Its real value is that it provides a runtime shape that remains small,
controllable, and easy to extend conservatively.

Key contributions from the Claw base:

- lightweight, auditable runtime instead of a heavy feature platform
- host-side deterministic insertion points for safety checks and structured
  routing
- container isolation and a clean orchestration substrate
- a development path that supports progressive evolution rather than one-shot
  platformization
- a strong fit for research systems that need clarity, traceability, and
  implementation control

这对 HealthClaw 很关键，因为医疗场景最怕“系统能力很多，但边界不清”。Claw
的底座允许我们把 template routing、deterministic safety、trace writing、
case-state updates 明确地放在宿主侧，而不是全部塞进 prompt 里。

## Gaps In Current Medical Agent Work

HealthClaw should aim at a gap that is still underserved.

Current gaps:

- generic medical chatbots often lack explicit safety boundaries
- single-task medical models often lack system-level trace and orchestration
- general agent frameworks rarely provide a medical-specialized runtime
- many medical AI demos show model capability but do not show conservative,
  inspectable task execution
- open-source agent systems usually optimize for tool breadth, not for medical
  safety structure

HealthClaw should fill the space between:

- a narrow medical model demo
- a generic agent platform

The target is a research-grade, open-source medical runtime that is safe enough
to study seriously and structured enough to engineer sustainably.

## Lessons From Recent Agent Papers

### Hi-AGENT

**Core idea**

Hi-AGENT separates high-level semantic planning from low-level UI execution so
that cross-platform behavior becomes more stable and more generalizable.

**Useful lesson for HealthClaw**

HealthClaw should separate medical planning from medical execution.

In our context, this means:

- high-level layer decides task template, safety boundary, missing information,
  and next-step intent
- lower-level layer executes template-specific extraction, tool use, structured
  checks, and output generation

**What we should adopt**

- planner vs actor separation
- explicit intermediate state between understanding and execution
- feedback-friendly execution structure

**What we should not copy directly**

- UI-control-specific abstractions
- overly general cross-platform action design that does not help medical tasks

### SPA (Self-Play Agent)

**Core idea**

SPA emphasizes internal world modeling through state prediction and policy
improvement instead of relying only on one-shot action generation.

**Useful lesson for HealthClaw**

HealthClaw should maintain a structured medical case state instead of treating
each turn as an isolated prompt.

The important idea is not PPO itself. The important idea is that a robust agent
needs a state model of the environment it is acting in.

**What we should adopt**

- explicit state representation for each case
- state transition thinking across turns
- planner behavior driven by known facts, missing fields, and risk updates

**What we should not copy directly**

- RL-heavy training assumptions for the current system phase
- unnecessary policy-learning complexity before runtime structure is stable

### 3DMedAgent

**Core idea**

3DMedAgent uses a stronger general model as the controller while dispatching
specialized medical submodels through a structured process.

**Useful lesson for HealthClaw**

Future HealthClaw imaging pathways should not depend on one monolithic medical
agent alone. The better direction is a strong planner/controller coordinating
specialized visual or report-related models.

This is especially relevant for:

- `imaging_qa`
- future HealthGPT-style multimodal integration

**What we should adopt**

- strong controller plus specialized model orchestration
- structured intermediate artifacts from specialist tools
- using specialist outputs as traceable evidence, not hidden internals

**What we should not copy directly**

- assuming 3D imaging orchestration should be the first implementation target
- overcommitting to heavy multimodal orchestration before simpler host-side
  paths are mature

### UniVA

**Core idea**

UniVA uses a Plan-Act dual-layer architecture and an MCP-based interface to
coordinate heterogeneous external models and workflow steps.

**Useful lesson for HealthClaw**

HealthClaw should evolve toward a medical Plan-Act runtime where planning,
execution, and memory are explicitly separated.

The most relevant lessons are:

- plan-act structure
- clean model/tool integration contracts
- task memory and trace memory as first-class system pieces

**What we should adopt**

- explicit plan-act layering
- protocol-friendly integration for future medical tools and APIs
- task/case memory and trace memory as core architecture

**What we should not copy directly**

- broad workflow generality for its own sake
- video-centric abstractions that do not map to medical tasks

## Light Lessons From LangChain

LangChain is useful mainly as a reminder that complex LLM systems need clear
modular boundaries.

The light lessons worth absorbing are:

- modular decomposition of model, tools, memory, retrieval, and runtime
- composable workflow thinking
- observability as a real engineering requirement

What HealthClaw should not become:

- a general medical-flavored LangChain platform
- a highly configurable orchestration framework with weak domain boundaries

HealthClaw should stay medical-specific. We should absorb modularity and
observability, but not drift into general-purpose platform building.

## HealthClaw Research Direction

The working formula should be:

`HealthClaw = Medical Plan-Act Runtime + Deterministic Safety Layer + Structured Case Memory + Evidence Trace`

This formula captures the system we actually want:

- a runtime, not only a chatbot
- safety as a structured layer, not only a prompt style
- case memory as structured state, not only conversation summary
- evidence and trace as first-class outputs, not only internal logs

## Target Contributions

### Academic contribution candidates

- a safety-first medical agent runtime for patient consultation tasks
- dual-view trace design for patient-facing output and expert-facing review
- medical case-state-driven orchestration rather than prompt-only interaction
- explicit layering of rules, structured knowledge, and evidence grounding
- a controlled path from host-side deterministic logic to specialist-agent
  coordination

### Open-source engineering contribution candidates

- a maintainable medical agent runtime skeleton instead of a one-off demo
- a system that is neither a narrow benchmark artifact nor a bloated platform
- a reusable bridge between research prototypes and auditable engineering
- an open runtime pattern for patient-facing medical consultation workflows

## Design Principles Going Forward

The following principles should stay fixed:

- triage first, answer second
- templates before open-ended agenting
- deterministic safety before LLM freedom
- trace as first-class artifact
- structured memory only
- controlled specialist coordination before broad autonomy

这些原则不是风格偏好，而是项目边界。后续功能设计如果违反这些原则，默认应当视为偏离
方向，而不是正常扩展。

## Immediate Direction

The near-term direction should remain disciplined:

- strengthen `medication_consult` into a safer and deeper host-side path
- introduce a shared `medical_case_state` abstraction
- use that state layer to support multi-turn continuity beyond symptom triage
- expand later into `report_interpretation`
- prepare `imaging_qa` as a planner-orchestrated specialist path, not as a
  one-shot multimodal shortcut
