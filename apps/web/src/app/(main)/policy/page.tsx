import { TopNav } from "@/components/layout/TopNav";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { MAIL_DOMAIN } from "@/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chính sách bảo mật - NoobStore",
};

export default function PolicyPage() {
  return (
    <>
      <TopNav showBack backHref="/" />
      <LegalPageShell active="policy">
        <section id="policy">
          <p className="mb-6 text-2xl font-black tracking-tight">
            Chính sách bảo mật
          </p>
          <div className="space-y-4 text-sm leading-relaxed text-on-surface-variant">
            <p>
              NoobStore cam kết bảo vệ thông tin cá nhân của bạn. Chính sách này
              giải thích cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu của
              bạn.
            </p>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                1. Thông tin thu thập
              </p>
              <p>
                Chúng tôi thu thập thông tin bạn cung cấp khi đăng ký tài khoản,
                đặt hàng: họ tên, email, số điện thoại, địa chỉ giao hàng.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                2. Mục đích sử dụng
              </p>
              <p>
                Thông tin của bạn được sử dụng để xử lý đơn hàng, gửi thông báo
                vận chuyển, hỗ trợ khách hàng và cải thiện dịch vụ.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                3. Bảo mật thông tin
              </p>
              <p>
                Chúng tôi áp dụng các biện pháp bảo mật tiêu chuẩn ngành để bảo
                vệ dữ liệu của bạn khỏi truy cập trái phép. Mọi giao dịch thanh
                toán đều được mã hóa SSL.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                4. Chia sẻ với bên thứ ba
              </p>
              <p>
                Chúng tôi không bán thông tin cá nhân của bạn cho bên thứ ba. Dữ
                liệu chỉ được chia sẻ với đối tác vận chuyển và thanh toán khi
                cần thiết cho đơn hàng của bạn.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">5. Liên hệ</p>
              <p>
                Nếu bạn có thắc mắc về chính sách bảo mật, vui lòng liên hệ qua
                email:{" "}
                <a
                  href={`mailto:${MAIL_DOMAIN}`}
                  className="font-bold text-primary underline"
                >
                  {MAIL_DOMAIN}
                </a>
              </p>
            </div>
          </div>
        </section>
      </LegalPageShell>
    </>
  );
}
