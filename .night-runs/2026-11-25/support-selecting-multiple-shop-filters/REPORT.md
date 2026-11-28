# Báo cáo: Support selecting multiple shop filters

## Tóm tắt

Cho phép chọn nhiều danh mục và thương hiệu trên mobile lẫn desktop. Mỗi nhóm lọc theo OR; danh mục, thương hiệu và khoảng giá kết hợp theo AND. URL dùng repeated `category`/`brand`; URL scalar cũ vẫn đọc được. Trạng thái browser back/forward đồng bộ qua URL như trước.

## Files đã thay đổi

- `apps/web/src/modules/products/ui/product/FilterOverlay.tsx` — multi-select danh mục/thương hiệu trên mobile.
- `apps/web/src/modules/products/ui/shop/ShopFilterPanel.tsx` — multi-select trên desktop, selected count và reset.
- `apps/web/src/modules/products/client/useShopControls.ts` — parse/serialize repeated params và clear state.
- `apps/web/src/modules/products/client/shop-infinite.ts` — đọc, serialize filter, query-key đa giá trị.
- `apps/web/src/modules/products/client/shop-infinite.test.ts` — test URL round-trip, dedupe, legacy URL và query key.
- `apps/web/src/modules/products/server/queries.ts` — query category/brand bằng `IN`, giữ OR nội bộ nhóm và AND giữa nhóm.
- `apps/web/src/app/api/products/route.ts` — nhận tất cả giá trị lặp, loại trùng.
- `apps/web/src/lib/redis/cache.ts` — cache key phân biệt tập filter, chuẩn hóa thứ tự.
- `apps/web/src/app/(main)/shop/page.tsx` — nhận scalar hoặc array từ server `searchParams`, tránh SSR seed ở URL có filter.
- `apps/web/src/modules/products/ui/shop/ShopControls.tsx` — hiển thị từng lựa chọn và thích nghi state array.
- `apps/web/src/modules/products/ui/shop/ShopPageClient.tsx` — analytics list label đa danh mục.
- `apps/web/src/modules/products/ui/search/SearchPageClient.tsx` — giữ luồng search hiện tại tương thích với Filters.

## Kết quả kiểm chứng

- PASS — `apps/web/yarn type-check`; log `evidences/typecheck.log`.
- PASS — `yarn test:unit --run src/modules/products/client/shop-infinite.test.ts` (2 tests); log `evidences/unit.log`.
- PASS — `apps/web/yarn build`; log `evidences/build.log`. Build có cảnh báo Redis/dynamic usage ngoài scope, nhưng kết thúc thành công.
- PASS — `git diff --check`; log `evidences/diff-check.log`.
- PASS — thay đổi file thống kê trong `evidences/diff.stat`.

## Lưu ý cho Reviewer

- Cần kiểm tra thủ công overlay mobile và panel desktop, chọn/bỏ nhiều giá trị, reset/apply, deep-link với repeated params và back/forward.
- Nên xác nhận với dữ liệu thật rằng một product có category/brand thuộc danh sách được OR đúng và hai nhóm kết hợp AND; unit test hiện tập trung URL contract.
- Không thay schema và không thêm package.
