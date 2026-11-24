# Task Report: Repair variants search switching and loading feedback

## Tóm tắt
Đã sửa `VariantsHeader` (`apps/admin/src/components/variants/VariantsHeader.tsx`) để tìm kiếm theo product/variant chuyển đổi ngay lập tức khi có văn bản đã nhập, URL được đồng bộ (`q`/`by`/`page`), thêm indicator loading dạng accessible, đồng thời xuất logic tham số URL ra `apps/admin/src/lib/variants-search-params.ts` với test regression (5 test case).

## Files đã thay đổi
- `apps/admin/src/components/variants/VariantsHeader.tsx` — input/select được kiểm soát (controlled) với `key={searchBy}` (remount khi chuyển field → text khớp với field đang chọn); `useTransition` để expose `isPending` → hiển thị `Loader2` animate-spin + `role="status"` `aria-live="polite"`; xóa `page` khi query/field thay đổi (reset về trang 1).
- `apps/admin/src/lib/variants-search-params.ts` — `buildVariantsSearchParams`: set `q` khi khác rỗng, xóa khi rỗng; set `by` khi truyền, giữ nếu bỏ qua; luôn xóa `page`.
- `apps/admin/src/lib/variants-search-params.test.ts` — test 5 case: variant→product, product→variant, typing query, xóa query, xóa page lỗi thời.
- `TASKS.md` — đổi `[ ]` → `[x]` task này.

## Kết quả kiểm chứng
- Admin typecheck (`yarn type-check`): exit 2 — chỉ có lỗi bên ngoài thay đổi (vendors/crawling/warehouse-sync/gacha, `../web/src/lib/email/email.service.ts`); 0 lỗi liên quan đến `VariantsHeader`/`variants-search-params`. Log: `.night-runs/2026-11-25/repair-variants-search-switching/evidences/typecheck.log`
- Vitest (target): 5/5 pass — `evidences/vitest.log`
- Vitest (full admin suite): 19/21 file pass; 2 failed file là **pre-existing** (xác nhận qua `git stash -u` trên cây sạch): `src/lib/verified-payments.test.ts` (ENOENT migration `158_verified_order_payments.sql`), `src/app/api/fees/route.test.ts` (mock call timing) — không liên quan. Log: `evidences/vitest-all.log`
- Admin build (`yarn build`): exit 0. Log: `evidences/build.log`
- Diff stat: `evidences/diff.stat`

## Lưu ý cho Reviewer
- Phần loading indicator chỉ là icon spinner + `role="status"`/`aria-busy` — cần manual check trên browser để xác nhận hiện/ẩn đúng trong quá trình navigation delayed.
- Có thể cần manual verify URL có đúng `q`/`by`/page sau khi switch.
- 2 lỗi typecheck/vitest ở trên thuộc dự án hiện tại và không ảnh hưởng scope task này; không sửa để tránh scope creep.
