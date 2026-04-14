# HealthClaw Home Health Story

## Purpose

This document resets the product story for HealthClaw.

It exists to prevent the project from drifting into a generic online-clinic
demo or a rule-heavy medical chatbot.

The intended story is narrower, stronger, and more believable:

`HealthClaw is the health module inside a home robot or home agent system.`

## What HealthClaw Is Not

HealthClaw should not primarily be framed as:

- an online hospital
- a doctor replacement
- a general medical search box
- a website where users manually upload reports after already visiting a
  hospital

Those stories are weak for trust, product realism, and academic positioning.

If the implied workflow is:

- user goes to the hospital
- user gets a report
- user goes home
- user opens a Linux machine and asks HealthClaw what the report means

then the product story is not strong enough.

## The Better Story

The right story is a proactive home-health module inside a family robot, home
assistant, or ambient embodied agent.

In that setting, HealthClaw is useful because it handles:

- daily symptom follow-up
- medication adherence reminders
- medication-effect tracking
- low-to-medium-acuity household health questions
- structured report or prescription understanding
- safe escalation to clinicians or family members when needed

The system is not trying to replace clinical care.

It is trying to improve the gap between:

- nothing happened at home
- hospital-level care is already needed

## Why This Story Works

### 1. The frequency is real

Families repeatedly deal with:

- fever monitoring
- missed doses
- medicine combination questions
- symptom progression over 1-3 days
- whether something is improving or worsening
- whether it is time to seek outside care

These are not rare edge cases. They are recurring household workflows.

### 2. The right job is triage and continuity, not diagnosis

The home-health module should answer:

- do we need to keep watching this?
- do we need more information first?
- do we need to re-check something later?
- do we need to take medicine now?
- do we need to escalate to offline care?

That is a much more credible role than pretending to be an online hospital.

### 3. Embodiment makes proactive interaction natural

A home robot or ambient home agent can:

- notice that a family member is present
- notice that a follow-up is due
- ask about symptom change at the right time
- remind about medicine
- request a re-check after a previous concerning case

This is where agentic value becomes obvious.

## The Core Agent Story

The most important behavior is not:

- "wait for user question, then answer"

The most important behavior is:

- "maintain a health case over time, and proactively interact when needed"

Good examples:

- yesterday the temperature was high, so this morning the agent asks whether it
  came down
- a medication course started two days ago, so the agent asks whether symptoms
  improved and by how much
- a dose is due, so the agent reminds the user to take the medication
- a worrying symptom did not improve after the expected interval, so the agent
  suggests escalation

That is what makes HealthClaw feel like an agent instead of a medical FAQ box.

## Why Proactivity Is The Most Attractive Capability

OpenClaw already shows that proactive behavior is one of the most compelling
parts of the Claw story.

For HealthClaw, this matters even more.

In a home-health setting, the most valuable moments are often not:

- "the user asked a new question"

They are:

- "the follow-up became due"
- "the medicine time arrived"
- "the user is present again this morning"
- "the previous case has not improved on schedule"

This means the strongest HealthClaw demo is not a medical Q&A turn.

It is a proactive household interaction such as:

- "Yesterday your temperature was high. Has it come down this morning?"
- "It is time to take the next dose. Have you already taken it?"
- "You have been on the medication for two and a half days. Are symptoms better?
  If yes, by how much?"

That is the part of the story that feels most like a real family robot health
module.

## The Product Wedge

The most realistic wedge is:

- home symptom follow-up
- medication reminders and response tracking
- household-safe report/prescription understanding
- proactive check-ins

This wedge is strong because it combines:

- repetition
- continuity
- timing
- family context
- safety-sensitive but not fully clinical responsibility

## Why Claw Matters Here

Claw matters here not because it can call a model.

Claw matters because it gives HealthClaw the right runtime shape for a
home-health module:

- event-driven execution
- persistent case memory
- modular specialist-agent orchestration
- explicit safety boundaries
- traceable outputs
- room for proactive scheduling and triggers

The Claw value is strongest when HealthClaw is framed as:

- a home-health runtime
- with structured state
- and proactive follow-up ability

not as a pile of static if/else rules.

## The Real Input Model

HealthClaw should not be designed around only one input:

- `user typed a message`

It should be designed around a broader home-health event model:

- user message
- scheduled follow-up time
- medication due time
- presence detected
- image captured
- report or prescription photographed
- family observation entered
- external sensor event

This is the correct foundation for future embodied use.

## Role Of Report Understanding

Report interpretation is still useful, but it should be subordinated to the
home-health story.

The point is not "explain reports as a website."

The better role is:

- the robot or home agent receives a photo or screenshot
- a specialist report pipeline structures it
- HealthClaw links it to the current household health case
- the system follows up later if needed

That is much stronger than treating report explanation as a standalone product.

## HealthClaw's Job Boundary

HealthClaw should aim to be:

- a proactive household health companion
- a safety-aware follow-up layer
- a case-tracking runtime
- a bridge to offline care when needed

HealthClaw should not aim to be:

- a full diagnostic authority
- a clinician replacement
- a telemedicine platform
- a broad hospital information system

## System Thesis

The working product thesis should become:

`HealthClaw is a proactive home-health agent runtime for family robots and ambient household assistants.`

More concretely:

`HealthClaw helps a home agent maintain health cases, follow up over time, remind, re-check, and escalate safely.`

## Immediate Implication For Development

This story changes what should be prioritized next.

Higher priority:

- proactive follow-up planning
- timed health check-ins
- medication adherence and symptom-improvement tracking
- event-driven orchestration
- presence-aware interaction interface

Lower priority:

- expanding many narrow text-only report rules
- building a faux online-clinic interaction model
- adding more static task branches without agent coordination
