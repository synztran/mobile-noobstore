export default function CheckoutLoading() {
	return (
		<div className="mx-auto max-w-4xl px-4 py-8 pb-28">
			<div className="skeleton mb-8 h-8 w-48 rounded-lg bg-surface-container" />
			<div className="grid gap-6 lg:grid-cols-[1fr_360px]">
				<div className="space-y-4">
					<div className="skeleton h-48 w-full rounded-2xl bg-surface-container" />
					<div className="skeleton h-36 w-full rounded-2xl bg-surface-container" />
					<div className="skeleton h-40 w-full rounded-2xl bg-surface-container" />
				</div>
				<div>
					<div className="skeleton h-64 w-full rounded-2xl bg-surface-container" />
				</div>
			</div>
		</div>
	);
}
