import AdminLayout from "@/components/layout/AdminLayout";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	// Verify admin role
	const { data: profile, error } = await supabase
		.from("users")
		.select("role")
		.eq("id", user.id)
		.single();

	if (error || profile?.role !== "admin") {
		redirect("/unauthorized");
	}

	return <AdminLayout>{children}</AdminLayout>;
}
