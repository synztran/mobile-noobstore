# Report: Manage existing and generated invoices in admin

## Tóm tắt

Chưa triển khai. Task được đánh dấu `[!]` vì yêu cầu chỉnh sửa/lưu invoice template không xác định được cơ chế lưu tương thích; hiện chỉ tìm thấy PDF generator và bucket `invoices` hiện có. Tự chọn persistence hoặc sửa generation có thể ảnh hưởng hóa đơn đã tạo, vượt mức an toàn khi không có xác nhận thiết kế.

## Files đã thay đổi

- `TASKS.md` — đánh dấu task đầu tiên chưa hoàn thành thành `[!]` theo quy trình night-worker.
- `.night-runs/2026-11-25/manage-existing-and-generated-invoices-in-admin/REPORT.md` — báo cáo lý do dừng.
- `.night-runs/2026-11-25/manage-existing-and-generated-invoices-in-admin/evidences/typecheck.log` — log type-check.
- `.night-runs/2026-11-25/manage-existing-and-generated-invoices-in-admin/evidences/build.log` — log build.
- `.night-runs/2026-11-25/manage-existing-and-generated-invoices-in-admin/evidences/diff.stat` — snapshot diff stat.

## Kết quả kiểm chứng

- Build: PASS — `evidences/build.log`.
- Type-check: FAIL do lỗi có sẵn ngoài phạm vi hóa đơn, gồm `.next/types/app/(admin)/gacha/page.ts` (export `THEMES`), `crawling`, `vendors`, `orders/[id]`, `warehouse-sync`, và unused functions ở web email service — `evidences/typecheck.log`.
- Chưa có test invoice listing/storage/template vì chưa triển khai.

## Lưu ý cho Reviewer

- `apps/admin/src/lib/invoice.ts` tạo PDF, lưu bucket public `invoices` theo key `<orderNumber>.pdf`, và cập nhật `orders.invoice_url`.
- Middleware hiện bảo vệ admin APIs bằng xác thực session và role `admin`.
- Không có API/page invoice hay cơ chế template lưu trữ riêng được tìm thấy.
- Cần quyết định rõ nơi lưu template và ý nghĩa áp dụng (chỉ invoice mới hay cả regenerate) trước khi triển khai để không làm đổi format các hóa đơn hiện hữu ngoài ý muốn.
