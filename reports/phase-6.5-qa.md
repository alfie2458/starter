# Phase 6.5 QA Report

## Scope

Established executable QA coverage for JavaScript syntax, unit behavior, API integration, workspace authorization, cross-workspace isolation, agent quota, agent fallback, and JSON persistence. Product/runtime behavior was not changed. No commit, push, deployment, deletion, or repository-admin action was performed.

## Repository conventions inspected

- `package.json` uses Node's built-in test runner: `node --test`.
- Existing tests are ESM `.test.mjs` files under `tests/` and use `node:test` plus `node:assert/strict`.
- Existing Phase 6.5 security tests cover task transition and study-plan cross-workspace isolation.
- The new test follows those conventions and is located at `tests/phase-6.5-qa.test.mjs`.

## Changes made

Added `tests/phase-6.5-qa.test.mjs` with six deterministic tests:

1. Recursively discovers repository JavaScript modules in `server`, `engines`, `packages`, `scripts`, and `tests`, then runs `node --check` for each.
2. Verifies `requireWorkspaceAccess` permits an active GitHub workspace member and rejects a non-member with `WORKSPACE_FORBIDDEN`.
3. Starts the actual HTTP server from `createApp`, verifies service identity behavior, workspace-scoped task listing, hidden cross-workspace task detail, and blocked cross-workspace transition without mutation.
4. Verifies quota reservation and commitment, then rejects a request exceeding the agent TPM limit with `QUOTA_EXCEEDED`.
5. Verifies dispatcher fallback after provider invocation failure, including release of the failed agent's quota reservation and commitment of the fallback reservation.
6. Verifies missing-file JSON-store fallback, concurrent queued saves, valid reload, and newline-terminated JSON output.

No package scripts or product source files were modified.

## Commands and exact results

- `npm test` — **passed**: 11 tests passed, 0 failed, 0 skipped. This includes the two existing Phase 2 contract tests, two existing Phase 6.5 security tests, and six new QA tests (plus the existing contract count totals reported by Node as 11 tests).
- `npm run format:check` — **passed**: `format check passed`.
- `npm run check` — **blocked by an existing repository check failure** before the new QA work could pass the check: `Error: Potential secret pattern in reports/phase-6.5-security.md` from `scripts/check-repository.mjs`. This report was already present in the working tree and was not modified by this task.
- The syntax test itself ran `node --check` successfully for every discovered `.mjs` file.

## Findings

- The repository has executable coverage for all requested QA areas after adding the new test module.
- Service identities are intentionally allowed to omit `workspace_id` by the existing `workspace-auth` contract; the API integration test verifies this documented behavior while separately asserting workspace-scoped isolation when a workspace selector is supplied.
- Cross-workspace task detail and transition requests return HTTP 404 and do not mutate the hidden task.
- Agent fallback correctly releases quota for a failed primary invocation and commits quota for the successful fallback.
- JSON persistence queues concurrent writes per file and reloads the final queued value correctly.
- Existing `npm run check` currently flags `reports/phase-6.5-security.md`; this is an environment/repository baseline issue rather than a failure in the new tests.

## Remaining risks

- The API-level test uses a service bearer token, so it does not exercise the live GitHub identity HTTP lookup path. Direct workspace authorization behavior is covered with a deterministic unit test; a future integration test could mock the GitHub API through an injectable identity provider.
- The existing gamification data model lacks `workspace_id`, so strict tenant filtering for those records remains a product/data-contract follow-up documented in the backend report.
- Agent dispatch quota and fallback are covered at the orchestration unit level; provider/network retry behavior is outside this test module.
- `npm run check` remains red until the pre-existing secret-pattern finding in `reports/phase-6.5-security.md` is addressed or explicitly allowlisted.
