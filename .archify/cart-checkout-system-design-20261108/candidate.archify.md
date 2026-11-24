# Làm checkout an toàn khi retry và chạy đồng thời

Ưu tiên trước mắt: khóa quyền RPC checkout, thêm idempotency key, rồi ghi order và voucher quota trong cùng transaction. Ba thay đổi xử lý ba rủi ro khác nhau; không cần migrate AWS để bắt đầu.

- PostgreSQL đang bảo vệ tồn kho bằng row lock trong RPC tạo order.
- API checkout chưa thấy idempotency key nên retry có thể tạo order mới.
- Voucher fields/usage và vài dữ liệu phụ được lưu sau RPC nên có thể lệch khi lỗi.
- Quyền `submit_order` trên production cần xác minh vì migration cũ grant cho public roles.

@answer scope="Review theo checkout commit 9c6c174; không kiểm tra quyền trên live database"
@meta locale=vi
@source submit title="Checkout submit orchestration" path="apps/web/src/modules/checkout/server/submit-order.ts" lines=459:568
@source stock title="Atomic stock reservation" path="supabase/migrations/143_variant_authoritative_stock.sql" lines=70:185
@source rpc-grant title="Historical submit_order grants" path="supabase/migrations/051_fix_submit_order_set_order_item_id.sql" lines=7:19
@source gift-rpc title="Atomic gift checkout RPC" path="supabase/migrations/164_checkout_gifts_and_atomic_post_views.sql" lines=13:25
@source checkout-types title="Checkout request contract" path="apps/web/src/modules/checkout/types.ts" lines=29:77

## Checkout hiện bảo vệ phần nào?

RPC giữ phần cốt lõi nhất trong một transaction: khóa stock, xác nhận số lượng, trừ kho và tạo order/items. Gift stock cũng được khóa cùng transaction khi dùng gift-aware RPC.[](source:stock)[](source:gift-rpc)

@sequence id=checkout-atomic title="Ranh giới transaction checkout hiện tại"
| actor browser | Browser | external |
| actor api | Checkout API | backend |
| actor db | PostgreSQL RPC | database |
| actor effects | Ghi side effects | backend |
| browser | api | POST /api/checkout/submit |
| api | db | Gọi RPC sau khi tính lại giá và kiểm tra voucher | emphasis |
| db | api | Commit order và tồn kho |
| api | effects | Lưu voucher, delivery, deposit, services; gửi thông báo |
| effects | browser | Trả order ID hoặc lỗi sau commit |

@callout level=warning title="Commit đã xảy ra không đồng nghĩa toàn checkout hoàn tất"
Nếu bước sau RPC lỗi, client có thể nhận lỗi dù order và stock đã commit. Retry không có khóa nhận diện request cũ sẽ chạy lại luồng. Các side effects không quan trọng như notification nên có thể retry riêng; dữ liệu order/quota cần bảo đảm nhất quán.

## Ba cải tiến nào đáng làm trước?

| Ưu tiên | Thay đổi | Lợi ích | Trade-off |
| --- | --- | --- | --- |
| 1 | Xác minh quyền `submit_order`; chỉ cho `service_role` nếu app là caller duy nhất | Đóng đường gọi RPC trực tiếp bỏ qua business validation | Cần kiểm tra grants trên production; migration sửa quyền phải deploy cẩn thận |
| 2 | Idempotency key theo user + checkout attempt | Retry trả lại cùng order, không trừ kho lần hai | Cần lưu key/result bền vững và quy định key hết hạn |
| 3 | Ghi voucher usage và dữ liệu order thiết yếu trong transaction tạo order | Tránh order thiếu voucher hoặc quota bị lệch | Transaction dài hơn; cần khóa theo thứ tự nhất quán để hạn chế deadlock |

@callout level=warning title="RPC grant là rủi ro cần xác minh, chưa phải exploit đã xác nhận"
Migration cũ cấp EXECUTE cho anon/authenticated; function là SECURITY DEFINER và nhận p_user_id. Cần xem quyền hiện tại trên Supabase trước khi kết luận production còn mở. App Next.js gọi bằng service-role, nên không cần public grant cho luồng hiện tại.[](source:rpc-grant)

## Idempotency ngăn duplicate order ra sao?

Browser giữ cùng key cho một lần checkout; API gửi key tới database. Unique constraint làm hai request đồng thời cùng key hội tụ về một order. Key mới chỉ sinh khi khách bắt đầu một checkout attempt khác.

@workflow id=idempotency title="Retry có idempotency key"
| lane request | Request |
| lane database | Database |
| send | Gửi key K + checkout payload | external | request |
| lookup | Tìm order đã gắn key K? | backend | request |
| existing | Trả order trước đó | backend | request |
| create | Tạo order và gắn K trong transaction | database | database |
| result | Trả cùng order ID | backend | request |
| send > lookup | key K | |
| lookup > existing | có rồi | |
| lookup > create | chưa có | |
| existing > result | retry | |
| create > result | commit | emphasis |

@steps id=idempotency-steps
| request | Gửi key K | Dùng cùng key khi retry đúng lần checkout đó. | idempotency | send |
| lookup | Tra key | Nếu key đã có order, trả kết quả đã lưu. | idempotency | lookup |
| create | Tạo một lần | Unique constraint xử lý request đồng thời cùng key. | idempotency | create |
| result | Trả order | Chỉ tạo key mới khi khách bắt đầu lần checkout mới. | idempotency | result |

## Atomicity đem lại gì, và tốn gì?

| Cách | Ưu điểm | Nhược điểm | Hợp với |
| --- | --- | --- | --- |
| Một DB transaction | Không thấy order thiếu stock hoặc stock trừ dở {good:Strong consistency} | Giữ lock lâu nếu nhồi API ngoài vào transaction {caution:Lock contention} | Stock, order, voucher quota, order snapshot |
| Ghi side effect sau commit | DB transaction ngắn; lỗi Telegram không rollback order {good:Fast response path} | Có thể thiếu notification hoặc metadata nếu không retry {bad:Partial completion} | Email, Telegram, analytics |
| Outbox + worker | Event bền vững cùng commit; retry và DLQ rõ ràng {good:Recoverable} | Thêm queue, worker, dedupe và vận hành {caution:More moving parts} | Notification, payment evidence, mission progress |

Ví dụ stock: còn 1 món, hai checkout cùng đọc stock=1. Row lock buộc request sau chờ request trước commit. Nó đọc lại tồn kho và bị từ chối. “Đọc ở app rồi update sau” có thể bán vượt kho.[](source:stock)

## RLS và cart đang bảo vệ bằng gì?

Cart item routes PATCH/DELETE kiểm tra owner trước mutation; RLS policies cũng giới hạn `cart_items` qua cart cha. `DELETE /api/cart` nhận `cart_id` từ query nhưng route không kiểm tra owner tường minh; SSR client vẫn gắn session nên RLS là lớp thực thi hiện tại. Thêm owner check ở route giúp lỗi rõ và giữ defense-in-depth.

Checkout endpoint yêu cầu user đăng nhập, tính giá server-side và bỏ qua `cart_id` client khi quyết định cart nào convert. Điều đó giảm giả mạo cart ID nhưng không thay thế idempotency cho lần submit.[](source:submit)

## AWS nên học bằng cách nào mà chưa cần migrate?

| Khái niệm cần học | Ánh xạ AWS để lab | Bài tập |
| --- | --- | --- |
| Transaction và row lock | RDS PostgreSQL hoặc Aurora PostgreSQL | Chạy hai request tranh sản phẩm cuối; đo request thắng/thua |
| Idempotency store | RDS unique key; DynamoDB conditional write là lựa chọn khác | Retry cùng key sau timeout và xác nhận chỉ có một order |
| Outbox và async retry | SQS + DLQ; worker trên ECS/Fargate hoặc Lambda | Làm worker gửi notification giả lập, retry lỗi và dedupe event |
| Rate limit và cache | ElastiCache Redis | Kiểm tra limit theo IP/user và hành vi khi cache unavailable |
| Secrets và quan sát | Secrets Manager, CloudWatch | Xoay secret lab, tạo metric retry/stock conflict và alarm |

AWS managed services giảm việc tự vận hành nhưng thêm chi phí, IAM/networking và failure modes mới. Giữ Supabase hiện tại. Dựng lab nhỏ trước khi cân nhắc đổi production.

## Lộ trình thực hành theo thứ tự

- [ ] Xác minh quyền execute function trong Supabase production; ghi lại role nào được phép gọi.
- [ ] Thiết kế bảng idempotency và test retry sau timeout ngay sau RPC commit.
- [ ] Thêm test đồng thời cho sản phẩm cuối và voucher quota cuối.
- [ ] Phác thảo transactional outbox; chỉ chuyển notification/mission sang worker khi cần retry độc lập.
- [ ] Dựng lab AWS riêng và so sánh chi phí/độ phức tạp với Supabase hiện tại.

@callout level=note title="Phạm vi và giới hạn"
Đây là giải thích dựa trên code đã đọc ở commit nêu trên, không phải penetration test hay xác nhận quyền live database. Không đề xuất thay kiến trúc ngay; bắt đầu từ quyền RPC, idempotency và concurrency tests.
