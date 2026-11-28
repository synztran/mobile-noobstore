# Mid-man tracking workflow

⚠️ **Database Migration Required**

- Apply `supabase/migrations/171_mid_man_case_tracking.sql` before using `/mid-man`.
- Adds `mid_man_cases` and `mid_man_case_audit`; enables RLS and denies browser-role access. No existing table or data is modified.
- Adds `create_mid_man_case` and `transition_mid_man_case` service-role-only RPCs. No funds are held, transferred, released, or refunded; statuses are administrative tracking labels only.
- Migration was not applied to a database in this run. Regenerate Supabase TypeScript types after deployment if desired; endpoint access uses the established typed-client escape hatch for new schema.

## Tóm tắt

Built first admin mid-man workflow as a tracking-only prototype: create a case for two distinct contacts, record agreed terms and amount, list/detail cases, transition through pending/funded-held/released/refunded/disputed, and append operator/timestamp audit entries. State transition and audit write are atomic. Does not link orders because repository order ID model is inconsistent across legacy migrations/current code; does not claim escrow/payment custody.

## Files đã thay đổi

- `apps/admin/src/app/(admin)/mid-man/page.tsx` — admin page.
- `apps/admin/src/components/mid-man/MidManClient.tsx` — case creation/list/detail/lifecycle UI with tracking-only warning.
- `apps/admin/src/app/api/mid-man/route.ts` — admin-protected list/create API.
- `apps/admin/src/app/api/mid-man/[id]/route.ts` — admin-protected detail/transition API.
- `apps/admin/src/lib/mid-man-workflow.ts` — validation and transition matrix.
- `apps/admin/src/lib/mid-man-workflow.test.ts` — validation and lifecycle unit tests.
- `apps/admin/src/components/layout/AdminLayout.tsx` — navigation link.
- `supabase/migrations/171_mid_man_case_tracking.sql` — isolated schema, RLS, audit and atomic RPCs.
- `TASKS.md` — task marked `[!]` because verification incomplete.

## Kết quả kiểm chứng

- **Build: Pass** — `.night-runs/2026-11-25/build-first-mid-man-transaction-workflow-safely/evidences/build.log`.
- **Typecheck: Fail (pre-existing workspace issues)** — `.night-runs/2026-11-25/build-first-mid-man-transaction-workflow-safely/evidences/typecheck-final.log`. Reported errors are in gacha, crawling, vendors, orders, warehouse-sync and web email service; no mid-man diagnostics.
- **Focused tests: Not run** — `.night-runs/2026-11-25/build-first-mid-man-transaction-workflow-safely/evidences/tests.log`; admin workspace has no `vitest` executable.
- **Diff stat** — `.night-runs/2026-11-25/build-first-mid-man-transaction-workflow-safely/evidences/diff.stat`.
- Migration/local DB and manual UI lifecycle verification not completed.

## Lưu ý cho Reviewer

- Apply migration only to a disposable/local DB first; inspect function grants and row-level policies before deployment.
- Verify admin authorization and origin protections manually for all API methods.
- Test concurrent conflicting status updates and audit rows after migration.
- Product copy intentionally says “tracking”; `funded_held`/`released` labels do not represent actual custody or movement of money.
- Before production use, decide policy for reversing a disputed case; terminal released/refunded states currently cannot be changed.

## Nguyên nhân đánh dấu `[!]`

Task verification did not fully pass: repository-wide typecheck fails on unrelated existing code, focused tests cannot execute because the package is unavailable, and no local database/UI environment was used. Build passes. No commit created. Existing unrelated working-tree changes were preserved.
