import { BookOpen, History, Trophy } from "lucide-react";

interface MachineActionsProps {
	onHistoryOpen: () => void;
	onRewardsOpen: () => void;
	onRulesOpen: () => void;
}

export function MachineActions({
	onHistoryOpen,
	onRewardsOpen,
	onRulesOpen,
}: MachineActionsProps) {
	return (
		<div className="absolute -right-12 top-1/3 flex flex-col gap-2">
			<button
				onClick={onHistoryOpen}
				className="w-9 h-9 rounded-tl-xl rounded-bl-xl bg-base-100 border border-base-200 shadow-sm flex items-center justify-center hover:bg-base-200 transition-colors"
				aria-label="Lịch sử tham gia">
				<History size={16} className="text-base-content/60" />
			</button>
			<button
				onClick={onRewardsOpen}
				className="w-9 h-9 rounded-tl-xl rounded-bl-xl bg-base-100 border border-base-200 shadow-sm flex items-center justify-center hover:bg-base-200 transition-colors"
				aria-label="Danh sách phần thưởng">
				<Trophy size={16} className="text-amber-500" />
			</button>
			<button
				onClick={onRulesOpen}
				className="w-9 h-9 rounded-tl-xl rounded-bl-xl bg-base-100 border border-base-200 shadow-sm flex items-center justify-center hover:bg-base-200 transition-colors"
				aria-label="Quy tắc trò chơi">
				<BookOpen size={16} className="text-base-content/60" />
			</button>
		</div>
	);
}
