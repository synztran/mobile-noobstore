"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateProfileName(
	fullName: string,
): Promise<{ error: string | null }> {
	const trimmed = fullName.trim();
	if (!trimmed) return { error: "Name cannot be empty" };

	const parts = trimmed.split(" ");
	const firstName = parts[0];
	const lastName = parts.slice(1).join(" ") || null;

	try {
		const supabase = await createClient();

		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) return { error: "Unauthorized" };

		const { error } = await supabase
			.from("users")
			.update({ first_name: firstName, last_name: lastName })
			.eq("id", user.id);

		if (error) return { error: error.message };
		return { error: null };
	} catch (err: unknown) {
		return {
			error: err instanceof Error ? err.message : "Unknown error",
		};
	}
}
