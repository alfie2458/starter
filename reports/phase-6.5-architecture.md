# STARGRID 3.0 Phase 6.5 Architecture Assessment

**Repository:** `/tmp/starter-empty`  
**Assessment date:** 2026-11-23  
**Role:** Architecture Agent  
**Scope:** Compare the actual repository implementation, contracts, server wiring, engine READMEs, roadmap and phase specifications. No GitHub administration, commit, push, deployment, or destructive operation was performed.

## Executive assessment

The repository is a coherent Phase 1–6.5 platform skeleton with working pure-domain modules, a minimal authenticated HTTP API, JSON persistence, workspace filtering, event/audit primitives, retry/dead-letter primitives, and regression tests. It is **not production-ready** and the roadmap is generally honest about that status.

Overall status is **partial**: the main capability boundaries exist, but most are fixtures or process-local primitives rather than complete product capabilities. The highest-risk gaps are the absence of a real durable database/broker and multi-instance consistency, lack of production backup scheduling and restore evidence, incomplete release/security governance, missing formal GitHub OAuth/session and member administration, and mock-only AI/agent execution. There are also implementation inconsistencies where documents promise event/audit or workspace guarantees that the HTTP routes do not fully provide.

## Evidence and verification performed

- Read: `README.md`, `docs/roadmap.md`, `docs/phase-1.md` through `docs/phase-7.md`, `docs/api.md`, `docs/open-issues.md`, ADR, engine READMEs, database READMEs, contracts, server code, workflows, security policy, and prior Phase 6.5 reports.
- `npm test`: **passed, 14 tests, 0 failures**.
- `npm run format:check`: **passed**.
- `node scripts/check-repository.mjs`: **failed** on `reports/phase-6.5-security.md`; the scanner's broad `sk-[A-Za-z0-9]` pattern matches text in that existing report. This is a repository hygiene failure regardless of whether the match is a real credential.
- JavaScript syntax checking: **passed** as part of the test suite.
- No live GitHub administration API check was possible from the repository itself. GitHub status below therefore distinguishes repository evidence from the status recorded in the project documentation.

## Capability matrix

| Capability | Status | Evidence | Assessment |
|---|---|---|---|
| GitHub Organization / invitation membership | **Missing / partial** | `engines/identity/src/policy.mjs`, `packages/contracts/member.schema.json`, `database/members/invitation-policy.example.yaml`, `server/workspace-auth.mjs` | Invitation and member record primitives exist, but there is no member/invitation HTTP API, accept/revoke/suspend lifecycle, GitHub OAuth callback/session, Organization/Team sync, or offboarding reconciliation. Docs state the repository has only owner `alfie2458`, no Organization/Team. |
| Shared collaboration permissions | **Partial** | `server/workspace-auth.mjs`, centralized gate in `server/app.mjs`, identity policy | Active GitHub member checks and service/local exceptions work; cross-workspace collection/detail/mutation checks are tested. However, route-level roles are not enforced for sensitive operations, service bearer tokens are global trust, and member management is absent. Gamification records and achievement/correction records lack complete workspace identity in the data model. |
| AI Knowledge Publisher | **Partial** | `engines/ai-knowledge/src/provider.mjs`, `engines/knowledge/src/publisher.mjs`, knowledge contract, `/knowledge/drafts` and publish routes | Candidate status/provenance/confidence and `needs_review` state are implemented. The provider boundary deliberately throws `KNOWLEDGE_PROVIDER_NOT_CONFIGURED`; server routes directly create drafts and do not invoke a real provider, source extraction/screening, revision/rejection workflow, reviewer authorization, or UI. `publishKnowledgeNote` permits either `draft` or `needs_review` without proving human review. Draft/publish mutations do not append an explicit audit event. |
| Unified Exam Planner | **Partial** | `engines/exam-planner/src/planner.mjs`, exam/study-plan contracts, `/exams`, `/study-plans` | Exam creation preserves uncertainty and a study-plan generator retains `planner_version`, source reference and slots. There is no upload/content extraction pipeline, confirmed/manual override lifecycle, continuous replanning, locking/protection of confirmed dates, persistence beyond memory/JSON, or notification integration. `/exams` creation has no runtime contract validator and no explicit audit/event publication. |
| Task / Calendar / Automation | **Partial** | task, calendar, automation engines; routes in `server/app.mjs`; contracts | Task state machine, input validation, workspace filtering, idempotent automation runs, allowlisted trigger/action types, calendar UTC/timezone fields, and local notification/calendar adapters exist. Calendar adapter is `local_only`; no provider OAuth/sync cursor/rate-limit handling. Automation runs synchronously inside HTTP, with no scheduler, worker, cancellation, timeout enforcement around actions, operator replay, or durable queue. Task creation does not append/publish the documented `task.created` coordination event; calendar creation and notification enqueue append audit directly but do not publish all documented cross-engine events. |
| Shared Agent resource pool | **Partial** | agent registry/quota/dispatcher/scheduler, agent contract, `/agents/*` | Capability selection, priority, mock dispatch, fallback, quota reserve/settle, credential-shaped output redaction, and invocation audit exist. Execution is explicitly `execution_mode: mock` and no real model adapter, timeout, provider error taxonomy, cost/RPM accounting, job worker, durable reservation ledger, or output safety policy exists. `rpm_limit` is stored but not enforced. Registry selection is global; workspace ownership is optional and selection/dispatch does not constrain candidates to the requested workspace, which may be intentional for a shared pool but lacks explicit governance/role policy. Agent registration is not restricted to maintainer/admin roles. |
| Gamification | **Partial / inconsistent** | ledger, achievements, anti-abuse, leaderboard, contracts, routes | Append-like award records, duplicate ID checks, daily point limits, corrections, achievement evaluation, leaderboard and balance operations exist. They are in-memory/JSON and not transactionally durable. Routes do not fully preserve workspace scope on achievement/correction records; `member_id` is not verified as belonging to an active member in the requested workspace. No versioned operational rules store, moderation/freeze/unfreeze workflow, paginated/time-scoped/privacy-aware leaderboard, or reward notification exists. |
| GitHub security governance | **Partial / inconsistent** | `.github/workflows/*.yml`, `SECURITY.md`, `CODEOWNERS`, roadmap and phase docs | Workflow action references are pinned to immutable SHAs and workflow token permissions are minimal. Repository policy is not controlled by code: docs record `allowed_actions: all`, `sha_pinning_required: false`, no branch protection due plan limitation, no confirmed Organization/Teams, and no verified Secret Scanning, Push Protection, Dependabot, CodeQL, fork policy, or production Environment reviewers. `CODEOWNERS` names one owner only. The repository check currently fails on a false-positive-like secret pattern in an existing report. |
| Backups / restore | **Partial** | `scripts/backup-json-store.mjs`, `scripts/restore-json-store.mjs`, `packages/shared/src/json-store.mjs`, phase docs | Atomic JSON writes, checksum sidecars, retention parameter, and restore copy script exist. There is no configured schedule, immutable/offsite storage, encryption/key management, integrity validation during restore, restore drill evidence, RPO/RTO acceptance, backup monitoring, or database backup strategy. This is suitable as a development primitive only. |

## Detailed findings by architecture area

### 1. Identity, Organization and invitation membership

**Implemented:** `inviteMember` validates GitHub user/workspace and allowlisted roles; `requireWorkspaceAccess` rejects non-members for GitHub identities; member and invitation-policy schemas/documentation exist. The QA tests exercise active-member authorization and non-member rejection.

**Missing:** There are no routes or services to create, accept, activate, revoke, suspend, remove, or list members. No OAuth/GitHub App callback, session storage, token rotation, revocation, or GitHub team synchronization exists. The only actual identity modes are a static bearer service token, an insecure local bypass when explicitly enabled, or a live GitHub `/user` lookup using a caller bearer token. The repository's own documents report only owner `alfie2458` and no Organization/Team.

**P0:** Formal login/session/token lifecycle and administrator-controlled role/workspace management are required before claiming production identity or tenant authorization.  
**P1:** Organization/Team synchronization, offboarding revocation, multiple maintainers, and production secrets/environments remain outstanding.

### 2. Shared collaboration and authorization

**Implemented:** The common request path reads the workspace selector before data-route lookup. Collections use `scoped`; task detail, task transition, knowledge publication, study-plan creation, and automation execution check object workspace equality. Existing adversarial tests cover task transition and cross-workspace study-plan access.

**Partial/inconsistent:** `requireWorkspaceAccess` supports role checks, but no route passes a required role. A workspace member can therefore reach agent registration, dispatch/selection, gamification award/correction/evaluation, and other sensitive mutations without maintainer/admin policy. Service identities bypass membership and can omit workspace; this is a global-trust credential model. Gamification records lack a consistent workspace field, making strict tenant filtering dependent on filtered input rather than durable record invariants. There are no member-admin routes or audit trail for permission changes.

### 3. Knowledge and AI Publisher

The contracts correctly retain source ID, publisher kind/version/confidence and review-capable statuses. The domain function routes uncertain/low-confidence drafts to `needs_review`. This is a sound boundary, but not a completed publisher product. `KnowledgeProvider` is only an abstract/unconfigured adapter; no source fetch, document sanitization, prompt-injection boundary enforcement at runtime, provider timeout/cost/quota controls, reviewer queue, reject/revise operation, or human reviewer role enforcement exists. The server's `/knowledge/drafts` takes already-structured body content, so the actual ingestion pipeline is outside the implementation.

A notable governance inconsistency is that `publishKnowledgeNote` accepts `needs_review` directly and only checks for an actor, not evidence that a human reviewer with appropriate role approved the note. Publication also does not call `appendAudit` or publish a `knowledge.published` event.

### 4. Exam Planner and unified planning

The planner handles basic exam metadata and transforms available slots into review/exam-prep items with planner version and source reference. The schema includes `confirmed` and `canceled` states, but the route/domain does not expose a confirmation/override lifecycle, protect confirmed exam dates, or reconcile planner changes. Exam creation only checks a few fields and does not invoke the shared JSON-schema validator. There is no source upload/extraction, date/scope confidence workflow, calendar conflict detection, automatic update, notification, or durable plan query/update API.

### 5. Task, Calendar, Automation and History

Task validation and state transitions are the strongest implemented API area. Atomic JSON persistence and workspace guards work under the tested single-process assumptions. Automation uses allowlisted triggers/actions and idempotency keys. However, the architecture remains request-bound and process-local:

- `createAutomationExecutor.execute` runs action loops during the HTTP request and records a run in an in-memory ledger.
- No schedule worker consumes `schedule` triggers.
- Timeout is validated but not enforced around action execution.
- No cancellation, persistent execution state, queue drain, replay endpoint, or dead-letter management API exists.
- Calendar and notification adapters are local-only queues; no email/push delivery status, provider OAuth, sync cursor, timezone normalization tests, or external deduplication exists.
- Task creation uses `createTask` but does not append a `task.created` event, despite Phase 6 documentation saying task events are coordinated and history-consumed. Calendar creation likewise does not publish the corresponding coordination event.
- History has append-only audit helper/consumer but no query pagination, retention, masking, or production event store.

### 6. Agent resource pool and orchestration

The registry, scheduler and dispatcher are intentionally provider-independent. They correctly avoid returning common credential-shaped fields and record redacted attempt metadata. The dispatcher releases failed reservations before trying a compatible fallback.

The implementation does not satisfy the production Agent Pool specification: `invoke` is supplied by the route as a fixture returning `{execution_mode: 'mock', provider_kind: 'mock'}`; there is no real model/provider adapter, prompt/model/provider version record, timeout/cancellation, provider safety filter, cost ledger, RPM enforcement, or durable job/result store. Quota reservation is an array mutation and is not transactionally safe across processes or crashes. A registry entry can be global (`workspace_id: null`) and selection ignores workspace, while registration has no role gate; shared-pool governance is therefore underspecified.

### 7. Gamification

The ledger is append-oriented and supports duplicate IDs, daily limits and negative correction entries. Achievement and leaderboard domain functions are present. The contract requires workspace ID, but route-level records and achievement/correction objects do not consistently retain it. More importantly, the API accepts an arbitrary `member_id` and does not verify member/workspace ownership. There is no transactional ledger, reconciliation, rule-management service, moderation workflow, privacy setting, pagination/time window, or event-driven reward notification.

### 8. GitHub security and collaboration governance

The workflows have good local properties: actions are SHA-pinned, `permissions: {}` is set at workflow level, jobs request only `contents: read`, and no deployment or production secret use is present. `SECURITY.md` documents safe handling and fork restrictions. This is a code baseline, not proof of repository settings.

The roadmap and phase documents explicitly record unresolved governance: no branch protection, repository Actions allow-all, SHA pinning not required by platform policy, no confirmed security-analysis settings, no production Environment reviewer, one CODEOWNER, and no Organization/Team. These must be treated as **inconsistent if any README wording implies security is complete**: local SHA pinning is not equivalent to repository policy enforcement, and policy documents are not execution evidence.

### 9. Backups and restore

`saveJsonStore` queues writes per file and uses temp-file rename. The backup script copies the JSON file, writes a SHA-256 sidecar, and applies a local retention count. The restore script atomically renames a copied backup into place. No scheduler invokes backup, and no test demonstrates a real backup/restore drill, corruption detection, offsite/immutable retention, encryption, RPO/RTO, or service-consistent snapshot. The README correctly calls JSON storage unsuitable for high-concurrency production.

## P0 gaps blocking production claims

1. **Durable data and event consistency:** Replace process-local/JSON stores and local Event Bus with a transactional database plus durable broker/outbox/inbox, cross-process locking, replay and consumer isolation. This affects tasks, plans, knowledge, automation runs, quota, gamification and audit.
2. **Production identity and authorization:** Implement OAuth/GitHub App sessions, token rotation/revocation, member/invitation lifecycle, role-enforced routes, tenant invariants, offboarding, and service-credential isolation.
3. **Production agent/AI safety boundary:** Add real provider adapters with timeout/error/cost/quota controls, prompt/input redaction, output safety, provider allowlist and durable job/result handling. Until then all agent dispatch remains mock.
4. **Backup/recovery evidence:** Schedule backups, use immutable/offsite protected storage, validate checksums on restore, run documented restore and migration/rollback drills, and prove RPO/RTO.
5. **Release and operations governance:** Add production Environment approvals, migration gates, rollback, metrics/tracing backend, dashboards, SLOs, alert routing and on-call runbook.
6. **Phase 7 test gate:** Add integration/worker/migration/E2E, concurrency/failure-injection, auth/tenant-isolation, prompt-injection, replay and data-leak tests; current 14-test suite is useful regression coverage but not a release gate.

## P1 gaps

- GitHub Organization/Team synchronization, branch protection, Actions allowlist/SHA policy, Secret Scanning, Push Protection, Dependabot, CodeQL and fork PR policy must be verified and enabled where plan permits.
- Complete Knowledge review/rejection/revision UI and audit; source ingestion, deduplication, provenance and rights/deletion policy.
- Exam confirmation/manual override, continuous planner updates, calendar conflict handling and exam notifications.
- Worker-backed automation scheduling/cancellation/retry/DLQ replay and real notification/calendar providers.
- Agent RPM enforcement, managed fallback/circuit breaker, usage/cost reporting and role-gated registry changes.
- Gamification workspace-aware records, member ownership validation, rules version management, moderation and reversible correction/reconciliation workflows.
- History query/pagination/retention/masking and complete event publication for documented Task/Calendar/Exam/Agent/Gamification chains.
- Fix repository secret scanner false positive or narrow its matching strategy without weakening actual secret detection; `npm run check` must be green.
- Remove duplicate entries in `.env.example` (`STARGRID_IDENTITY_MODE`, workspace-auth, service identity, timeout and backup settings are repeated).

## Recommended sequencing

1. Close identity/role/tenant invariants and define the production threat model.
2. Select the durable database, broker, outbox/inbox and migration strategy; implement one end-to-end reliable chain (Task → Event → History) before broadening features.
3. Establish backup/restore and release gates before migrating more state.
4. Integrate real AI and external adapters behind explicit provider contracts and worker boundaries.
5. Add administrator/worker APIs and UI, then complete Phase 7 security, concurrency, recovery and end-to-end acceptance.

## Final classification

- **Implemented baseline:** contracts, pure domain primitives, authenticated minimal API, basic workspace guards, task validation/transitions, allowlisted automation validation, local adapters, agent registry/quota/fallback primitives, gamification primitives, atomic JSON writes, local backup/restore scripts, workflow SHA pinning.
- **Partial:** every requested product capability in its production form; especially membership/governance, Knowledge Publisher, Exam Planner, Task/Calendar/Automation, Agent Pool, Gamification, security governance and backups.
- **Missing:** live GitHub Organization/team/invitation administration, real AI/provider execution, durable production database/broker, background workers, production observability/alerting, scheduled immutable backup/restore drills, frontend/admin workflows, and release approvals.
- **Inconsistent:** documentation's event/history expectations versus missing task-created/calendar coordination publications; review-required publication without reviewer authorization; local action SHA pinning versus repository policy; contract workspace fields versus gamification/achievement/correction runtime records; `npm run check` versus the existing report's secret-like text.

The repository should remain labeled alpha/core baseline and must not be called production-ready until the P0 list and Phase 7 acceptance evidence are complete.
