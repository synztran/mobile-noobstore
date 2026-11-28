# Báo cáo: Diagnose and fix requests that hang during page rendering

## Tóm tắt

Thêm giới hạn 5 giây và fallback có log rõ tên dependency cho hero campaigns và flash-sale banner, hai truy vấn không thiết yếu được chờ trong các Suspense boundary trang chủ. Thời gian render trang không còn phụ thuộc vô hạn vào hai truy vấn này.

Không xác định được root cause cụ thể của báo cáo 12% refresh stall: chưa tái hiện stall bằng browser/request trace, và không có bằng chứng hai truy vấn trên là request gây stall. Các rail sản phẩm khác cũng có Suspense fallback, nhưng chưa được instrument trong phạm vi này. Task được đánh dấu `[!]` thay vì tuyên bố đã xử lý triệt để.

## Files đã thay đổi

- `apps/web/src/app/(main)/page.tsx` — áp dụng fallback wrapper cho dữ liệu hero/banner.
- `apps/web/src/lib/home-render-data.ts` — race timeout 5 giây, fallback và log lỗi.
- `apps/web/src/lib/home-render-data.test.ts` — regression test cho dependency treo.
- `TASKS.md` — đánh dấu `[!]`, do root cause stall chưa được chứng minh.

## Kết quả kiểm chứng

- Build: PASS — `evidences/build.log`.
- Type-check: FAIL do `.next/types` tham chiếu các module auctions không tồn tại; không có lỗi mới trong code sửa — `evidences/typecheck.log`.
- Regression test: NOT RUN; `vitest` không cài/khả dụng trong workspace admin/web invocation (`command not found: vitest`).
- Aikido scan: PASS, zero issues trên ba file source/test đã sửa.
- Diff stat: `evidences/diff.stat` (source diff only; report and task status recorded afterward).

## Lưu ý cho Reviewer

- Kiểm tra thủ công bằng browser/network trace để xác định chính xác request giữ progress ở 12%; hiện chưa chứng minh root cause.
- 5 giây là giới hạn cho hai dữ liệu không thiết yếu; lỗi được log phía server và fallback, không áp dụng cho auth/checkout.
- Có thể cần bổ sung timeout/fallback cho một data path khác sau khi xác định được request thực sự bị treo.
