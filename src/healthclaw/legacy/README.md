# HealthClaw Legacy

This directory is reserved for logic that has exited the main runtime path.

Rules:

- `runtime/` and `agents/` must not import from `legacy/`
- migration-only adapters may reference `legacy/`
- new features do not belong here
