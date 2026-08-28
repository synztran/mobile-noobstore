import { getAdminClient } from "@/lib/supabase/admin";
import ServicesClient from "@/components/services/ServicesClient";
import type { AdminService } from "@/components/services/serviceTypes";

export const metadata = {
	title: "Services - NoobStore Admin",
};

export default async function ServicesPage() {
	const supabase = getAdminClient();

	const { data: services, error } = await supabase
		.from("services")
		.select(
			`
			id,
			name,
			slug,
			description,
			service_type,
			service_section,
			base_price,
			handling_days,
			estimated_days,
			max_entries,
			is_active,
			is_bookable_on_services_page,
			service_configs(
				id,
				base_price,
				handling_days,
				is_active,
				updated_at
			),
			service_options(
				id,
				service_id,
				label,
				is_required,
				display_order,
				service_option_values(
					id,
					label,
					price_adjustment,
					display_order
				)
			)
		`,
		)
		.order("name", { ascending: true });

	return (
		<ServicesClient
			services={(services ?? []) as unknown as AdminService[]}
			error={error?.message ?? null}
		/>
	);
}
