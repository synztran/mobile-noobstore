# Báo cáo: Research and add verified keyboard documentation resources

## Tóm tắt

Thêm mục tài nguyên keyboard vào `/documents`, với liên kết Qwertykeys cho NEO và trang tải Singa; tách riêng firmware QMK cộng đồng. Foxlab, Daji và Mersiri được ghi rõ chưa xác minh và không có liên kết tải. Ghi nhận ngày kiểm tra 2026-11-25, nguồn/loại tài nguyên và caveat tương thích; không mirror tệp.

## Files đã thay đổi

- `apps/web/src/components/community/KeyboardResources.tsx` — danh sách nguồn đã xác minh và chưa xác minh, có liên kết ngoài và cảnh báo model/PCB.
- `apps/web/src/app/(main)/documents/page.tsx` — render mục tài nguyên trước feed tài liệu hiện có.
- `TASKS.md` — đánh dấu task hoàn tất `[x]`.

## Kết quả kiểm chứng

- Typecheck: FAIL toàn workspace do lỗi sẵn có ở admin (`apps/admin` gacha/crawling/vendors/warehouse-sync và email service; xem `evidences/typecheck.log`). Web typecheck không báo lỗi trước khi Turbo dừng.
- Build: đang chạy lại sau khi kết quả lần đầu chưa kịp hoàn tất; log `evidences/build.log`.
- Diff stat: `evidences/diff.stat`.
- Nguồn: tìm kiếm web xác nhận trang Qwertykeys mô tả NEO firmware/JSON/build guides và trang Singa liệt kê firmware/plate/misc theo model; QMK repository nêu hardware cụ thể cho firmware cộng đồng. Fetch trực tiếp bị lỗi transport nên khả năng truy cập từng URL chưa được kiểm tra bằng HTTP trong môi trường này.

## Lưu ý cho Reviewer

- Cần mở từng liên kết trên browser và xác nhận nội dung hiện hành.
- Không có nguồn xác minh cho Foxlab/Daji/Mersiri trong lượt nghiên cứu này; không hiển thị chúng như nguồn đã xác minh.
- UI cần kiểm tra responsive/accessibility thủ công trên `/documents`.
