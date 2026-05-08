"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface GachaRulesDrawerProps {
	open: boolean;
	onClose: () => void;
}

const RULES = [
	{
		title: "Cách chơi",
		body: "Bỏ token vào máy, sau đó xoay núm điều khiển đủ 360° để quay. Núm sẽ bật trở lại nếu bạn thả tay trước khi hoàn thành vòng xoay.",
	},
	{
		title: "Token",
		body: "Token được nhận khi hoàn thành nhiệm vụ hoặc mua thêm. Mỗi lượt chơi tốn 1 token. Số token được cập nhật ngay sau mỗi lượt quay.",
	},
	{
		title: "Phần thưởng",
		body: "Mỗi viên nang chứa một phần thưởng được chọn ngẫu nhiên. Phần thưởng có nhiều độ hiếm khác nhau — viên nang vàng chứa những giải thưởng hiếm nhất. Tỉ lệ trúng của từng phần thưởng được hiển thị trong danh sách Phần Thưởng.",
	},
	{
		title: "Phần thưởng giới hạn",
		body: 'Một số phần thưởng có số lượng tối đa (hiển thị là "Còn X" trong danh sách). Khi hết số lượng, phần thưởng đó sẽ không thể trúng nữa và được thay thế bởi vật phẩm khác theo tỉ lệ.',
	},
	{
		title: "Nhiệm vụ",
		body: "Hoàn thành các nhiệm vụ trong ứng dụng để nhận thêm token. Nhiệm vụ làm mới theo lịch sự kiện. Kiểm tra tab Nhiệm Vụ để xem các nhiệm vụ hiện tại.",
	},
	{
		title: "Công bằng",
		body: "Mỗi lượt quay là hoàn toàn độc lập. Kết quả trước không ảnh hưởng đến lượt sau. Tỉ lệ phần trăm hiển thị phản ánh đúng trọng số quay được hệ thống sử dụng.",
	},
];

export function GachaRulesDrawer({ open, onClose }: GachaRulesDrawerProps) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open) return null;

	return (
		<>
			<div
				className="fixed inset-0 bg-black/50 z-[60]"
				onClick={onClose}
			/>
			<aside
				role="dialog"
				aria-modal="true"
				aria-label="Luật chơi"
				className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl bg-base-100 flex flex-col"
				style={{ maxHeight: "80vh" }}>
				{/* Header */}
				<div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-base-200">
					<h2 className="text-base font-black">
						Cách Thức Hoạt Động
					</h2>
					<button
						aria-label="Đóng"
						onClick={onClose}
						className="p-1 rounded-full hover:bg-base-200">
						<X size={18} />
					</button>
				</div>

				{/* Rules */}
				<div className="overflow-y-auto flex-1 px-4 py-4 flex flex-col gap-4">
					{RULES.map((rule, i) => (
						<div key={i} className="flex gap-3">
							<div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-black flex items-center justify-center mt-0.5">
								{i + 1}
							</div>
							<div>
								<p className="font-bold text-sm mb-0.5">
									{rule.title}
								</p>
								<p className="text-sm text-base-content/70 leading-relaxed">
									{rule.body}
								</p>
							</div>
						</div>
					))}

					<div className="mt-2 p-3 rounded-xl bg-warning/10 border border-warning/30">
						<p className="text-xs text-warning font-semibold text-left">
							Mọi lượt quay đều là kết quả cuối cùng. Phần thưởng
							không được đổi hoặc hoàn trả.
						</p>
					</div>
				</div>
			</aside>
		</>
	);
}
