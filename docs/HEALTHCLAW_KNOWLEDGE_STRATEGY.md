# HealthClaw Knowledge Strategy

## Purpose

This document records the current agreed direction for integrating medical
knowledge into HealthClaw.

It exists to prevent a new contributor or agent from making one of two common
mistakes:

1. handing core safety decisions directly to an LLM or remote API
2. trying to solve everything with one generic RAG pipeline

## Core Principle

HealthClaw should use different kinds of knowledge in different ways.

The system should not treat:

- symptom red-flag rules
- drug interaction logic
- patient education content
- lab explanation summaries
- biomedical literature

as if they are all the same kind of data.

## Layered Knowledge Architecture

### 1. Deterministic safety layer

This layer is for knowledge that should trigger stable, auditable decisions.

Examples:

- symptom red flags
- urgent-care rules
- emergency escalation rules
- future medication interaction high-risk pairs
- future critical lab value rules

Implementation style:

- structured rules
- tables
- deterministic host-side logic

Do not rely on free-form generation for this layer.

### 2. Structured reference layer

This layer is for explanation and controlled support content.

Examples:

- drug reference summaries
- medication instructions
- common side-effect descriptions
- lab/report interpretation reference
- imaging terminology explanations
- patient education summaries

Implementation style:

- structured local store
- normalized metadata
- template-aware lookup

This layer supports:

- patient-facing explanations
- expert-facing summaries
- grounded follow-up reasoning

### 3. External evidence layer

This layer is for open APIs and other remote knowledge providers.

Examples:

- PubMed / biomedical literature APIs
- guideline APIs or guideline-derived endpoints
- drug label / terminology APIs
- domain-specific medical reference APIs

This layer should be treated as:

- optional
- selective
- bounded by timeout and source policy

It should not become the default path for every user message.

## How Open Medical APIs Should Be Used

Open APIs should be used as external evidence services, not as the main source
of safety decisions.

They are useful for:

- supplementing explanations
- providing cited evidence
- covering frequently updated medical knowledge
- supporting newer drugs or newer evidence questions

They are not suitable as the primary mechanism for:

- emergency triage
- deterministic escalation
- stable medication interaction safety checks

## Task-Specific Usage

### Symptom triage

Use local deterministic logic first:

- red flags
- structured symptom extraction
- urgency disposition

Use external APIs only when helpful for:

- patient education
- guideline-aligned explanation
- supporting detail in expert view

### Medication consult

Preferred order:

1. local medication interaction / safety rule store
2. local structured medication reference
3. external medication API if local knowledge is missing or outdated

### Report interpretation

Preferred order:

1. local critical-value and abnormality rules
2. local structured report/lab explanation data
3. external medical reference only when needed

### Imaging QA

Preferred order:

1. local imaging term and finding explanation resources
2. external reference only for additional explanation

### Evidence-heavy research questions

Only here should literature APIs become central.

Examples:

- newer drug safety signal questions
- evidence comparison questions
- literature-backed uncertainty explanation

## Host-Side Integration Model

HealthClaw should expose knowledge access through host-controlled lookup
functions rather than letting the model choose arbitrary remote calls.

Recommended lookup interfaces:

- `lookupMedicationInteraction`
- `lookupMedicationReference`
- `lookupLabReference`
- `lookupGuidelineSnippet`
- `searchBiomedicalEvidence`

Each lookup should return normalized records with fields such as:

- `sourceType`
- `sourceName`
- `title`
- `snippet`
- `url`
- `publishedAt`
- `evidenceLevel`
- `retrievedAt`

This normalized shape makes it easier to:

- generate patient/expert output
- store grounded trace data
- audit which sources actually influenced an answer

## Safety Rules For External APIs

Any external knowledge provider should follow these constraints:

- source whitelist only
- host-side timeout
- graceful fallback on failure
- explicit retrieval metadata in trace
- never override local deterministic emergency logic

In other words:

- local safety rules decide whether something is urgent
- external APIs may enrich explanation or evidence
- they do not get to redefine the safety boundary

## Recommended Implementation Order

1. Extend local deterministic rule stores
   - symptom rules first
   - later medication interaction rules

2. Add structured local knowledge stores
   - medication reference
   - lab/report reference

3. Define normalized provider interfaces
   - without immediately wiring every external source

4. Add selective external API integrations
   - only where they provide clear value

5. Add trace-level grounding
   - record why the lookup happened
   - record which evidence snippets were used

## Short Version

HealthClaw should not start as a generic medical RAG chatbot.

It should start as:

- deterministic safety logic
- structured local medical reference
- selectively invoked external evidence

That order gives better:

- safety
- traceability
- controllability
- debugging
- handoff clarity
