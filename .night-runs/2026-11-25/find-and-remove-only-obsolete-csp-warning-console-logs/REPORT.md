# Report: Find and remove only obsolete CSP-warning console logs

## Tóm tắt

Không sửa source. Search chính xác không tìm thấy thông báo `Applying inline style violates the following Content Security Policy directive` trong source/scripts của ứng dụng. CSP ở `apps/web/src/middleware.ts` là `Content-Security-Policy-Report-Only`; reporter `apps/web/src/app/api/security/csp-report/route.ts` chỉ log `[csp-report] violation` cùng directive đã sanitize. Vì vậy chuỗi cảnh báo cụ thể nhiều khả năng do browser tạo ra khi báo vi phạm CSP, không phải `console.log` của ứng dụng. Không có log redundant thuộc ứng dụng để xóa; không được tắt/suppress CSP.

Không tái hiện browser CSP hiện tại trong phiên này, nên đánh dấu `[!]` để ghi nhận phần reproduction còn thiếu thay vì kết luận chắc chắn nguồn runtime.

## Files đã thay đổi

- `TASKS.md` — đánh dấu task `[!]`; không tìm thấy app-owned log phù hợp để xóa.
- `.night-runs/2026-11-25/find-and-remove-only-obsolete-csp-warning-console-logs/REPORT.md` — kết quả điều tra và trạng thái kiểm chứng.
- `.night-runs/2026-11-25/find-and-remove-only-obsolete-csp-warning-console-logs/evidences/*` — log tìm kiếm, build/typecheck/lint/tests và diff stat.

## Kết quả kiểm chứng

- Search exact message: không có match — `evidences/exact-message-search.log`.
- Search CSP và logging sources: `evidences/csp-source-search.log`, `evidences/application-logging-search.log`.
- Web typecheck: pass — `evidences/typecheck.log`.
- Web build: pass — `evidences/build.log`.
- Unit tests: pass — `evidences/tests.log`.
- Web lint: blocked/fail bởi `next lint` tương tác, yêu cầu cấu hình ESLint — `evidences/lint.log`.
- `git diff --stat`: `evidences/diff.stat`.

## Lưu ý cho Reviewer

- Xác nhận bằng browser với CSP hiện hành và devtools console/network rằng warning là browser-generated; thử cả tình huống có/không phát sinh inline-style violation.
- CSP hiện được gửi dạng Report-Only; reporter đang giữ log sanitized vi phạm để quan sát. Không xóa log đó hoặc thay đổi CSP chỉ để ẩn cảnh báo.
- Lint chưa chạy được không tương tác do Next.js 15 `next lint` mở prompt cấu hình ESLint.
