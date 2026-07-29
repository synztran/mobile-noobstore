import { TopNav } from "@/components/layout/TopNav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chính sách giao hàng - NoobStore",
};

export default function DeliveryTermsPage() {
  return (
    <>
      <TopNav showBack backHref="/" />
      <main className="px-6 py-6">
        <section id="delivery-terms">
          <p className="mb-6 text-2xl font-black tracking-tight">
            Chính sách giao hàng
          </p>
          <div className="space-y-4 text-sm leading-relaxed text-on-surface-variant">
            <p>
              NoobStore cam kết giao hàng nhanh chóng và an toàn đến tay khách
              hàng. Dưới đây là các thông tin chi tiết về chính sách giao hàng
              của chúng tôi.
            </p>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                1. Khu vực giao hàng
              </p>
              <p>
                NoobStore giao hàng trên toàn quốc. Đối với khu vực nội thành TP.
                Hồ Chí Minh, đơn hàng sẽ được giao bởi đội ngũ giao hàng nội bộ
                của NoobStore. Đối với khu vực ngoài TP. Hồ Chí Minh và các tỉnh
                thành khác, đơn hàng sẽ được chuyển phát qua đơn vị vận chuyển.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                2. Phương thức giao hàng
              </p>
              <div className="space-y-3">
                <div className="rounded-2xl bg-surface-container p-3">
                  <p className="font-bold text-on-surface">Tiêu chuẩn</p>
                  <p className="mt-0.5">
                    Xử lý trong 12-24 giờ. Phí giao hàng được tính dựa trên
                    khoảng cách.
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-container p-3">
                  <p className="font-bold text-on-surface">Hỏa tốc</p>
                  <p className="mt-0.5">
                    Xử lý trong 2-4 giờ. Phù hợp cho đơn hàng gấp trong khu vực
                    nội thành.
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-container p-3">
                  <p className="font-bold text-on-surface">
                    Đơn vị vận chuyển
                  </p>
                  <p className="mt-0.5">
                    Áp dụng cho khu vực ngoài TP. Hồ Chí Minh. Giao hàng thông
                    qua đối tác vận chuyển.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                3. Phí vận chuyển
              </p>
              <p>
                Phí vận chuyển được tính dựa trên khoảng cách từ NoobStore đến địa
                chỉ nhận hàng. Hệ thống sẽ tự động tính phí khi bạn nhập địa chỉ
                giao hàng tại trang thanh toán.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                4. Thời gian xử lý đơn hàng
              </p>
              <p>
                Đơn hàng được xử lý trong vòng 12-24 giờ đối với giao hàng tiêu
                chuẩn và 2-4 giờ đối với giao hàng hỏa tốc (tính từ thời điểm
                đặt hàng thành công). Thời gian xử lý có thể lâu hơn vào cuối
                tuần, ngày lễ hoặc chương trình khuyến mãi.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                5. Đơn hàng Pre-order
              </p>
              <p>
                Đối với sản phẩm pre-order, thời gian giao hàng dự kiến dựa vào
                thời gian hàng về đến NoobStore. Do ảnh hưởng từ hải quan và nhà sản
                xuất, thời gian nhận hàng có thể bị delay thêm. NoobStore sẽ cập
                nhật thông tin cho bạn khi có tiến trình mới.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                6. Chính sách đổi trả - hoàn tiền
              </p>
              <p>
                NoobStore không hỗ trợ chính xác đổi trả với sản phẩm giá trị cao hoặc sản phẩm <strong className="text-primary">Pre-order</strong>, Đối với đơn hàng đã được xác nhận vừa chưa chuyển trải thái <strong className="text-primary">vận chuyển</strong>. NoobStore sẽ hủy đơn hàng và hỗ trợ hoàn tiền.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                7. Phương thức thanh toán
              </p>
              <div className="space-y-4">
                <div className="rounded-2xl bg-surface-container p-3">
                  <p className="font-bold text-on-surface">Thanh toán đầy đủ - One-time payment</p>
                  <p className="mt-0.5">
                    Khách hàng cần thanh toàn đẩy đủ số tiền của đơn hàng và chi phí vận chuyển (nếu có)
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-container p-3">
                  <p className="font-bold text-on-surface">Thanh toán từng phần - Deposit payment</p>
                  <p className="mt-0.5">
                    Đối với đơn hàng có sản phẩm <strong className="text-primary">Pre-order</strong> hoặc <strong className="text-primary">đơn hàng giá trị cao</strong>, khách có thể lựa chọn thanh toán trước 1 phần tiền của đơn hàng (không bao gồm phí vận chuyển) giao động từ (10% ~ 80%). Phần thanh toán có lại, khách sẽ thanh toán khi nhận hàng
                  </p>
                </div>
                <div>
                  <strong className="text-primary">Lưu ý:</strong>&nbsp; Đối với đơn hàng ngoài phạm vi TP. Hồ Chí Minh, NoobStore không hỗ trợ hình thức thanh toán từng phần
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                8. Kiểm tra hàng khi nhận
              </p>
              <p>
                Vui lòng kiểm tra kỹ số lượng, chủng loại và tình trạng sản phẩm
                ngay khi nhận hàng. Mọi khiếu nại về thiếu hụt hoặc hư hỏng cần
                được thông báo ngay lập tức.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                9. Ký nhận đơn hàng
              </p>
              <p>
                Khi nhận hàng, khách hàng vui lòng ký xác nhận vào <strong className="text-primary">phiếu giao
                hàng/invoice</strong> đi kèm. Chữ ký xác nhận thể hiện khách hàng đã đồng
                ý và chấp nhận toàn bộ điều kiện, số lượng, chủng loại cũng như
                chất lượng của tất cả sản phẩm trong đơn hàng. Mọi khiếu nại sau
                khi ký nhận sẽ không được NoobStore giải quyết, trừ trường hợp
                sản phẩm có lỗi tiềm ẩn không thể phát hiện bằng mắt thường tại
                thời điểm nhận hàng.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                10. Thông tin liên hệ
              </p>
              <p>
                Nếu bạn có thắc mắc về chính sách giao hàng, vui lòng liên hệ
                qua email:{" "}
                <a
                  href="mailto:noobassembly@gmail.com"
                  className="font-bold text-primary underline"
                >
                  noobassembly@gmail.com
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
