# Phase 6.5 Agent Systems Review

## Scope

Reviewed the agent registry, capability scheduler, quota reservation/settlement, fallback dispatcher, agent HTTP routes, provider boundary, workspace authorization, credential redaction, and audit storage. The review was performed against the working tree in `/tmp/starter-empty` without claiming any mock result as real model execution.

## Verified baseline

- Agent registration requires provider, model, and at least one capability.
- Scheduler selects only `normal` agents that advertise the requested capability and orders by ascending priority.
- Quota reservations are appended to the in-memory ledger and committed or released around dispatch attempts.
- A primary invocation failure releases its reservation and allows a configured compatible fallback to run.
- API workspace authorization executes before data routes. Workspace-scoped agent listing now depends on the stored `workspace_id`.
- Public agent serialization removes credential-shaped fields, including legacy and common alternate names.
- The current HTTP dispatcher is explicitly marked `execution_mode: mock` and `provider_kind: mock`; it is a fixture response and does not call an external model provider.
- Dispatch attempts append redacted `agent.invocation` audit events containing agent/provider/model identifiers, capability, reservation id, status, and an error code/message when applicable. The input reference is not copied into the audit metadata.

## Changes made

1. `engines/agent-orchestration/src/registry.mjs`
   - Validates status against the registry status set at registration time.
   - Validates integer limits and rejects negative RPM/TPM values.
   - Validates that capabilities are non-empty strings.
   - Persists optional workspace ownership and an explicit execution mode, defaulting to `mock` for this unconnected baseline.
   - Expands public serialization redaction to cover credential-shaped fields beyond the original two names.

2. `engines/agent-orchestration/src/quota.mjs`
   - Rejects missing windows, fractional token counts, and negative token requests before mutating the ledger.

3. `engines/agent-orchestration/src/dispatcher.mjs`
   - Explicit fallback ids are now filtered by requested capability, preventing an incompatible fallback from being invoked.
   - Added an optional attempt callback used by the HTTP layer for redacted audit records.

4. `server/app.mjs`
   - `/agents/select` now returns the public/redacted agent representation.
   - `/agents/dispatch` returns explicit mock-provider markers and records each committed or released invocation attempt as an audit event.

5. `tests/phase-6.5-qa.test.mjs`
   - Added regression tests for registration validation, API redaction, mock labeling, invocation auditability, and incompatible fallback rejection.

## Checks run

- `npm test`: passed, 14 tests, 0 failures.
- `npm run format:check`: passed.
- JavaScript syntax checking is included in the test suite and passed.
- `npm run check`: blocked before completion by an existing file, `reports/phase-6.5-security.md`, which contains a secret-like pattern matched by the repository scanner. This finding predates this report and is outside the agent-system files changed here.

## Remaining risks and explicit non-claims

- The provider boundary is still not a real provider adapter. There is no external model call, timeout policy around a provider call, provider error taxonomy, cost accounting, or output safety filter. The route's result is intentionally labeled mock.
- Quota is process-local and non-transactional. Concurrent requests, multiple workers, crashes between reservation and settlement, stale reservations, and durable reconciliation are not solved by this in-memory primitive.
- RPM is registered but not enforced. Only the TPM-style per-window token check is currently implemented.
- Dispatch audit events are durable only if the configured persistence callback is durable. The default memory store loses them on process exit.
- Fallback policy is caller-supplied and does not yet enforce an operator-managed allowlist, retry budget, timeout, cancellation, or circuit breaker.
- Agent registration authorization is limited to the existing workspace gate and service identity behavior. A production role policy for who may register or mutate shared agents is still absent.
- The repository has unrelated pre-existing working-tree changes in the server and report/test files; no commit, push, deployment, or destructive operation was performed.
