# Report

## Tóm tắt
Giới hạn prompt thông báo ở desktop (`max-w-md`), căn giữa và đặt cách đáy 24px. Mobile giữ nguyên full-width có gutter 16px và vị trí hiện tại.

## Files đã thay đổi
- `apps/web/src/components/notifications/PushNotificationPrompt.tsx` — thêm giới hạn/căn giữa/khoảng cách desktop cho wrapper.
- `TASKS.md` — đánh dấu đúng task đã xử lý `[x]`.

## Kết quả kiểm chứng
- Pass — `evidences/typecheck.log` (`yarn workspace @noobstore/web type-check`).
- Pass — `evidences/build.log` (`yarn workspace @noobstore/web build`).
- Thống kê diff — `evidences/diff.stat`.

## Lưu ý cho Reviewer
- Cần kiểm tra thủ công tại viewport mobile và desktop, cũng như thao tác subscribe/dismiss; môi trường hiện tại không có browser UI để xác nhận trực quan.
