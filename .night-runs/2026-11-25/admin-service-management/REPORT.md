# Night-worker Report — Admin service management

## Tóm tắt

Đã bổ sung UI tạo service, POST endpoint với validation giá/thời gian/slug và role admin; siết validation cập nhật service, option ordering và boolean; bảo vệ các mutation service config/option/option value bằng kiểm tra admin. Có test create service cho validation, duplicate slug, và authorization.

Task được đánh dấu `[!]` thay vì `[x]` vì kiểm chứng không pass đầy đủ; chưa commit.

## Files đã thay đổi

- `apps/admin/src/app/api/services/route.ts` — endpoint tạo service, kiểm tra admin, required fields, số không âm, slug uniqueness, audit log.
- `apps/admin/src/app/api/services/[id]/route.ts` — kiểm tra admin, slug duplicate, boolean nghiêm ngặt.
- `apps/admin/src/app/api/service-configs/route.ts` — role check cho upsert config, validate boolean.
- `apps/admin/src/app/api/service-options/route.ts`, `apps/admin/src/app/api/service-options/[id]/route.ts` — role check và display order nguyên không âm.
- `apps/admin/src/app/api/service-option-values/route.ts`, `apps/admin/src/app/api/service-option-values/[id]/route.ts` — role check mutation values.
- `apps/admin/src/components/services/ServicesClient.tsx`, `apps/admin/src/components/services/EditServiceModal.tsx` — thêm luồng create tái dùng modal edit và validation inline.
- `apps/admin/src/app/api/services/route.test.ts` — test create, input sai, slug trùng, không đăng nhập/non-admin.
- `TASKS.md` — chuyển task đầu tiên từ `[ ]` sang `[!]` do kiểm chứng fail.

## Kết quả kiểm chứng

- **Build: PASS** — [`evidences/build.log`](evidences/build.log)
- **Type-check: FAIL (baseline/repo-wide)** — [`evidences/typecheck.log`](evidences/typecheck.log). Lỗi hiện hữu tại generated gacha types, crawling, vendors, orders và web email; không thấy lỗi trực tiếp ở service files.
- **Focused tests: BLOCKED** — [`evidences/tests.log`](evidences/tests.log). Vitest config workspace hiện include `apps/web/src/**/*.test.ts`, nên không phát hiện test ở admin.
- **Diff stat** — [`evidences/diff.stat`](evidences/diff.stat)
- **Security review:** Aikido initial scan phát hiện `max_entries` âm; endpoint và modal đã được cập nhật để từ chối giá trị âm. Không thể rerun scanner trong cùng review job.

## Lưu ý cho Reviewer

- Cần chạy test route mới bằng test harness/config có include `apps/admin/src/**/*.test.ts`; hiện repository không expose cấu hình admin-specific.
- Cần kiểm tra thủ công create/edit service, option/value persistence và role behavior với session admin/customer.
- Typecheck vẫn bị chặn bởi lỗi repo ngoài phạm vi; cần sửa baseline riêng rồi chạy lại để có thể hoàn tất task.
- Chưa xác nhận duplicate slug race case ngoài unique constraint DB (endpoint vẫn xử lý lỗi `23505` nếu schema có constraint).
