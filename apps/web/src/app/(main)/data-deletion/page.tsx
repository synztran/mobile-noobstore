import { TopNav } from "@/components/layout/TopNav";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { MAIL_DOMAIN } from "@/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yêu cầu xóa dữ liệu - NoobStore",
};

export default function DataDeletionPage() {
  return (
    <>
      <TopNav showBack backHref="/policy" />
      <LegalPageShell active="policy">
        <section id="data-deletion">
          <p className="mb-6 text-2xl font-black tracking-tight">
            Yêu cầu xóa dữ liệu
          </p>
          <div className="space-y-4 text-sm leading-relaxed text-on-surface-variant">
            <p>
              Theo yêu cầu của Facebook, người dùng có thể yêu cầu xóa toàn bộ dữ liệu cá nhân được lưu trữ bởi NoobStore.
            </p>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                Cách thực hiện
              </p>
              <p>
                Vui lòng gửi email đến{" "}
                <a
                  href={`mailto:${MAIL_DOMAIN}`}
                  className="font-bold text-primary underline"
                >
                  {MAIL_DOMAIN}
                </a>{" "}
                với tiêu đề <strong className="text-on-surface">"Yêu cầu xóa dữ liệu"</strong> và cung cấp thông tin sau:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Email hoặc số điện thoại đăng ký tài khoản</li>
                <li>Tên đăng nhập (nếu có)</li>
              </ul>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                Thời gian xử lý
              </p>
              <p>
                Chúng tôi sẽ xác nhận yêu cầu và tiến hành xóa dữ liệu của bạn trong vòng 7 ngày làm việc. Sau khi hoàn tất, chúng tôi sẽ gửi email xác nhận cho bạn.
              </p>
            </div>

            <div>
              <p className="mb-2 font-bold text-on-surface">
                Thông tin liên hệ
              </p>
              <p>
                Nếu bạn có bất kỳ câu hỏi nào về quy trình xóa dữ liệu, vui lòng liên hệ qua email{" "}
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
