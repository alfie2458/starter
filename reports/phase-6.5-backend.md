# Phase 6.5 Backend Report

## Scope

Inspected and hardened `server/app.mjs` for duplicate declarations, duplicate routes, syntax/control-flow issues, and workspace authorization ordering. No commits, pushes, deployments, or data deletion were performed.

## Findings

- `server/app.mjs` had duplicate imports for `requireWorkspaceAccess` and for `createMetrics`/`createLogger`. These caused Node to fail parsing the module with `SyntaxError: Identifier 'requireWorkspaceAccess' has already been declared`.
- `createApp` declared `metrics` and `logger` twice, which would also fail module evaluation after the import issue was fixed.
- The `/metrics` route was duplicated.
- `/events`, `/tasks`, and `/tasks/:id` returned data before the common workspace authorization block. This allowed the early GET routes to bypass `requireWorkspaceAccess`.
- The original `/tasks` collection route returned all tasks when `workspace_id` was omitted, and the task detail route did not verify that the requested task belonged to the authorized workspace.
- Several other workspace-bearing GET collections returned their complete stores rather than filtering by the authorized `workspace_id`.
- The existing `workspace-auth.mjs` contract intentionally permits service and local identities; this behavior was preserved. Non-service identities remain fail-closed when workspace authorization is enabled.

## Changes made

- Removed duplicate authorization and observability imports.
- Removed the duplicate `metrics`/`logger` declaration.
- Removed the duplicate `/metrics` route.
- Moved request-body parsing and workspace authorization ahead of every non-public route/data lookup. The public router paths remain `/health`, `/ready`, and `/metrics`.
- Preserved the existing service-identity exception for requests without a workspace, as defined by `requireWorkspaceAccess`.
- Added a scoped collection helper and applied it to workspace-bearing GET routes: `/events`, `/tasks`, `/knowledge`, `/exams`, `/automations`, `/automation-runs`, `/audit`, `/agents`, `/calendar/events`, and `/notifications`.
- Added a workspace ownership check to `GET /tasks/:id`; a task in another authorized workspace returns the existing `TASK_NOT_FOUND` response rather than leaking the task.
- Preserved existing status codes, response shapes, mutation behavior, and route contracts outside the authorization/filtering hardening.

## Tests and checks

- `node --check server/app.mjs` — passed after the fix.
- `npm test` — passed: 3 tests passed, 0 failed.
- Direct in-process route check using `createApp` — passed:
  - `GET /health` remains public at the router level.
  - `GET /tasks` without a workspace returns `WORKSPACE_REQUIRED` for a non-service identity.
  - An active member can read only `/tasks?workspace_id=w1` records from `w1`.
  - `GET /tasks/b?workspace_id=w1` does not expose task `b` from `w2`.
  - `/events?workspace_id=w1` returns only `w1` events.
  - A non-member requesting `workspace_id=w2` receives `WORKSPACE_FORBIDDEN`.
- Initial direct harness attempt stopped on the expected `WORKSPACE_REQUIRED` exception because it invoked the router without the HTTP server's error-to-JSON wrapper; the corrected harness captured that expected error and passed.
- Duplicate check confirmed one `requireWorkspaceAccess` import, one observability import, one metrics route, and one body/workspace authorization block remain.

## Remaining risks

- The gamification ledger and related achievement/balance routes do not carry `workspace_id` in their current data model. They now pass through the centralized workspace authorization gate, but their underlying records cannot be workspace-filtered without a contract/data-model change. This remains a follow-up risk for strict tenant isolation.
- Service identities are intentionally allowed to omit `workspace_id`; callers must ensure service credentials are tightly controlled.
- The router-level readiness and metrics branches remain public as configured by the existing app routing. The outer `authorize` behavior is unchanged, so deployment-level exposure still depends on the existing server configuration and token policy.
- There are no dedicated backend route tests in the repository; the route checks above were run as an in-process validation and should be converted into maintained tests in a future change.
