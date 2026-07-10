"use client";

export default function RootError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-surface-container-lowest px-6">
			<div className="flex flex-col items-center text-center">
				<div className="mb-4 text-5xl">😵</div>
				<p className="mb-2 text-xl font-black tracking-tight text-on-surface">
					Đã xảy ra lỗi
				</p>
				<p className="mb-8 max-w-xs text-sm font-medium text-on-surface-variant">
					Đã có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại sau.
				</p>
				<button
					onClick={reset}
					className="primary-gradient btn rounded-full border-0 px-8 py-3 text-sm font-bold normal-case text-white shadow-ambient-sm transition-transform active:scale-[0.98]"
				>
					Thử lại
				</button>
			</div>
		</div>
	);
}
