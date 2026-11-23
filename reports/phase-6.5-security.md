# Phase 6.5 Security Review

## Scope

Reviewed `server/workspace-auth.mjs`, `server/auth.mjs`, `server/identity.mjs`, `server/config.mjs`, `server/http.mjs`, `server/app.mjs`, startup wiring, and all API route branches in `server/app.mjs`. Reviewed workspace-bearing contracts and relevant task, knowledge, exam, automation, calendar, notification, agent, and gamification services.

## Findings and disposition

### 1. Object-level cross-workspace mutation (fixed)

The common request gate authorized the request using `body.workspace_id` or the query-string workspace, but several mutation routes looked up the target object globally by ID and did not verify that the object belonged to that authorized workspace. A caller could select an authorized workspace A and submit the ID of a task, knowledge note, exam, or automation from workspace B. This was an IDOR/cross-workspace isolation defect.

Fixed in `server/app.mjs` by requiring object workspace equality before:

- task transition (`POST /tasks/:id/transition`)
- knowledge publication (`POST /knowledge/:id/publish`)
- study-plan creation from an exam (`POST /study-plans`)
- automation execution (`POST /automations/execute`)

Mismatched or absent objects now return the same 404 resource-not-found response, avoiding cross-workspace existence disclosure.

### 2. Gamification ledger cross-workspace reads and corrections (fixed)

Gamification routes previously passed the complete ledger to award, leaderboard, achievement evaluation, correction, and balance operations. The outer workspace authorization did not constrain ledger records, allowing cross-workspace leaderboard/balance disclosure and correction lookup by an ID from another workspace.

Fixed by applying the authorized workspace filter to all gamification ledger operations in `server/app.mjs`.

### 3. Workspace authorization ordering (present after current changes)

The router reads the body and resolves the workspace before route-specific data lookup. For `requireWorkspaceAuth` mode, non-service identities without a workspace receive `WORKSPACE_REQUIRED`, and supplied workspaces go through `requireWorkspaceAccess` before route lookup. Collection GETs use the common `scoped` filter. The task detail route also returns 404 for an object outside the selected workspace.

### 4. Identity and service trust model (residual risk)

`requireWorkspaceAccess` intentionally permits `service` and `local` identities without membership checks. The API token is therefore a global-trust credential, and `allowInsecureLocal=true` creates a local admin-like bypass. These may be appropriate for deployment/integration mode, but must not be enabled or exposed to untrusted clients. `STARGRID_REQUIRE_WORKSPACE_AUTH=false` disables the common workspace gate entirely and should only be usable in a deliberately isolated development environment.

### 5. Remaining route-level authorization gaps (residual risk)

The router authenticates requests but does not apply role-based authorization to sensitive operations; `requireWorkspaceAccess` supports roles, but routes do not request roles. In particular, agent registration/dispatch/selection and gamification award/correction/evaluation rely on membership/workspace filtering but not maintainer/admin/security-reviewer role checks. If the product requires privileged operations, route-specific role requirements should be added.

The gamification award path now filters existing ledger entries by workspace, but it does not verify that `member_id` belongs to an active member record in the requested workspace. An authenticated workspace member could potentially submit an award for an arbitrary member identifier while labeling the event with the authorized workspace. The member-to-workspace invariant should be enforced when member records are available.

`store.achievements` and `store.corrections` are not workspace-bearing records in their current implementation, so new records do not preserve an explicit workspace identifier. Their source ledger operations are filtered, but durable per-workspace reporting/auditing should add workspace identity to these records.

## Changes made

- Added `sameWorkspace` object guard in `server/app.mjs`.
- Added object workspace checks to task transition, knowledge publish, study-plan creation, and automation execution.
- Applied workspace-scoped ledger views to all gamification routes.
- Added `tests/phase-6.5-security.test.mjs` with adversarial cross-workspace task-transition and study-plan/exam tests.

## Verification

- `npm test`: passed, 5 tests, 0 failures.
- `npm run format:check`: passed.
- `npm run check`: failed because the repository checker’s broad `sk-[A-Za-z0-9]` regex matches the existing source word `tokens` in `server/app.mjs` (reported as `sk-s`). This is a checker false positive, not a credential. The newly added test token was changed to avoid introducing another such match.

## Artifacts

- Security report: `reports/phase-6.5-security.md`
- Regression tests: `tests/phase-6.5-security.test.mjs`
- Security fixes: `server/app.mjs`
