# Report: Investigate blocked Google Analytics script behavior

## Tóm tắt

- Đã xác định cấu hình GA dùng `next/script` tải `https://www.googletagmanager.com/gtag/js?id=...` trong `apps/web/src/components/ui/GoogleAnalytics.tsx`.
- Component chỉ render khi có Measurement ID, consent bằng `accepted`, và `isTrackingEnabled()` trả true. `isTrackingEnabled()` tắt tracking nếu opt-out `NEXT_PUBLIC_TRACKING_ENABLED=false` hoặc runtime không phải production.
- CSP report-only trong `apps/web/src/middleware.ts` cho phép script `https:` và có `strict-dynamic`; không thấy cấu hình chặn riêng Google Tag Manager. CSP hiện là Report-Only, không enforcement.
- `ERR_BLOCKED_BY_CONTENT_BLOCKER` chỉ ra request bị chặn phía browser (thường extension/content blocker), không phải bằng chứng app CSP gây chặn. Không thể xác nhận extension cụ thể hoặc kiểm tra trạng thái script bằng browser runtime trong môi trường này.
- Không thêm handler rỗng: Next.js script load failure không được xử lý tùy tiện; hiện không có uncaught app error nào được xác nhận. Không bypass blocker.
- Task được đánh dấu `[!]` vì thiếu bài kiểm tra browser với script cho phép/bị chặn và kiểm tra consent thực tế.

## Files đã thay đổi

- `TASKS.md`: đánh dấu task `[!]` do chưa thể hoàn thành kiểm thử browser bắt buộc.
- `.night-runs/2026-11-25/investigate-blocked-google-analytics-script-behavior/REPORT.md`: báo cáo kết quả và giới hạn.
- Source code không còn thay đổi.

## Kết quả kiểm chứng

- **PASS** — `yarn workspace @noobstore/web type-check`; log: `evidences/typecheck.log`.
- **PASS** — `yarn workspace @noobstore/web build`; log: `evidences/build.log`.
- `evidences/diff.stat`: diff ban đầu khi kiểm tra; đã bỏ thay đổi source thử nghiệm trước khi kết thúc.
- **CHƯA XÁC MINH** — chạy browser với GA script allowed và blocked; chưa thể quan sát uncaught errors hoặc xác nhận GA chỉ initialize sau consent trong runtime.

## Lưu ý cho Reviewer

- Trong browser sạch, chưa cài extension, xác nhận request `gtag/js` thành công sau khi chấp thuận consent.
- Trong browser có blocker (hoặc DevTools Request Blocking cho `googletagmanager.com`), xác nhận request bị chặn, trang vẫn render và không có uncaught runtime error.
- Xác nhận chưa chấp thuận consent thì request GA không được phát sinh; kiểm tra cả `NEXT_PUBLIC_TRACKING_ENABLED=false` và môi trường non-production.
- Không có thay đổi production vì chưa có runtime failure cụ thể để sửa.
