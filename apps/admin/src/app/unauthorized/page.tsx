import Link from "next/link";

export const metadata = {
	title: "Unauthorized - NoobStore Admin",
};

export default function UnauthorizedPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-[rgb(var(--admin-bg))] px-4">
			<div className="card-panel flex max-w-sm flex-col items-center p-8 text-center">
				<span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-lg font-bold text-red-600 ring-1 ring-inset ring-red-200">
					403
				</span>
				<h1 className="text-lg font-semibold tracking-tight text-heading">
					Access denied
				</h1>
				<p className="mt-1.5 text-[13px] text-body">
					You don't have permission to access this page.
				</p>
				<Link href="/login" className="btn btn-primary mt-6">
					Back to Login
				</Link>
			</div>
		</div>
	);
}