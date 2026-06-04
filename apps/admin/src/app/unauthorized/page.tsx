import Link from "next/link";

export const metadata = {
	title: "Unauthorized - NoobStore Admin",
};

export default function UnauthorizedPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
			<div className="text-center text-white space-y-4">
				<h1 className="text-5xl font-bold">403</h1>
				<p className="text-xl">
					You don't have permission to access this page
				</p>
				<Link href="/login" className="btn btn-primary">
					Back to Login
				</Link>
			</div>
		</div>
	);
}
