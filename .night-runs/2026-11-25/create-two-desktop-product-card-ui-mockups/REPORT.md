# Report — Create two desktop product-card UI mockups

## Tóm tắt

Tạo hai mockup HTML độc lập với cấu trúc desktop khác nhau: thẻ ảnh-led dạng build bench và layout editorial ba vùng ảnh/thông tin/giá. Thêm README hướng dẫn preview; dữ liệu sản phẩm ghi rõ là minh họa. Không thay đổi component production.

## Files đã thay đổi

- `TASKS.md` — đánh dấu đúng task đầu tiên `[ ]` thành `[x]`.
- `apps/web/design-mockups/product-card/README.md` — hướng dẫn preview và mô tả hai concept.
- `apps/web/design-mockups/product-card/01-build-bench.html` — concept thẻ sản phẩm dạng lưới.
- `apps/web/design-mockups/product-card/02-spec-editorial.html` — concept danh sách editorial ba vùng.

## Kết quả kiểm chứng

- Pass: web type-check — `evidences/typecheck.log`.
- Pass: web build — `evidences/build.log`.
- Pass with limitation: UI detector hoàn tất, không còn finding sau chỉnh sửa; detector chạy degraded regex fallback do thiếu HTML parser modules — `evidences/ui-detector.json`.
- Đã ghi git diff stat — `evidences/diff.stat`.
- Danh sách thay đổi tại thời điểm kiểm tra — `evidences/git-status.txt`.

## Lưu ý cho Reviewer

- Mở trực tiếp hai file HTML trên trình duyệt; thử desktop phổ biến và cửa sổ hẹp.
- Hình lấy từ URL Unsplash minh họa; cần mạng để tải. Dữ liệu tên/giá/stock/rating/spec đều có nhãn mock, không dùng làm catalog.
- Nút và swatch chỉ là control trình bày, không có hành vi mua hàng.
- `ProductCard.tsx`, `ProductCardDetails.tsx`, `ProductCardPricing.tsx` không bị sửa.
