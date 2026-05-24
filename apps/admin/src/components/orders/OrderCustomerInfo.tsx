interface Props {
	customerName: string;
	email?: string | null;
	phoneNumber?: string | null;
	status: string;
}

const STATUS_COLORS: Record<string, string> = {
	pending: "bg-yellow-100 text-yellow-800",
	confirmed: "bg-blue-100 text-blue-800",
	delivering: "bg-purple-100 text-purple-800",
	delivered: "bg-green-100 text-green-800",
	cancelled: "bg-red-100 text-red-800",
};

export default function OrderCustomerInfo({
	customerName,
	email,
	phoneNumber,
	status,
}: Props) {
	return (
		<div className="flex items-start justify-between gap-4 flex-wrap">
			<dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
				<div>
					<dt className="text-xs text-slate-400 mb-0.5">Customer</dt>
					<dd className="font-medium text-slate-800">
						{customerName}
					</dd>
				</div>
				{email && (
					<div>
						<dt className="text-xs text-slate-400 mb-0.5">Email</dt>
						<dd className="text-slate-600">{email}</dd>
					</div>
				)}
				{phoneNumber && (
					<div>
						<dt className="text-xs text-slate-400 mb-0.5">Phone</dt>
						<dd className="text-slate-600">{phoneNumber}</dd>
					</div>
				)}
			</dl>
			<span
				className={`px-3 py-1 rounded-full text-xs font-medium capitalize shrink-0 ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700"}`}>
				{status}
			</span>
		</div>
	);
}
