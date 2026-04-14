# HealthClaw Event-Driven Runtime Plan

## Purpose

This document defines the runtime refactor needed to support the right
HealthClaw story:

- proactive home-health interaction
- family-robot compatible interfaces
- specialist-agent coordination
- heartbeat, cron, and external-trigger driven behavior

The goal is to move away from a mainly passive, rule-heavy template runtime and
toward an event-driven health agent runtime.

## Core Shift

Old default mental model:

- user sends a message
- system classifies it
- system replies once

New default mental model:

- the system maintains a health case over time
- different events can wake the system
- the system decides whether to ask, remind, stay silent, or escalate

## OpenClaw Lessons To Reuse

OpenClaw's proactive design gives three especially useful ideas:

- `Heartbeat`
  - periodic approximate main-session turn
  - does not need to create a detached task record every tick
  - good for context-aware routine checks
  - explicit no-op acknowledgement such as `HEARTBEAT_OK`
- `Cron Jobs`
  - precise scheduling
  - gateway-owned persistent scheduler rather than model-owned timing logic
  - persistent jobs
  - isolated or main-context execution styles
- `Webhooks / external triggers`
  - outside events can wake the system
  - the runtime should accept external payloads safely

OpenClaw also distinguishes:

- internal `hooks`
  - lifecycle and message-flow reactions inside the runtime
- external `webhooks`
  - inbound HTTP triggers from outside systems

HealthClaw should preserve this distinction.

HealthClaw should reuse these ideas, but specialize them for home-health
follow-up instead of generic productivity.

## Runtime Thesis

The target formula should be:

`HealthClaw = Event Ingress + Orchestrator Agent + Specialist Health Agents + Deterministic Safety Layer + Structured Case State + Trace`

## New First-Class Input: Health Events

HealthClaw should define a single event protocol instead of assuming only user
messages.

Suggested event types:

- `user_message`
- `scheduled_checkin`
- `medication_due`
- `presence_detected`
- `state_transition_due`
- `external_trigger`
- `document_captured`
- `sensor_observation`

### Suggested base event shape

Each event should include:

- `eventId`
- `eventType`
- `subjectId`
- `caseId` (optional)
- `occurredAt`
- `source`
- `payload`

This lets the same runtime work in:

- today's server-based simulation environment
- tomorrow's embodied family robot environment

## Orchestrator-Centered Design

Task classification should no longer be treated as a static if/else tree in
host code.

Instead:

- a `router_agent` proposes task interpretation
- an `orchestrator` decides what to do next
- specialist agents perform semantic work
- a deterministic safety layer constrains the result

### Proposed specialist agents

- `router_agent`
- `symptom_agent`
- `medication_agent`
- `report_agent`
- future `imaging_agent`
- future `risk_reviewer_agent`

## Agent Communication

Agent-to-agent communication should be explicit and structured.

It should happen through typed protocol objects, not only prompt text.

Suggested protocol objects:

- `TaskRoutingDecision`
- `OrchestratorPlan`
- `SpecialistDraft`
- `SafetyReviewDecision`
- `CaseStateDelta`
- `ProactiveActionPlan`

This is important both for engineering and for paper quality.

If we want to claim a meaningful Claw-style medical runtime, agent
communication must be visible in the architecture and traces.

## Heartbeat Plan

Heartbeat should become a core mechanism in HealthClaw.

### Intended role

Heartbeat is not for exact timing.

Heartbeat is for periodic, context-aware home-health follow-up such as:

- check whether any open household health case needs re-contact
- decide whether a pending symptom case should be revisited this morning
- decide whether medication adherence needs a gentle follow-up
- decide whether there is nothing to do and return a no-op acknowledgement

### HealthClaw heartbeat contract

Suggested behavior:

- orchestrator receives a `heartbeat_tick` event
- reviews due cases and pending follow-ups
- either emits one or more `ProactiveActionPlan`s
- or returns a no-op token, for example `HEALTH_HEARTBEAT_OK`

Suggested implementation style, inspired by OpenClaw:

- heartbeat is owned by the host runtime, not by the model
- heartbeat runs on an approximate interval
- heartbeat uses the main case context by default
- heartbeat should be allowed to do nothing cleanly

### Why heartbeat matters

Heartbeat is the cleanest way to simulate embodied proactivity before real
sensors are connected.

It also gives the project a direct bridge from:

- server-based agent

to:

- always-on household health module

## Cron Plan

Cron should be used for exact timing and persistent scheduled health actions.

### Use cases

- remind the user to take a medication at a specific time
- check in exactly the next morning after a fever episode
- ask for a day-3 antibiotic symptom update
- schedule a repeat measurement request

### Required runtime support

- persistent scheduled jobs
- link each job to `subjectId` and optionally `caseId`
- allow `main-context` and `isolated` execution styles
- record run history and outcome
- keep schedule ownership in the host runtime

Suggested storage pattern:

- a persistent health scheduler store, comparable in role to OpenClaw's cron
  store
- retry and reconciliation owned by the runtime, not by agent prompts

### Main vs isolated recommendation

- `main-context` for gentle household continuity
- `isolated` for background analysis or report preparation

## Webhooks / External Triggers Plan

HealthClaw should support external-trigger driven events, not just timers.

### Use cases

- a sensor reports that a family member is present
- a device reports a new temperature reading
- a medication box reports an adherence event
- a camera/document pipeline posts an OCR result
- a mobile companion app submits a health observation

### Required design

- authenticated inbound trigger endpoint
- translate external payloads into `HealthEvent`
- preserve source attribution in trace
- keep external triggers separate from direct patient claims

Suggested minimum external-trigger endpoints:

- `/health/hooks/wake`
  - enqueue a trusted or semi-trusted health system event
- `/health/hooks/agent`
  - trigger an isolated specialist-agent turn
- `/health/hooks/<mapping>`
  - runtime-owned named mappings for devices, OCR pipelines, and family apps

This mirrors the most useful OpenClaw webhook idea without copying its product
surface blindly.

## Internal Hooks Plan

HealthClaw should also introduce internal runtime hooks for non-HTTP events.

Suggested hook families:

- `case:opened`
- `case:updated`
- `followup:scheduled`
- `followup:missed`
- `medication:due`
- `document:ingested`
- `risk:escalated`
- `presence:detected`

These are useful for:

- logging
- plugin integration
- future robot platform integration
- optional side-effects such as family notifications

## Presence-Aware Interaction Interface

Even before a real robot exists, the runtime should define a presence-aware
interface.

Suggested event:

- `presence_detected`

Suggested payload fields:

- `subjectId`
- `locationHint`
- `confidence`
- `detectedBy`

The orchestrator should then decide:

- ask now
- wait
- merge with an already-due follow-up
- remain silent

This keeps the interface ready for an embodied robot without blocking on robot
hardware today.

## Report Agent Tool Choice

`report_agent` should not be hard-wired to one interpretation path.

It should be allowed to choose among:

- direct text interpretation
- OCR
- OCR plus layout parsing
- VLM
- OCR first, VLM fallback

The runtime should not decide the semantic tool path.

The runtime should instead:

- record what path was chosen
- record confidence and evidence source
- apply downstream safety checks

This is more agentic and more aligned with the family-robot story.

## Deterministic Safety Layer: Narrower But Stronger

The deterministic layer should become smaller in scope but stronger in role.

It should focus on:

- hard escalation boundaries
- output policy limits
- required follow-up before unsafe advice
- trace completeness
- schema validation for agent outputs

It should not continue expanding into the main semantic understanding engine.

## Testing Strategy For A Non-Embodied Phase

Even without a physical robot, we should simulate embodied triggering.

### Add event-driven test coverage

Test classes should include:

- `scheduled_checkin` after previous fever case
- `medication_due` reminder on exact time
- `presence_detected` causing proactive follow-up
- `state_transition_due` after antibiotic day 3
- `external_trigger` carrying a temperature or OCR payload

### Example simulation flows

1. Fever follow-up simulation
   - day 1: user reports fever
   - runtime opens case
   - next morning: `presence_detected`
   - orchestrator asks whether temperature has come down

2. Medication adherence simulation
   - case records `medication_started_at`
   - cron emits `medication_due`
   - runtime sends reminder
   - after 2.5 days, `state_transition_due`
   - orchestrator asks whether symptoms improved and by how much

3. Report image simulation
   - `document_captured` event arrives
   - `report_agent` chooses OCR or VLM path
   - structured draft enters safety review
   - follow-up gets attached to the current case

## Recommended Near-Term Refactor Order

1. Define `HealthEvent` and proactive action protocol types
2. Add `router_agent` and `orchestrator` interfaces
3. Introduce `heartbeat` loop for due-case review
4. Add precise health cron scheduling
5. Add authenticated external-trigger ingress
6. Convert current task classification to agent-first routing
7. Move specialist extraction toward agent outputs
8. Add presence/schedule simulation tests

## Acceptance Criteria

The event-driven refactor should count as real progress only if:

- agent-to-agent communication becomes explicit in code structure
- heartbeat exists as a first-class runtime concept
- cron scheduling exists for health follow-up tasks
- external triggers can enter the system through a structured interface
- tests simulate proactive and presence-aware behavior
- traces record trigger type, plan, and action

## Immediate Next Step

The next implementation milestone should be:

- introduce `HealthEvent`
- introduce a minimal `heartbeat` runner
- introduce a minimal proactive follow-up planner
- add tests that simulate presence-aware follow-up after an existing case
