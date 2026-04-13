# Setup And Status (2026-04-13)

## Purpose

This document records the work completed so far for the `NanoClaw -> HealthClaw`
project transition, including:

- local Windows workspace setup
- GitHub fork/remotes state
- Linux server environment setup
- NanoClaw baseline validation
- credential/runtime decisions
- current project status and next steps

## Repository State

Local workspace:

- Path: `E:\healthclaw\healthclaw`
- Based on: `qwibitai/NanoClaw`
- User fork: `uDeserve/NanoClaw`

Expected remotes:

- `origin -> https://github.com/uDeserve/NanoClaw.git`
- `upstream -> https://github.com/qwibitai/NanoClaw.git`

Git identity configured for the user:

- `user.name = uDeserve`
- `user.email = 1157548404@qq.com`

## Local Windows Work

### Environment

- Conda env created at `E:\conda-envs\healthclaw`
- Node version unified to `22.x`
- Docker Desktop + WSL2 installed and verified

### Local baseline results

The local repository was validated successfully at the engineering baseline level:

- `npm install`
- `npm run build`
- `npm run typecheck`
- `npm run test`

All passed after Node ABI alignment.

### Local code/document changes already made

1. Added a runtime planning document:
   - `docs/HEALTHCLAW_RUNTIME_PLAN.md`

2. Fixed a Windows compatibility issue:
   - `setup/platform.ts`
   - Replaced Unix-only command detection logic with Windows-compatible behavior

3. Adjusted the container Dockerfile once during Windows-side debugging:
   - `container/Dockerfile`
   - Debian mirrors switched to HTTPS

## HealthClaw Product Direction Learned From Docs

The product target is not a generic agent platform. The intended system is a
patient-facing, safety-aware, traceable medical agent runtime.

V1 scope is intentionally narrow:

1. symptom consultation / light triage
2. medication consultation
3. report interpretation
4. imaging QA

High-priority architectural constraints:

- task-template-driven flows
- safety-first triage before answer generation
- structured trace output
- patient view + expert view
- controlled structured memory

Conclusion from the review:

- `NanoClaw` is a good runtime substrate
- the medical application layer still needs to be built on top of it

## Linux Server Migration

SSH target used:

- host alias: `lsj245`
- user: `lsj`
- port: `1181`

Recommended server working path:

- project: `/data/lsj/healthclaw`
- dedicated env: `/data/lsj/conda-envs/healthclaw`

Reasons:

- root/home filesystem was relatively constrained
- `/data` had enough space and was more appropriate for active development
- avoids polluting older experiment environments

### Server cleanup performed

To reclaim space before setup:

- removed `~/.cache/pip`
- removed unused conda envs:
  - `hulumed`
  - `medvlm-r1`

This increased available root filesystem space enough to proceed safely.

### Server environment setup

Using the existing Miniconda installation on the server:

- conda base located under `/opt/miniconda3`
- created a dedicated project env at `/data/lsj/conda-envs/healthclaw`
- installed Node `22.x`

The project was then cloned to:

- `/data/lsj/healthclaw`

## NanoClaw Baseline Validation On Server

Validated successfully on the Linux server:

- `npm install`
- `npm run build`
- `npm run typecheck`
- `npm test`
- `npm run setup -- --step environment`
- `npm run setup -- --step container --runtime docker`

This confirmed:

- the repo is healthy on Linux
- the Docker runtime works
- the agent image builds correctly
- container self-test works

## Credential Architecture Decision

### Problem discovered

Current upstream `NanoClaw` on Docker had already moved to `OneCLI Agent Vault`.

That caused two practical problems for this project:

1. the server did not already have `onecli` configured
2. this project needs a custom Anthropic-compatible endpoint (`yunwu.ai`), which
   is better served by a direct `.env`-driven credential path

### Decision taken

The server repo was switched from the OneCLI-based path to the built-in native
credential proxy path by merging:

- `upstream/skill/native-credential-proxy`

One merge conflict occurred in:

- `src/config.ts`

It was resolved in favor of the native credential proxy model.

### Result

After the merge:

- credentials are read from `.env`
- the host starts a local credential proxy
- containers route Anthropic-compatible traffic through that proxy
- `ANTHROPIC_BASE_URL` is supported directly

This is the correct setup for the current HealthClaw development needs.

## NanoClaw Real Smoke Validation

The work did not stop at build/test.

A real end-to-end smoke run was completed on the server using:

- the current server codebase
- Docker container execution
- the native credential proxy
- the configured Anthropic-compatible endpoint

Observed successful result:

- agent session initialized
- model response returned successfully
- smoke response text matched the expected exact output

This means NanoClaw is not merely "compilable" on the server; it is functionally
working as a containerized LLM runtime.

## Important Runtime Notes

### Why `npm start` still exits immediately

The repository currently has no default channel implementation installed in the
active code path. Because of that, the main process may exit with:

- `No channels connected`

This does not invalidate the smoke validation. The real agent/container/model
path has already been proven separately.

### Why `setup --step environment` may still show `HAS_AUTH=false`

That check still relies on older assumptions and may look for legacy auth state.
After switching to the native credential proxy path, the more meaningful signal is:

- credential proxy startup logs
- successful smoke agent execution

## Current Status

As of `2026-04-13`, the project is in this state:

1. Local repo is prepared and documented.
2. GitHub fork/remotes are configured.
3. Linux server environment is ready.
4. NanoClaw baseline is validated on Linux.
5. Native credential proxy is active on the server repo.
6. A real NanoClaw smoke run succeeded through the configured model endpoint.
7. The project is ready to begin HealthClaw skeleton implementation.

## Recommended Next Step

Begin implementing the first HealthClaw application layer on top of NanoClaw,
starting with a minimal symptom-triage skeleton:

- HealthClaw domain types
- template registry
- safety precheck layer
- trace schema persistence
- host-side medical runtime entrypoint

## Server Paths To Remember

- project root: `/data/lsj/healthclaw`
- conda env: `/data/lsj/conda-envs/healthclaw`
- server docs copy target: `/data/lsj/healthclaw/docs/`
## HealthClaw Skeleton Milestone

The first HealthClaw application-layer skeleton has now been implemented directly
in the server repository.

### Added HealthClaw modules

New files added under src/healthclaw/:

- 	ypes.ts
- 	emplates/registry.ts
- 	riage/symptom.ts
- untime/handle-medical-message.ts
- untime/command.ts
- egistry.test.ts
- untime/handle-medical-message.test.ts
- untime/command.test.ts

### Database and runtime integration

The server codebase now includes host-side medical trace persistence in src/db.ts:

- medical_traces
- medical_trace_events
- trace save/read helpers

A feature-gated HealthClaw entry was added to the main runtime:

- src/config.ts now supports HEALTHCLAW_ENABLED
- src/index.ts now routes /healthclaw ... messages into the host-side
  HealthClaw handler when the feature flag is enabled

Current guarded behavior:

- original NanoClaw message flow remains unchanged by default
- HealthClaw path activates only when:
  - HEALTHCLAW_ENABLED=true
  - incoming message begins with /healthclaw

### Current HealthClaw runtime behavior

The current skeleton supports:

- deterministic task-template classification
- deterministic symptom red-flag precheck
- patient-facing output formatting
- expert-view generation
- structured medical trace creation and persistence

This is still a controlled first milestone, not the final medical workflow.
It is intended to provide a safe application-layer insertion point on top of
NanoClaw without destabilizing the original runtime.

### Verification after HealthClaw integration

Validated successfully on the server after these changes:

- 
pm run build
- 
pm test

Observed full test result at this milestone:

- 22 test files passed
- 260 tests passed

## Ongoing Working Rule

From this milestone onward, after each significant implementation checkpoint:

- update this status document on the server
- keep the repository backed up to the GitHub fork

Primary code source of truth:

- server repository: /data/lsj/healthclaw

Primary remote backup target:

- origin -> https://github.com/uDeserve/NanoClaw.git

## HealthClaw Symptom Structuring Milestone

The symptom-triage path has now been strengthened beyond simple keyword routing.

### What changed

The host-side HealthClaw runtime now performs deterministic symptom fact
extraction before triage output generation.

New structured fields now extracted when present:

- chief complaint
- duration
- severity
- age
- temperature
- symptom location
- onset style
- associated symptoms
- missing required fields

### Safety and output improvements

The deterministic symptom precheck was extended to use both keywords and
structured facts.

New behavior now includes:

- high-fever escalation using measured temperature parsing
- urgent-care escalation for severe pain in sensitive locations
- additional emergency keyword coverage such as loss of consciousness and seizure
- clearer patient-facing handling when required symptom details are still missing

Patient-facing output now includes:

- a summary built from extracted symptom facts
- missing-information fields when duration or chief complaint detail is absent
- better follow-up questions tied to what is missing

Expert-facing output and stored trace now include:

- structured symptom facts
- extracted fact strings
- a dedicated structured_facts_extracted trace event

### Verification after this milestone

Validated successfully on the server after the symptom structuring changes:

- 
pm run build
- 
pm test

Observed full test result at this milestone:

- 23 test files passed
- 264 tests passed

## HealthClaw Auto Routing Milestone

HealthClaw is no longer limited to explicit /healthclaw commands.

### What changed

A new host-side routing decision layer was added under:

- src/healthclaw/runtime/routing.ts

This layer now supports two routing sources:

- command: explicit /healthclaw ...
- uto: ordinary user messages that look medically relevant

### Current routing policy

HealthClaw still requires HEALTHCLAW_ENABLED=true.

Automatic routing is separately gated by:

- HEALTHCLAW_AUTO_ROUTE=true

Current behavior:

- explicit /healthclaw commands always take priority
- ordinary messages are auto-routed only when they show strong medical evidence
- generic non-medical chat is left on the original NanoClaw path
- slash-prefixed commands other than /healthclaw are not auto-routed

The current auto-routing heuristic uses:

- template classification confidence for medication/report/imaging requests
- structured symptom facts
- deterministic safety red flags
- symptom evidence scoring

### Verification after this milestone

Validated successfully on the server after the routing changes:

- 
pm run build
- 
pm test

Observed full test result at this milestone:

- 24 test files passed
- 269 tests passed
