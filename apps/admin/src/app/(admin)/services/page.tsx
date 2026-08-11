import { getAdminClient } from "@/lib/supabase/admin";
import ServiceConfigButton from "@/components/services/ServiceConfigButton";

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
			service_type,
			service_section,
			base_price,
			handling_days,
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

	if (error) {
		console.error("Error fetching services:", error);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold text-slate-900">Services</h1>
				<span className="text-sm text-slate-500">
					{services?.length ?? 0} service(s)
				</span>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
					Failed to load services.
				</div>
			)}

			{services && services.length > 0 ? (
				<div className="space-y-3">
					{services.map((service) => {
						const options = [
							...(service.service_options ?? []),
						].sort((a, b) => a.display_order - b.display_order);
						const config =
							service.service_configs?.[0] ?? null;
						return (
							<div
								key={service.id}
								className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
								{/* Service header */}
								<div className="flex items-center gap-4 px-5 py-4 bg-slate-50 border-b border-slate-200">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="font-semibold text-slate-900">
												{service.name}
											</span>
											<span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
												{service.service_type}
											</span>
											{service.service_section && (
												<span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
													{service.service_section}
												</span>
											)}
											<span
												className={`text-xs px-2 py-0.5 rounded-full font-medium ${
													service.is_active
														? "bg-green-100 text-green-700"
														: "bg-gray-100 text-gray-500"
												}`}>
												{service.is_active
													? "Active"
													: "Inactive"}
											</span>
											{service.is_bookable_on_services_page && (
												<span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
													Bookable
												</span>
											)}
											{config && (
												<span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
													Cấu hình riêng
												</span>
											)}
										</div>
									</div>
									<div className="text-right shrink-0 flex items-center gap-3">
										<div>
											<div className="text-sm font-semibold text-slate-800">
												{(config?.base_price ??
													service.base_price).toLocaleString(
													"vi-VN",
												)}
												₫
											</div>
											<div className="text-xs text-slate-500">
												{(config?.handling_days ??
													service.handling_days)}
												&nbsp;days handling
											</div>
										</div>
										<ServiceConfigButton
											serviceId={service.id}
											serviceName={service.name}
											defaultPrice={service.base_price}
											defaultHandlingDays={
												service.handling_days
											}
											config={config}
										/>
									</div>
								</div>

								{/* Options tree */}
								{options.length > 0 ? (
									<div className="divide-y divide-slate-100">
										{options.map((option) => {
											const values = [
												...(option.service_option_values ??
													[]),
											].sort(
												(a, b) =>
													a.display_order -
													b.display_order,
											);
											return (
												<div
													key={option.id}
													className="px-5 py-3">
													<div className="flex items-center gap-2 mb-2">
														<span className="w-3 h-px bg-slate-300 inline-block" />
														<span className="text-sm font-medium text-slate-700">
															{option.label}
														</span>
														{option.is_required && (
															<span className="text-xs text-red-500 font-medium">
																required
															</span>
														)}
													</div>
													{values.length > 0 && (
														<div className="ml-5 flex flex-wrap gap-2">
															{values.map(
																(val) => (
																	<span
																		key={
																			val.id
																		}
																		className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
																		{
																			val.label
																		}
																		{val.price_adjustment !==
																			0 && (
																			<span
																				className={
																					val.price_adjustment >
																					0
																						? "text-green-600"
																						: "text-red-600"
																				}>
																				{val.price_adjustment >
																				0
																					? "+"
																					: ""}
																				{val.price_adjustment.toLocaleString(
																					"vi-VN",
																				)}
																				₫
																			</span>
																		)}
																	</span>
																),
															)}
														</div>
													)}
												</div>
											);
										})}
									</div>
								) : (
									<div className="px-5 py-3 text-sm text-slate-400 italic">
										No options configured
									</div>
								)}
							</div>
						);
					})}
				</div>
			) : (
				!error && (
					<div className="bg-white rounded-lg shadow px-6 py-12 text-center text-slate-500">
						No services found
					</div>
				)
			)}
		</div>
	);
}
