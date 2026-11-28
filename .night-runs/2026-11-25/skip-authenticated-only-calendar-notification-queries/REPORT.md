# Báo cáo

## Tóm tắt

Các request lịch điểm danh, phần thưởng điểm danh và danh sách thông báo chỉ chạy sau khi auth loading hoàn tất và user đã đăng nhập. Lịch check-in hiển thị skeleton khi auth đang tải, lời nhắc đăng nhập khi signed-out. Query notification xóa cache khi user đổi hoặc đăng xuất để tránh hiển thị thông tin người dùng trước.

## Files đã thay đổi

- `apps/web/src/modules/checkin/ui/CheckinCalendar.tsx` — đợi trạng thái auth và chỉ fetch dữ liệu cá nhân khi có user.
- `apps/web/src/modules/checkin/ui/CheckinHomeTeaser.tsx` — không query trong lúc auth loading hoặc signed-out.
- `apps/web/src/lib/react-query/notification/api/useNotificationQueries.ts` — yêu cầu auth cho query và xóa notification cache khi danh tính đổi.
- `apps/web/src/components/notifications/NotificationCenter.tsx` — truyền auth gate vào hook.
- `apps/web/src/modules/desktop/ui/notifications/DesktopNotificationsDrawer.tsx` — truyền auth gate vào hook.
- `TASKS.md` — đánh dấu task hoàn tất.

## Kết quả kiểm chứng

- Pass — `yarn workspace @noobstore/web type-check`; log: `evidences/web-typecheck.log`.
- Pass — `yarn workspace @noobstore/web build`; log: `evidences/build.log`.
- Fail ngoài phạm vi — `yarn type-check` workspace vướng lỗi có sẵn ở admin/warehouse; log: `evidences/typecheck.log`.
- Thống kê diff: `evidences/diff.stat`.

## Lưu ý cho Reviewer

- Kiểm tra thủ công đăng xuất/đổi tài khoản trong lúc drawer thông báo đang mở để xác nhận cache cũ không còn hiển thị.
- API authorization không thay đổi; check-in rewards chưa bị tắt ở các consumer khác, vì route rewards hiện vẫn được dùng theo cách hiện tại.
