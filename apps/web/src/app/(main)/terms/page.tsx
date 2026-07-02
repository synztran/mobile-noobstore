import { TopNav } from "@/components/layout/TopNav";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Điều khoản & Chính sách - NoobStore",
};

export default function TermsPage() {
	return (
		<>
			<TopNav showBack backHref="/register" />
			<main className="space-y-10 px-6 py-6">
				{/* Terms */}
				<section id="terms">
					<p className="mb-6 text-2xl font-black tracking-tight">
						Điều khoản & Điều kiện
					</p>
					<div className="space-y-4 text-sm leading-relaxed text-on-surface-variant">
						<p>
							Chào mừng bạn đến với NoobStore. Khi truy cập và sử dụng
							trang web của chúng tôi, bạn đồng ý tuân thủ các điều khoản
							và điều kiện dưới đây.
						</p>

						<div>
							<p className="mb-2 font-bold text-on-surface">1. Tài khoản</p>
							<p>
								Bạn có trách nhiệm bảo mật thông tin tài khoản và mật
								khẩu. NoobStore không chịu trách nhiệm cho các thiệt hại
								phát sinh từ việc truy cập trái phép vào tài khoản của
								bạn.
							</p>
						</div>

						<div>
							<p className="mb-2 font-bold text-on-surface">2. Đơn hàng</p>
							<p>
								Chúng tôi có quyền từ chối hoặc hủy đơn hàng bất kỳ lúc
								nào vì lý do hàng tồn kho, sai sót về giá hoặc các vấn
								đề khác. Trong trường hợp hủy đơn, bạn sẽ được hoàn tiền
								đầy đủ.
							</p>
						</div>

						<div>
							<p className="mb-2 font-bold text-on-surface">3. Giá cả</p>
							<p>
								Giá sản phẩm có thể thay đổi mà không báo trước. Chúng
								tôi cố gắng hiển thị giá chính xác nhất, nhưng sai sót
								có thể xảy ra. Nếu phát hiện sai giá, chúng tôi sẽ thông
								báo và bạn có thể chọn hủy hoặc tiếp tục đơn hàng.
							</p>
						</div>

						<div>
							<p className="mb-2 font-bold text-on-surface">4. Vận chuyển</p>
							<p>
								Thời gian giao hàng chỉ là ước tính. NoobStore không chịu
								trách nhiệm cho sự chậm trễ do đơn vị vận chuyển hoặc
								các yếu tố bất khả kháng.
							</p>
						</div>

						<div>
							<p className="mb-2 font-bold text-on-surface">5. Đổi trả</p>
							<p>
								Sản phẩm có thể được đổi trả trong vòng 7 ngày kể từ
								ngày nhận hàng với điều kiện sản phẩm còn nguyên tem mác,
								chưa qua sử dụng. Chi phí vận chuyển đổi trả do khách
								hàng chịu trách nhiệm.
							</p>
						</div>
					</div>
				</section>

				<hr className="border-outline-variant" />

				{/* Policy */}
				<section id="policy">
					<p className="mb-6 text-2xl font-black tracking-tight">
						Chính sách bảo mật
					</p>
					<div className="space-y-4 text-sm leading-relaxed text-on-surface-variant">
						<p>
							NoobStore cam kết bảo vệ thông tin cá nhân của bạn. Chính
							sách này giải thích cách chúng tôi thu thập, sử dụng và bảo
							vệ dữ liệu của bạn.
						</p>

						<div>
							<p className="mb-2 font-bold text-on-surface">1. Thông tin thu thập</p>
							<p>
								Chúng tôi thu thập thông tin bạn cung cấp khi đăng ký tài
								khoản, đặt hàng: họ tên, email, số điện thoại, địa chỉ
								giao hàng.
							</p>
						</div>

						<div>
							<p className="mb-2 font-bold text-on-surface">
								2. Mục đích sử dụng
							</p>
							<p>
								Thông tin của bạn được sử dụng để xử lý đơn hàng, gửi
								thông báo vận chuyển, hỗ trợ khách hàng và cải thiện
								dịch vụ.
							</p>
						</div>

						<div>
							<p className="mb-2 font-bold text-on-surface">
								3. Bảo mật thông tin
							</p>
							<p>
								Chúng tôi áp dụng các biện pháp bảo mật tiêu chuẩn ngành
								để bảo vệ dữ liệu của bạn khỏi truy cập trái phép. Mọi
								giao dịch thanh toán đều được mã hóa SSL.
							</p>
						</div>

						<div>
							<p className="mb-2 font-bold text-on-surface">
								4. Chia sẻ với bên thứ ba
							</p>
							<p>
								Chúng tôi không bán thông tin cá nhân của bạn cho bên
								thứ ba. Dữ liệu chỉ được chia sẻ với đối tác vận chuyển
								và thanh toán khi cần thiết cho đơn hàng của bạn.
							</p>
						</div>

						<div>
							<p className="mb-2 font-bold text-on-surface">5. Liên hệ</p>
							<p>
								Nếu bạn có thắc mắc về chính sách bảo mật, vui lòng liên
								hệ qua email:{" "}
								<a
									href="mailto:support@noobstore.xyz"
									className="font-bold text-primary underline"
								>
									support@noobstore.xyz
								</a>
							</p>
						</div>
					</div>
				</section>
			</main>
		</>
	);
}
