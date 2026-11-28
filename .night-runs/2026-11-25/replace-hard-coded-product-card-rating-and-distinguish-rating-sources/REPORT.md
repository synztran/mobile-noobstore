# Report: Replace hard-coded product rating

## Tóm tắt

Thay badge rating cố định `4.9 (28 đánh giá)` bằng aggregate `average` và `total` từ review API hiện có. Badge chỉ xuất hiện sau khi request thành công và có review; sản phẩm chưa có review không hiện badge. Query lỗi được giữ là lỗi thay vì giả lập trạng thái không có review.

## Files đã thay đổi

- `apps/web/src/modules/products/ui/product/ProductView.tsx` — dùng `useReviews(product.slug)` và hiển thị aggregate thực.
- `apps/web/src/lib/react-query/review/api/useReviewQueries.ts` — throw khi API trả lỗi để phân biệt lỗi với aggregate rỗng.
- `TASKS.md` — đánh dấu task `[x]`.

## Kết quả kiểm chứng

- Pass — `yarn workspace @noobstore/web type-check`; log: `evidences/typecheck.log`.
- Pass — `yarn workspace @noobstore/web build`; log: `evidences/build.log`.
- Diff stat: `evidences/diff.stat`.
- Không tìm thấy test component/review aggregate phù hợp hiện có; không thêm test phụ thuộc vào UI harness không được cấu hình.

## Lưu ý cho Reviewer

- Badge và phần đánh giá dùng cùng endpoint `/api/products/[slug]/reviews`; API đã tính average 1 decimal và total từ review rows.
- Network/error state không hiện badge. Empty state không hiện badge.
- Cần xác nhận thủ công trên sản phẩm có review, không review, và endpoint lỗi nếu muốn kiểm tra UI thực tế.
