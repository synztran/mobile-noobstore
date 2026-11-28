# Báo cáo night-worker

## Tóm tắt

Tạo hai mockup `/about` độc lập, không nối vào route production: concept kể chuyện thương hiệu và concept proof-first về sản phẩm, dịch vụ, cộng đồng. Task được đánh dấu `[!]` vì workspace typecheck thất bại do lỗi admin ngoài phạm vi; quy trình night-worker chỉ cho phép `[x]` khi toàn bộ kiểm chứng pass.

## Files đã thay đổi

- `apps/web/design-mockups/about/01-build-bench.html` — mockup brand-story responsive.
- `apps/web/design-mockups/about/02-community-proof.html` — mockup trust-first responsive.
- `apps/web/design-mockups/about/README.md` — cách preview hai file HTML trực tiếp.
- `TASKS.md` — đánh dấu `[!]` theo kết quả kiểm chứng thất bại.

## Kết quả kiểm chứng

- **PASS** — `evidences/structure-check.log`: kiểm tra UTF-8 document, lang, viewport, một H1, thứ tự heading, breakpoint mobile, focus-visible, CTA/link và accessible labels.
- **PASS** — `evidences/build.log`: `npm run build` hoàn tất exit 0.
- **FAIL / blocker ngoài task** — `evidences/type-check.log`: `npm run type-check` thất bại ở `apps/admin` với lỗi hiện có gồm `THEMES` export trong gacha page, unused declarations trong crawling page, và schema/type mismatch liên quan vendors/releases. Không có lỗi nhắc tới mockup.
- **FAIL do script không tồn tại** — `evidences/typecheck.log`: skill chỉ định `npm run typecheck`, nhưng repository không khai báo script đó; dùng script đúng của repo `type-check` thay thế.
- **ADVISORY** — `evidences/ui-detector.json`: detector chạy degraded do thiếu HTML/CSS parser modules; báo màu/type-size/radius ngoài design tokens và không thể tính contrast. Các màu minh hoạ keyboard được dùng có chủ ý; cần kiểm tra render thủ công trước khi dùng làm production.
- `evidences/html-check-01.log` và `evidences/html-check-02.log`: `tidy` hệ thống quá cũ, không nhận HTML5 semantic tags/UTF-8; không dùng kết quả này làm kết luận markup.
- `evidences/diff.stat`: snapshot diff stat tại lúc chạy.

## Lưu ý cho Reviewer

- Mở `apps/web/design-mockups/about/01-build-bench.html` và `02-community-proof.html` trực tiếp ở desktop/mobile; xác nhận không tràn ngang và hai cấu trúc khác biệt rõ.
- CTA dùng link storefront `/shop`, `/community`; nội dung không khẳng định địa chỉ, số liệu, chứng nhận hoặc cam kết thương mại chưa được xác minh.
- Contrast tính toán chưa được detector degraded xác nhận. Mockups không thay đổi production code.
- Typecheck cần được chạy lại sau khi lỗi admin hiện hữu được xử lý; đây là nguyên nhân task mang `[!]`.
