"use client";

import Icon from "@/components/ui/Icon";
import { motion } from "framer-motion";

interface MobileWarningProps {
	onContinue?: () => void;
	showContinueButton?: boolean;
}

const MobileWarning = ({
	onContinue,
	showContinueButton = false,
}: MobileWarningProps) => {
	return (
		<motion.div
			className="fixed inset-0 z-50 flex items-center justify-center !mt-0 bg-black/80 backdrop-blur-sm"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}>
			<motion.div
				className="bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-md w-full text-center"
				initial={{ scale: 0.8, opacity: 0, y: 20 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				transition={{ duration: 0.4, ease: "easeOut" }}>
				{/* Phone Icon */}
				<motion.div
					className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center"
					initial={{ rotate: -10, scale: 0.8 }}
					animate={{ rotate: 0, scale: 1 }}
					transition={{
						delay: 0.2,
						duration: 0.5,
						type: "spring",
						bounce: 0.3,
					}}>
					<Icon name="smartphone" className="text-white text-4xl" />
				</motion.div>

				{/* Title */}
				<motion.h2
					className="text-2xl font-bold text-gray-900 mb-4"
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3, duration: 0.4 }}>
					Sử dụng thiết bị di động để có trải nghiệm tốt nhất!
				</motion.h2>

				{/* Message */}
				<motion.p
					className="text-gray-600 mb-6 leading-relaxed"
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4, duration: 0.4 }}>
					NoobStore khuyến nghị bạn sử dụng thiết bị di động để có
					trải nghiệm tốt nhất. Vui lòng xem trên điện thoại thông
					minh hoặc máy tính bảng của bạn.
				</motion.p>

				{/* Instructions */}
				<motion.div
					className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6"
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5, duration: 0.4 }}>
					<p className="text-sm text-gray-700 font-medium mb-2">
						📱 Để có trải nghiệm tốt nhất:
					</p>
					<ul className="text-xs text-gray-600 space-y-1 text-left">
						<li>
							• Mở liên kết này trên điện thoại di động của bạn
						</li>
						<li>• Xoay thiết bị của bạn sang chế độ dọc</li>
						<li>
							• Sử dụng thiết bị di động để có trải nghiệm tốt
							nhất
						</li>
					</ul>
				</motion.div>

				{/* Continue Button (optional) */}
				{showContinueButton && (
					<motion.button
						onClick={onContinue}
						className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 active:scale-95"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.6, duration: 0.4 }}
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}>
						Tiếp tục trên máy tính
					</motion.button>
				)}

				{/* Footer */}
				<motion.p
					className="text-xs text-gray-400 mt-4"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.7, duration: 0.4 }}>
					NoobStore
				</motion.p>
			</motion.div>
		</motion.div>
	);
};

export default MobileWarning;
