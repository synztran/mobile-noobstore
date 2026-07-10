export default function RootLoading() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-surface-container-lowest">
			<div className="flex flex-col items-center gap-4">
				<span className="loading loading-spinner loading-lg text-primary" />
				<p className="text-sm font-semibold text-on-surface-variant">
					Đang tải...
				</p>
			</div>
		</div>
	);
}
