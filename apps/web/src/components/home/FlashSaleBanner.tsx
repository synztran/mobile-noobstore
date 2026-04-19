import { ShieldCheck, Truck } from "lucide-react";

const TRUST_PROPS = [
	{
		Icon: Truck,
		heading: "VẬN CHUYỂN TOÀN CẦU",
		body: "Giao hàng quốc tế có bảo hiểm từ trung tâm phân phối của chúng tôi tại Singapore.",
	},
	{
		Icon: ShieldCheck,
		heading: "HỖ TRỢ TRỌN ĐỜI",
		body: "Bảo hành phần cứng bao gồm tất cả lỗi CNC và bo mạch PCB.",
	},
];

export function FlashSaleBanner() {
	return (
		<section className="bg-on-surface text-surface py-12 px-8 flex flex-col gap-8">
			{TRUST_PROPS.map(({ Icon: IconComp, heading, body }) => (
				<div key={heading} className="flex items-start gap-4">
					<IconComp
						size={28}
						className="text-primary-fixed-dim flex-shrink-0 mt-0.5"
					/>
					<div>
						<h5 className="text-xs font-bold tracking-widest uppercase">
							{heading}
						</h5>
						<p className="text-xs text-outline mt-1 leading-relaxed">
							{body}
						</p>
					</div>
				</div>
			))}
		</section>
	);
}
