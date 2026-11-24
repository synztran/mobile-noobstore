# Night Run: Optimize admin product, variant, component, and order queries

- Task: `TASKS.md` → `**Optimize admin product, variant, component, and order queries**` (first unchecked task)
- Branch: `auto/night-20261125-0057`
- Started: 2026-11-25

## Tóm tắt

Đã thống nhất và tối ưu hóa các truy vấn Supabase trên bốn trang/module admin:

1. **Products page + `/api/products/list`**: Trích xuất query chung vào `apps/admin/src/lib/products-list-query.ts` (`buildProductsListQuery` + `PRODUCTS_LIST_SELECT`) để page và route không còn bản sao trùng lặp của select/order/range nữa. Select được chuẩn hóa (`category_id` được bổ sung để khớp route cũ; các cột không dùng bởi `ProductCard` giữ nguyên để không phá hành vi). Behavior giữ nguyên: cùng select, `order("created_at", {ascending:false})`, `range`, `ilike` on `name`, `eq` on `product_type`, `ids` trên route (dùng bởi `VoucherTargetingFields`) — và giữ nguyên `dynamic = "force-dynamic"`.
2. **Variants page**: Bổ sung `.limit(200)` cho query fetch danh sách products `product_type = "component"` (dropdown `CreateVariantModal` filter client-side; giới hạn giúp query không scan bảng products không giới hạn).
3. **Components page**: Xóa clause `.order("component_group")` trùng lặp (2 lần gọi giống nhau). Bổ sung `.limit(500)` cho `productOptions` và `.limit(1000)` cho `product_components` — grouping/pagination trang này diễn ra client-side, nên giới hạn được giữ nguyên UI thực tế.
4. **Orders (`orders-list-query.ts`)**: Query đã được dùng chung giữa page và `/api/orders` (`fetchOrdersList`); `ORDER_LIST_SELECT` chỉ select các cột cần thiết cho table và CSV export (`users(first_name,last_name)`, `order_items(count)`, `order_services(count)`). `fetchPreOrderCounts` đã `Promise.all` 2 query `order_items` + `order_item_components` (chỉ `order_id`) với `in(order_id, pageIds)` — bounded, giữ nguyên.

## Files đã thay đổi

- `apps/admin/src/lib/products-list-query.ts` (new — shared query builder)
- `apps/admin/src/lib/products-list-query.test.ts` (new — unit tests cho `normalizeProductTypeFilter` + `buildProductsListQuery`)
- `apps/admin/src/app/(admin)/products/page.tsx` (dùng shared module, không còn `from/to` local)
- `apps/admin/src/app/api/products/list/route.ts` (dùng shared module, giữ hết tham số: `q`, `productType`, `ids`, `excludeSoldOut`, `page`, `dynamic`)
- `apps/admin/src/app/(admin)/products/variants/page.tsx` (`.limit(200)` cho products dropdown)
- `apps/admin/src/app/(admin)/products/components/page.tsx` (xóa clause order trùng lặp, `.limit` cho products + components)

## Kết quả kiểm chứng

- `apps/admin type-check` → **29 lỗi TS**, toàn bộ trong các file không liên quan tôi không đụng tới (`api/vendors`, `api/warehouse-sync`, `api/crawling/*`, `(admin)/crawling/page.tsx`, `(admin)/vendors/*`, `../web/src/lib/email/email.service.ts`, …). **Không có lỗi trong các file đã thay đổi.** Ghi chú: admin typecheck dự án đang fail sẵn (pre-existing).
- `apps/admin build` → exit 0 (hoàn tất).
- `vitest -c apps/admin/vitest.config.mts` → `18 passed | 2 failed` files; các file fail là `src/lib/verified-payments.test.ts` và `src/app/api/fees/route.test.ts` — không liên quan module products, có khả năng pre-existing.
  - Thêm: `src/lib/products-list-query.test.ts` → 8/8 pass (mới thêm).
  - [evidences/typecheck.log](evidences/typecheck.log), [evidences/build.log](evidences/build.log), [evidences/vitest.log](evidences/vitest.log), [evidences/diff.stat](evidences/diff.stat).

## Lưu ý cho Reviewer

- Không chạy được so sánh **query count/row bounds thực tế** trên live DB trong session này (không có instance Supabase cục bộ đang chạy; gọi `supabase start` cần Docker). Nếu reviewer cần: chạy `EXPLAIN (ANALYZE)` qua `pgAdmin`/`psql` cho products/product_variants/product_components/orders trên môi trường local/staging trước khi deploy.
- **Không thêm index** theo yêu cầu "do not add speculative indexes". Nếu có cơ hội thực sự thì khuyến nghị riêng (không đưa vào scope task): chỉ mục `products(name)` cho `ilike %q%` (bằng pg_trgm, `vendor_id`), `products(created_at)` cho order mặc định; cho variants/components: `product_variants(product_id)`, `product_components(parent_product_id, component_group)`.
- Behavioral change nhỏ đã chấp nhận: giới hạn 200/500/1000 ròng trên các query "dropdown/list không phân trang DB" — nếu sau này products table tăng quá đóng (mới thấy). Không ảnh hưởng `page.tsx` products (pagination còn nguyên).
- Products page API route: không có auth/admin guard riêng mới nào được thêm — giữ nguyên cấu trúc route hiện tại.
