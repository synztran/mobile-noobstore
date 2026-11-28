# Night-worker report: Disable the mobile-device recommendation popup

## Tóm tắt

Removed `MobileViewportGuard` from the root layout, so the recommendation popup no longer renders on desktop or mobile. Other viewport/layout behavior and unrelated warnings remain unchanged. Updated the task status to `[x]`.

## Files đã thay đổi

- `apps/web/src/app/layout.tsx` — removed the dynamic guard import and render.
- `TASKS.md` — marked the completed task `[x]`.

## Kết quả kiểm chứng

- **Build: Pass** — `evidences/build.log` (exit code `0`); web app compiled and all 58 static pages generated.
- **Workspace type-check: Fail (pre-existing unrelated errors)** — `evidences/typecheck.log` (exit code `1`). Workspace task failed on numerous admin errors, including `THEMES` export, unused declarations, and missing `vendors` table types. No errors reported for the changed `apps/web/src/app/layout.tsx`.
- Diff summary: `evidences/diff.stat`.

## Lưu ý cho Reviewer

- The guard is no longer mounted; the standalone component remains untouched and may still have another consumer.
- Manual visual check is recommended on desktop/mobile to confirm popup absence and normal layout. Automated build passed; no browser test exists for this task.
- Type-check result is blocked by existing workspace/admin errors unrelated to this change.
