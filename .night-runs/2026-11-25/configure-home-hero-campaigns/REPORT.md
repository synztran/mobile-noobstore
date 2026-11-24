# Báo cáo: Configure home hero campaigns for mobile and desktop

## Tóm tắt
Không triển khai được: đây là task thay đổi giao diện và cần thiết kế được duyệt trước khi code. Công cụ hỏi xác nhận báo lỗi do phiên chạy không tương tác. Task được đánh dấu `[!]` để phản ánh blocker, không tự suy diễn phê duyệt.

## Files đã thay đổi
- `TASKS.md` — chuyển đúng task đầu tiên đang `[ ]` thành `[!]`.
- `.night-runs/2026-11-25/configure-home-hero-campaigns/evidences/diagnosis.log` — ghi nhận blocker và code/schema đã kiểm tra.

## Kết quả kiểm chứng
- Chưa chạy typecheck/build vì không có thay đổi source để kiểm chứng.
- Chẩn đoán: `evidences/diagnosis.log`.
- `evidences/diff.stat`: chưa tạo do không có diff source; trạng thái repo có nhiều thay đổi không liên quan từ trước nên không dùng `git diff --stat` để quy kết thay đổi cho task này.

## Lưu ý cho Reviewer
Cần duyệt thiết kế rồi chạy lại task. Schema hiện có chỉ có `image_url` và các trường text dùng chung; cấu hình mobile/desktop cần migration tương thích ngược, cập nhật cả admin API/editor lẫn web query/renderer. Không có thao tác database nào được chạy.
