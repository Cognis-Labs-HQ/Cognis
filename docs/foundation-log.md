# Cognis Foundation Log

> Purpose: Track early outputs, non-negotiable conventions, and architecture decisions that define what makes Cognis *Cognis*.

## 2026-04-10 — Session 2 (Core Definition Pass)

### Product identity: what is essential to Cognis
Cognis is not only an API with a web UI. Cognis is a **modular language-learning + SNS platform** with these core capabilities:

1. **Identity & community graph**
   - User profiles, tutor/student relationships, classrooms, and social interactions are first-class domain objects.
2. **Language learning system**
   - In-built learning materials, lesson pathways, and study activities.
3. **Learning progress intelligence**
   - Track learner state, progress history, mastery signals, and classroom/tutor visibility.
4. **Composable UI experience**
   - A default UX exists, but the interface is assembled from movable/replaceable modules (Jira-like composition concept).

These capabilities must remain clear and contributor-friendly even when optional modules are disabled.

---

## Non-negotiable architecture conventions (project-wide)

### Convention C1 — Modular core + extension modules
- Build a stable **application core** and load feature extensions through explicit module contracts.
- Extensions can be enabled/disabled without destabilizing core runtime behavior.
- Core must never directly depend on one specific external provider implementation.

### Convention C2 — Contract-first boundaries
- Every integration seam uses a contract/interface in core and adapters in modules.
- Minimum seams to define from the beginning:
  - Auth providers
  - Storage backends
  - UI module registration
  - Study activity types
  - Notification/event delivery

### Convention C3 — Language-agnostic domain modeling
- Cognis cannot assume a single language (even if Japanese is initial content focus).
- Content, exercises, and progress models must carry language metadata and language-specific extension points.
- Any page or study type must be designed so additional languages can be introduced without schema rewrites.

### Convention C4 — Convention over one-off fixes
- If a needed pattern does not exist, define and document a reusable convention instead of implementing isolated one-off behavior.
- New modules should follow shared naming, registration, and lifecycle conventions.

### Convention C5 — Self-hosted by default
- Container-first deployment is mandatory.
- Local path-based file storage is default; cloud/object storage is optional via adapters.

---

## Core domain surfaces (v1 foundation)

### A. Profile & community surface
- User profile model (identity, preferences, locale, avatar/media references).
- Role model (student, tutor, admin, classroom-owner/manager).
- Classroom model and membership lifecycle.
- Social graph primitives (follow, mentor linkage, classroom feed participation).

### B. Learning content surface
- Course/unit/lesson hierarchy.
- Study activity taxonomy (flashcards, quizzes, writing tasks, listening tasks, etc.).
- Language-specific content attributes separated from shared metadata.

### C. Progress tracking surface
- Attempt history and outcomes.
- Per-skill/per-topic progress aggregates.
- Tutor/classroom views for learner progress and interventions.

### D. UI composition surface
- Page shells and default layouts are provided by core.
- Feature modules contribute UI widgets/panels/routes through a registry contract.
- Users/admins can rearrange components where allowed by policy.

---

## UI system direction (Jira-inspired composition)

### UI-1: Default layout + pluggable components
- Each major page has a sensible default layout.
- Layouts are composed from registered components (cards, panels, activity widgets, feed blocks).

### UI-2: Module-provided UI packages
- A module can ship:
  - API endpoints
  - domain services
  - UI components
  - default page layout contributions
- Cognis core ingests module metadata and mounts contributions via registry.

### UI-3: Stable contracts for contributors
- Module authors must target a documented UI contract (props, capabilities, permissions, data dependencies).
- Breaking changes require a versioned contract strategy.

---

## Auth and identity extension strategy

All three auth extensions are equal-priority optional modules:
- LDAP (FreeIPA-style environments)
- SAML (Authentik-style environments)
- OAuth/OIDC SSO (Google, Microsoft, X, etc.)

### Auth convention
- Core owns user/session/account-linking abstractions.
- Providers implement adapters and can be toggled on/off independently.
- Disabling a provider must not alter unrelated domain behavior.
- Inspiration model: app-style optional integration ecosystem (similar mechanism philosophy to Nextcloud app modularity).

---

## Storage strategy

### Storage-1: Default behavior
- Use local path-based file storage backend by default (simple self-host setup).

### Storage-2: Gateway abstraction from day one
- Core only depends on a storage gateway contract.
- Local filesystem and S3-compatible backends are adapters behind the same contract.
- Domain services must not embed backend-specific assumptions.

### Storage-3: Migration-friendly design
- Object identifiers and metadata modeling should not assume a single storage backend forever.

---

## Updated stack direction (still provisional)
- Runtime/language: Node.js + TypeScript.
- Repository structure: monorepo with explicit `core` and `modules` boundaries.
- API: modular backend framework (NestJS favored for structure; Fastify-compatible runtime profile considered).
- Web UI: React/Next.js-based shell with pluggable component registry.
- Database: SQL abstraction supporting SQLite, MySQL/MariaDB, PostgreSQL.
- Cache/queue: optional Redis module.
- Testing: enforce coverage growth alongside features (unit + integration + key e2e).
- Operations: Docker-first self-host baseline plus admin CLI tool.

---

## Immediate next outputs to produce
1. Module manifest convention (`module.json`/equivalent) and lifecycle states.
2. Core interface contracts for auth, storage, and UI registry.
3. Initial domain schema draft for profiles, classrooms, learning units, and progress.
4. Contributor conventions doc for naming, module boundaries, and extension safety rules.

---

## 2026-04-10 — Session 3 (Open-source readiness + structure planning)

### Suggestions to align Cognis with strong open-source projects

1. **Explicit governance from day zero**
   - Add `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, support policy, and maintainer response-time expectations.
2. **Versioned public contracts**
   - Treat module APIs, auth/storage contracts, and extension points as versioned interfaces.
3. **Golden-path developer onboarding**
   - One command to run local stack; one command to run tests/lint/typecheck; one command to scaffold a new module.
4. **Strict compatibility matrix**
   - Document supported DB engines/versions, Redis optionality, and minimum runtime versions.
5. **Architecture Decision Records (ADRs)**
   - Promote major decisions from this log into ADR files with status (proposed/accepted/superseded).
6. **Observability baseline**
   - Structured logs, health checks, metrics, and trace hooks before large feature growth.
7. **Migration discipline**
   - Require schema/data migrations and rollback notes for every breaking data change.
8. **Extension safety model**
   - Define module permissions/capabilities to avoid unrestricted plugins.

### Questions to answer before scaffolding code directories

#### Product and domain
- Q1: Is classroom content primarily tutor-authored, platform-authored, or both?
- Q2: Should learner progress be private by default, tutor-visible by default, or classroom-visible by default?
- Q3: Do we need direct messaging in v1, or only classroom/feed interactions?

#### API and platform contracts
- Q4: Should API versioning start at `/api/v1` now, even pre-1.0?
- Q5: Do you want OpenAPI-generated SDKs as a first-class deliverable?
- Q6: Should module contracts be considered stable only after a declared `beta` milestone?

#### Module ecosystem (Nextcloud-style inspiration)
- Q7: Should modules be distributed as npm packages, local folders, or both?
- Q8: Should we support hot enable/disable at runtime, or only restart-time activation initially?
- Q9: Do you want a signed-module trust model in scope, or postpone to later?

#### Data and storage
- Q10: Are DB-specific features acceptable, or must we stay within strict cross-database SQL portability?
- Q11: Should file storage metadata live in DB with immutable IDs from day one?
- Q12: Is user-generated media moderation/audit logging required in v1?

#### Auth and identity
- Q13: Should local username/password always remain available as break-glass admin auth?
- Q14: Do you need SCIM/provisioning in scope, or only interactive login providers?
- Q15: Should auth modules map users into roles automatically using external group claims?

#### Open-source operations
- Q16: Preferred license posture for contributions (inbound = outbound, CLA, or DCO)?
- Q17: Minimum CI gates for merge (lint, typecheck, unit, integration, security scan)?
- Q18: Do you want long-term support branches eventually, or mainline-only at first?

### Candidate directory structure options to choose from

#### Option A — Monorepo with strict layering (recommended)
- `apps/api` (HTTP API + module host)
- `apps/web` (React/Next shell)
- `packages/core` (domain + contracts; no framework coupling)
- `packages/modules/*` (official feature modules)
- `packages/adapters/*` (db/auth/storage provider adapters)
- `packages/sdk` (generated client SDKs)
- `tooling/cli` (`cognisctl` / OCC-style utility)
- `docs/adr` (decision records)

#### Option B — Service-oriented split (later-scale friendly)
- Separate deployable services for identity, learning, social, progress.
- Higher complexity now; likely overkill for initial phase.

#### Option C — App-first compact layout
- Faster initial coding, but extension boundaries are easier to blur.

Recommendation: Start with **Option A** and enforce boundaries with lint/build rules.

---

## 2026-04-10 — Session 4 (Decisions locked from Q&A)

### Locked structural decisions
1. **Monorepo stays, with `ui/` as a top-level root**
   - Keep core/runtime and UI in same repository, but split by roots for clarity.
2. **API versioning starts at `/api/v1`**
   - Applies immediately, even in early releases.
3. **Database strategy = adapter-driven portability**
   - SQLite, MySQL/MariaDB, PostgreSQL adapters implement Cognis data contracts.
4. **Module activation API required**
   - Module enable/disable exposed via API.
   - Hot enable/disable allowed for non-core modules only.
   - Core modules are protected from hot toggle by classification filter.

### Product boundary clarification
- Messaging and classroom-social interactions are **social features**, not language-content features.
- Classroom abstraction:
  - Represents teacher-user + language teaching relationship.
  - Student-teacher-language relationship is many-to-many.

### Language/content governance model
- Content is language-plane scoped, not classroom-scoped.
- Visibility workflow:
  1. User personal content (private repertoire).
  2. Teacher language-class content (visible to current students in that language).
  3. Submission/review workflow for global visibility.
  4. Admins can add/curate global content directly.

### Progress privacy defaults
- Learner progress visibility is user-controlled privacy setting.
- Default visibility: learner + current tutors.
- Optional expansion up to globally visible.

### API/docs/sdk decision
- Prioritize API documentation and discoverability.
- Defer SDK generation as non-priority for initial build.

### Module delivery and install model
- Support both installation paths:
  1. **Compile-time/local path modules** in designated module directories.
  2. **ZIP upload pipeline** for runtime installation via API (UI can follow later).
- Keep module trust/signing deferred, but design extension metadata so trust policy can be added later.

### Storage/media decision update
- Media can be deferred for initial milestone.
- Default profile visuals may use generated initials/avatar placeholders.
- Storage gateway abstraction remains mandatory for future backend flexibility.

### Auth baseline decisions
- First-run setup must create a local admin account.
- Local admin login remains available as break-glass access.
- Auth providers should expose role/admin mapping hooks; use is module-configurable.
- SCIM/provisioning deferred (not in initial scope).

### CI/release posture
- CI gates accepted: lint, typecheck, unit, integration, security scan.
- Branch/runtime support policy remains lightweight initially; CI controls container build triggers.

### Clarification: module contract definition
A **module contract** in Cognis means the versioned interface a module must satisfy to integrate safely, including:
- lifecycle hooks (`install`, `enable`, `disable`, `uninstall`),
- declared capabilities/permissions,
- configuration schema,
- API/UI contribution manifests,
- compatibility metadata (`core_api_version`, module version bounds).

### Recommended policy choice: DCO vs CLA
- **DCO** (Developer Certificate of Origin): contributors sign-off commits (`Signed-off-by`) asserting rights to contribute. Lightweight, OSS-friendly.
- **CLA** (Contributor License Agreement): legal agreement signed by contributors, higher admin overhead.

Recommendation: start with **DCO** for lower friction, and add CLA later only if legal/commercial needs demand it.

### Next implementation milestone
Scaffold directory tree and baseline contracts using the locked decisions above.

---

## 2026-04-10 — Session 5 (Gap check + implementation sequence)

### Gap check: missing information identified

The foundation is strong, but the following specs are still missing and should be created before major feature coding:

1. **Canonical module classification spec**
   - Required enum and rules for `core` and `extension` modules.
   - Needed for hot-toggle restrictions and safety enforcement.
2. **Module manifest schema (machine-validated)**
   - JSON schema for module metadata, compatibility, capabilities, and lifecycle hooks.
3. **Gateway error contract**
   - Standard error model (codes, categories, retryability, user-safe messages).
4. **Permission/ACL matrix**
   - Exact role/capability matrix for student/tutor/admin/module actions.
5. **Content review workflow states**
   - Formal state machine for personal → submitted → approved/rejected → global.
6. **Audit/event model**
   - Event taxonomy for module actions, auth events, content moderation, and admin operations.
7. **Configuration precedence model**
   - Define resolution order (env, file, DB, module defaults) and override semantics.
8. **Migration/backward compatibility policy**
   - Required compatibility windows and deprecation process for contracts.

### Implementation directive (accepted)
Build gateways/adapters first, then expose API endpoints that issue explicit intent to core services without embedding backend assumptions.

### Architecture rule: explicit intent endpoints + gateway execution
- HTTP/API handlers express **what** operation is requested.
- Core application services enforce policy and orchestrate workflows.
- Gateways/adapters perform **how** operations are executed (DB/files/auth provider specifics).
- No controller/endpoint may call provider-specific SDKs directly.

### Initial gateway set to implement first
1. **Database gateway**
   - Contract for CRUD/query intents needed by core domain repositories.
   - Adapters: SQLite, MySQL/MariaDB, PostgreSQL.
2. **File storage gateway**
   - Contract for put/get/delete/list/signed-access semantics.
   - Adapter 1: local path backend.
   - Adapter 2: S3-compatible backend interface scaffold (can remain stubbed initially).
3. **Auth provider gateway**
   - Contract for login/challenge/callback/account-link/role-mapping hooks.
   - Adapters: local auth core; LDAP/SAML/OIDC as optional modules.
4. **Module runtime gateway**
   - Contract for install/enable/disable/uninstall/list/health.
   - Enforce module classification restrictions.

### Endpoint design conventions (to apply from first API)
- Keep request/response DTOs explicit and versioned under `/api/v1`.
- Endpoints should map to business intents (`publishContent`, `enrollLearner`, `setProgressVisibility`) rather than storage verbs.
- Every endpoint returns stable error envelopes mapped from gateway error contracts.
- Add idempotency semantics for mutating operations where retries are expected.
- Include audit event emission for privileged or state-changing actions.

### Suggested first endpoint wave (after contracts exist)
1. `POST /api/v1/modules/:id/enable`
2. `POST /api/v1/modules/:id/disable`
3. `POST /api/v1/content/submit`
4. `POST /api/v1/content/:id/review`
5. `POST /api/v1/progress/visibility`
6. `GET /api/v1/system/health`

### Next milestone output list (code-focused)
1. Scaffold directories for `core`, `ui`, `modules`, `adapters`, and `tooling/cli`.
2. Add TypeScript interfaces for DB/file/auth/module gateways.
3. Add local path file adapter and one SQL adapter as the reference implementation pattern.
4. Add API skeleton with `/api/v1` routes wired to core service interfaces only.
5. Add test harness for contract tests (gateway conformance) and endpoint behavior.

---

## 2026-04-10 — Session 6 (Scaffold kickoff accepted)

### Confirmed from latest instruction
- Module distinction simplified: `core` vs `extension` only.
- ACL priority reduced to baseline `user` vs `admin` for now.
- Module manifest format: JSON.
- Gateway/adapters remain the primary flexibility mechanism.

### Kickoff output created
- Repository scaffold initiated with roots for `api`, `core`, `adapters`, `modules`, `ui`, and `tooling/cli`.
- Initial gateway interfaces and reference adapters introduced.
- API v1 skeleton routes added to enforce intent-first endpoint conventions.

---

## 2026-04-11 — Session 7 (Implementation pass: gateways, adapters, docs center)

### Delivered
- Added mature component documentation under `docs/components/*` with a central index intended for UI docs center rendering.
- Added docs API endpoints:
  - `GET /api/v1/docs`
  - `GET /api/v1/docs/:slug`
- Completed SQL gateway adapter implementations for MariaDB, PostgreSQL, and SQLite.
- Kept module model simplified to `core` and `extension`.
- Added initial automated test coverage for core service behavior, docs route behavior, file adapter behavior, memory DB adapter, and SQL adapters.

### Notes
- API handlers remain intent-first and adapter-agnostic.
- Teacher-specific ACL remains deferred; current ACL matrix is baseline user/admin.
