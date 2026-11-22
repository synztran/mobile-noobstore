# Aikido High/Critical Findings Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce the current Aikido high/critical findings for `mobile-noobstore` without deleting application features or treating scanner alerts as confirmed vulnerabilities before reviewing their evidence.

**Architecture:** First remove or neutralize exposed credentials and review each Aikido finding's concrete evidence. Handle dependency advisories in an isolated dependency-change task, and address application data exposure/path traversal in focused server-side changes with regression tests. Rescan the repository after changes; scanner status is verification, not the sole security proof.

**Tech Stack:** Yarn 4 workspaces, Next.js 15 App Router, Supabase SSR/admin clients, GitHub Actions, Vitest, Aikido repository scanner.

**Spec:** Aikido repository `https://app.aikido.dev/repositories/3869572`; current findings observed in UI on 2026-11-22. Plan only; no fixes authorized/implemented yet.

## Global Constraints

- Do not remove user-facing application features solely to silence a finding.
- Before adding/upgrading a package, obtain explicit owner approval; state each affected package in bold, proposed version, reason, and compatibility risks.
- Never print or copy secret values into plans, comments, logs, or test fixtures.
- Treat `NEXT_PUBLIC_*` values as public browser configuration, not secrets.
- Verify whether a credential is live, revoke/rotate it at its provider, and only then remove it from tracked history/current files; deleting a file alone does not revoke a credential.
- Preserve existing uncommitted work and keep the unrelated cache-fix branch/stash untouched.

## Review Focus

- Gift-card codes act as redeemable secrets: unauthenticated metadata/HTML must not reveal points, note, recipient, or card state; tests must cover anonymous and authenticated page/API behavior.
- Invoice font lookup accepts only fixed internal filenames: traversal or absolute paths must not permit reading arbitrary host files; test traversal, encoded traversal, and valid fonts.
- CI must remain reproducible after pinning actions/removing scripts; test workflow syntax and retain cache/install/test behavior.
- Public RUM configuration may be intentionally visible: determine from Aikido evidence whether it is a public project token or a privileged credential before rotating/removing it.
- Dependency remediation must preserve supported Node/Next/OpenNext/Vite build combinations; run workspace type-check/build and lockfile validation after approved changes.

---

## Findings in Scope

Observed in Aikido UI (all marked New):

- Critical: Next.js vulnerable third-party component.
- Critical: Vite improper encoding/escaping.
- High: `sharp` vulnerable third-party component.
- High: sensitive information exposure in `apps/admin/src/lib/invoice.ts` and `apps/web/src/app/gift-card/[code]/page.tsx`.
- High: one exposed secret reported in `BetterStackRUM.tsx`.
- High: `powershell-utils` OS command injection (transitive dependency).
- High: hard-coded credentials in `scripts/sync_supabase.sh`.
- High: unpinned third-party GitHub Actions in `.github/workflows/ci.yml`.
- High: path traversal in `route.ts`, `invoice.ts`, and four additional locations; exact locations/evidence not yet inspected.

The user requested dropping the script-related findings by removing the code. Plan: remove the credential-bearing Supabase sync script after checking callers/docs, and eliminate `powershell-utils` via an approved dependency-tree remediation or by removing the nonessential package introducing it. Pin CI actions by immutable commit SHA. Do not remove the deployment workflow or required build/test scripts.

## File Map

- `scripts/sync_supabase.sh`: remove after checking references; credential rotation remains a provider-side operational action.
- `apps/web/src/components/ui/BetterStackRUM.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/.env.example`, `.github/workflows/deploy-production.yml`: make RUM token/config public only if Aikido evidence confirms it is a public ingest identifier; otherwise remove/reconfigure and rotate.
- `apps/web/src/app/gift-card/[code]/page.tsx`, related gift-card APIs, and their tests: stop public server-rendered disclosure of redeemable card data; retain authenticated, owner-scoped reveal/redeem behavior.
- `apps/admin/src/lib/invoice.ts` and `apps/admin/src/lib/invoice.test.ts` (or existing invoice tests): constrain font file resolution to known static font paths and prevent path escape.
- Exact additional path-traversal files: identify from Aikido issue detail before editing; add per-route validation/containment tests in existing test locations.
- `apps/web/package.json`, `apps/admin/package.json`, `apps/warehouse/package.json`, `yarn.lock`: approved compatible dependency updates/removal; no manifest/lockfile changes before explicit package approval.
- `.github/workflows/ci.yml`: pin all third-party `uses:` references to verified full commit SHAs, retaining current workflow steps.

## Tasks

### Task 1: Confirm issue evidence and exact affected paths

**Files:** No source changes. Record issue detail/identifier and evidence for each issue in the PR/task notes (do not record secret values).

- [ ] Open each Critical/High issue in Aikido; record advisory IDs, affected package/version/range and dependency path for Next.js/Vite/sharp/powershell-utils.
- [ ] For sensitive-data and path-traversal findings, capture exact source line, source-to-sink/data-flow and attacker preconditions. Identify all six reported path-traversal locations.
- [ ] Determine whether the BetterStack value is a public RUM project token or a privileged API token; if privileged, treat as compromised and rotate.
- [ ] Check `rg -n 'sync_supabase\.sh|Supabase Sync|SOURCE_REF|TARGET_DB_PASS'` across tracked docs/workflows/scripts to discover callers and instructions before deletion.
- [ ] Deliverable: evidence-backed finding matrix; do not proceed with speculative code deletion or dependency edits where evidence is ambiguous.

### Task 2: Remove credential-bearing sync script and remediate credential

**Files:** Delete `scripts/sync_supabase.sh`; modify docs only where they reference this script.

- [ ] Search all tracked call sites and docs. Confirm no CI/deploy workflow invokes this manual cross-project data migration.
- [ ] Coordinate rotation/revocation of the embedded target database credential with the owner/provider; confirm no replacement secret is added to the repository.
- [ ] Delete the script and remove obsolete usage documentation; retain unrelated `scripts/` commands.
- [ ] Verify `rg -n '8qVLx7v6mxtpfufn|TARGET_DB_PASS'` finds no credential value (search output must not echo actual value; search for variable name/pattern instead where practical) and no stale script reference remains.
- [ ] Check git history exposure and advise owner that deletion does not erase prior commits; history rewrite only with explicit authorization.

### Task 3: Resolve dependency advisories (approval gate)

**Files:** Workspace package manifests and `yarn.lock`, only after approval.

- [ ] Map each reported advisory to the locked version and transitive dependency path, including why `powershell-utils` is installed. Check whether a patched version exists and whether a parent dependency update removes it.
- [ ] Request package-change approval with each affected package in **bold**, proposed version, reason, and Next.js/OpenNext/Vite compatibility risks. Do not edit manifests/lockfile until approved.
- [ ] Upgrade the smallest set of affected direct dependencies to patched compatible releases; avoid resolutions/overrides unless Aikido evidence and Yarn dependency graph require them.
- [ ] If `powershell-utils` remains only through an unused optional dependency, remove that parent only after proving it is unused and after approval; otherwise take the safe patched upstream version.
- [ ] Verify `yarn install --immutable`, `yarn type-check`, relevant workspace tests, and production builds for web/admin/warehouse.

### Task 4: Review and fix gift-card sensitive disclosure

**Files:** `apps/web/src/app/gift-card/[code]/page.tsx`, related API routes if required by evidence, new/updated gift-card route tests.

- [ ] Add regression coverage showing anonymous request/metadata does not disclose card value, note, recipient/owner, redemption state, or other redeemable data. Confirm public link behavior needed by the product with the owner if unclear.
- [ ] Return non-sensitive metadata for share previews and require authenticated user plus owner/issued-to match for any private card details; keep current redemption authorization rules intact.
- [ ] Check logs, response bodies, page source/RSC payload, Open Graph metadata and cache headers so secret card data is not exposed indirectly or cached publicly.
- [ ] Run focused gift-card tests and relevant web type-check.

### Task 5: Fix path traversal locations

**Files:** `apps/admin/src/lib/invoice.ts`, invoice tests, and the four additional files identified in Task 1 with their colocated tests.

- [ ] Add failing tests for `../` traversal, URL-encoded traversal, absolute paths, separator variants, and valid in-root files for each affected source-to-file-read path.
- [ ] For invoice fonts, replace caller-derived path joining with a fixed allowlist of known font basenames/paths; reject anything outside that set before filesystem access.
- [ ] For other locations, validate identifiers at the boundary and resolve paths against a fixed root; require the resolved candidate to remain inside the root before reading.
- [ ] Keep existing auth checks and response behavior for valid resources; avoid revealing filesystem paths/errors to clients.
- [ ] Run each focused test, admin/web type-check, and `git diff --check`.

### Task 6: Triage BetterStack RUM value

**Files:** `apps/web/src/components/ui/BetterStackRUM.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/.env.example`, `.github/workflows/deploy-production.yml`, as indicated by Task 1 evidence.

- [ ] If public RUM token: document explicitly that it is an ingest/public identifier, configure through `NEXT_PUBLIC_*` only if deployment variable is confirmed, and mark/allowlist as non-secret in Aikido with evidence. Do not claim confidentiality.
- [ ] If privileged token: rotate at Better Stack, remove from client bundle, move use server-side, and ensure no old value remains in current build/config; review exposure history.
- [ ] Test RUM disabled/enabled behavior without asserting or logging token contents; verify production build does not embed privileged credentials.

### Task 7: Pin CI actions

**Files:** `.github/workflows/ci.yml`.

- [ ] Pin each `uses: owner/repo@tag` to a verified full 40-character commit SHA; add a concise inline comment naming the release tag.
- [ ] Preserve checkout, setup-node, cache, and test semantics; avoid unrelated workflow changes.
- [ ] Validate YAML and inspect each SHA/release mapping against the upstream action repository; run CI-equivalent checks locally where practical.

### Task 8: Final validation and rescan

**Files:** No additional changes except fixes revealed by verification.

- [ ] Run focused tests for gift cards, invoice/path traversal, then `yarn type-check`, `yarn test:unit`, and workspace builds for all apps.
- [ ] Review `git diff --check`, `git status`, and the complete diff; ensure no unrelated/stashed user work entered the branch.
- [ ] Push/PR only after the dependency approval and credential rotation gates are satisfied.
- [ ] Trigger or inspect a fresh Aikido scan on the target branch; verify fixed findings are no longer present and document any remaining finding with rationale/evidence. Do not mark unresolved findings fixed merely because their source file was deleted.

## Spec Coverage Self-Review

- All nine observed findings are addressed by a task: dependency findings (Task 3), sensitive information (Tasks 4 and 6), OS-command package/script credential (Tasks 2 and 3), workflow pinning (Task 7), and path traversal (Task 5).
- Evidence ambiguity is explicitly gated in Task 1, avoiding speculative removal of the RUM integration or user-facing gift-card feature.
- Secret rotation is an operational prerequisite, not something code deletion can accomplish; no provider-side change is implied or performed by this plan.
- Package upgrades are approval-gated per repository instructions.
