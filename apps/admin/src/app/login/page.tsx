import LoginForm from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
	title: "Admin Login - NoobStore",
};

export default async function LoginPage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	// Redirect if already authenticated
	if (user) {
		const { data: profile } = await supabase
			.from("users")
			.select("role")
			.eq("id", user.id)
			.single();

		if (profile?.role === "admin") {
			redirect("/dashboard");
		}

		redirect("/unauthorized");
	}

	return <LoginForm />;
}
