import Image from "next/image";

interface TokenBadgeProps {
	tokenCount: number | null;
}

export function TokenBadge({ tokenCount }: TokenBadgeProps) {
	return (
		<div className="absolute -left-12 top-1/3 flex flex-col items-center gap-1">
			<div className="w-9 h-9 rounded-tr-xl rounded-br-xl border border-base-200 shadow-sm flex items-center justify-center">
				<Image
					src="/gatcha-machine/token_icon.png"
					alt="token"
					width={24}
					height={24}
					className="object-contain"
				/>
			</div>
			<div className="absolute -top-2 -right-2 bg-gray-100 rounded-full p-1 min-w-5 h-5 flex items-center justify-center border border-base-200 text-center">
				{tokenCount === null ? (
					<span className="loading loading-spinner text-warning loading-xs"></span>
				) : (
					<span className="text-[8px] font-black text-amber-600">
						x{tokenCount}
					</span>
				)}
			</div>
		</div>
	);
}
