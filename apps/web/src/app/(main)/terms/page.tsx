import { TopNav } from "@/components/layout/TopNav";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Điều khoản & Điều kiện - NoobStore",
};

export default function TermsPage() {
  return (
    <>
      <TopNav showBack backHref="/" />
      <LegalPageShell active="terms">
        <section id="terms">
          <p className="mb-6 text-2xl font-black tracking-tight">
            Điều khoản & Điều kiện
          </p>
          <div className="space-y-4 text-sm leading-relaxed text-on-surface-variant">
            <p>
              Chào mừng bạn đến với NoobStore. Khi truy cập và sử dụng trang web
              của chúng tôi, bạn đồng ý tuân thủ các điều khoản và điều kiện dưới
              đây.
            </p>

            <div>
              <p className="mb-2 font-bold text-on-surface">1. Tài khoản</p>
              <p>
                Bạn có trách nhiệm bảo mật thông tin tài khoản và mật khẩu.
                NoobStore không chịu trách nhiệm cho các thiệt hại phát sinh từ
                việc truy cập trái phép vào tài khoản của bạn.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">2. Đơn hàng</p>
              <p>
                Chúng tôi có quyền từ chối hoặc hủy đơn hàng bất kỳ lúc nào vì
                lý do hàng tồn kho, sai sót về giá hoặc các vấn đề khác. Trong
                trường hợp hủy đơn, bạn sẽ được hoàn tiền đầy đủ.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">3. Giá cả</p>
              <p>
                Giá sản phẩm có thể thay đổi mà không báo trước. Chúng tôi cố
                gắng hiển thị giá chính xác nhất, nhưng sai sót có thể xảy ra.
                Nếu phát hiện sai giá, chúng tôi sẽ thông báo và bạn có thể chọn
                hủy hoặc tiếp tục đơn hàng.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">4. Vận chuyển</p>
              <p>
                Thời gian giao hàng chỉ là ước tính. NoobStore không chịu trách
                nhiệm cho sự chậm trễ do đơn vị vận chuyển hoặc các yếu tố bất
                khả kháng.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">5. Đổi trả</p>
              <p>
                Sản phẩm có thể được đổi trả trong vòng 3 ngày kể từ ngày nhận
                hàng với điều kiện sản phẩm còn nguyên tem mác, chưa qua sử dụng.
                Chi phí vận chuyển đổi trả do khách hàng chịu trách nhiệm.
              </p>
            </div>
          </div>
        </section>
      </LegalPageShell>
    </>
  );
}
