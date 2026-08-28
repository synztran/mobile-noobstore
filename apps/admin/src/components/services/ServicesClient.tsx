"use client";

import ServiceConfigButton from "@/components/services/ServiceConfigButton";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import EditServiceModal from "./EditServiceModal";
import ServiceOptionModal from "./ServiceOptionModal";
import ServiceValueModal from "./ServiceValueModal";
import type { AdminService, AdminServiceOption, AdminOptionValue } from "./serviceTypes";

interface ServicesClientProps {
	services: AdminService[];
	error: string | null;
}

const badgeBase =
	"inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium";

export default function ServicesClient({ services, error }: ServicesClientProps) {
	const [editingService, setEditingService] = useState<AdminService | null>(
		null,
	);
	const [optionModal, setOptionModal] = useState<{
		serviceId: string;
		serviceName: string;
		option: AdminServiceOption | null;
	} | null>(null);
	const [valueModal, setValueModal] = useState<{
		optionId: number;
		optionLabel: string;
		value: AdminOptionValue | null;
	} | null>(null);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
					Services
				</h1>
				<span className="text-sm text-slate-500 dark:text-slate-400">
					{services.length} service(s)
				</span>
			</div>

			{error && (
				<div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
					Không thể tải danh sách dịch vụ.
				</div>
			)}

			{services.length > 0 ? (
				<div className="space-y-3">
					{services.map((service) => {
						const options = [...(service.service_options ?? [])].sort(
							(a, b) => a.display_order - b.display_order,
						);
						const config = service.service_configs?.[0] ?? null;
						return (
							<div
								key={service.id}
								className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow dark:border-slate-700 dark:bg-slate-800">
								{/* Service header */}
								<div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/50">
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<span className="font-semibold text-slate-900 dark:text-slate-100">
												{service.name}
											</span>
											<span
												className={`${badgeBase} bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300`}>
												{service.service_type}
											</span>
											{service.service_section && (
												<span
													className={`${badgeBase} bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300`}>
													{service.service_section}
												</span>
											)}
											<span
												className={`${badgeBase} ${
													service.is_active
														? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
														: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
												}`}>
												{service.is_active ? "Active" : "Inactive"}
											</span>
											{service.is_bookable_on_services_page && (
												<span
													className={`${badgeBase} bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300`}>
													Bookable
												</span>
											)}
											{config && (
												<span
													className={`${badgeBase} bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300`}>
													Cấu hình riêng
												</span>
											)}
										</div>
									</div>
									<div className="flex shrink-0 items-center gap-3 text-right">
										<div>
											<div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
												{(
													config?.base_price ?? service.base_price
												).toLocaleString("vi-VN")}
												₫
											</div>
											<div className="text-xs text-slate-500 dark:text-slate-400">
												{config?.handling_days ??
													service.handling_days}
												&nbsp;ngày xử lý
											</div>
										</div>
										<button
											onClick={() => setEditingService(service)}
											title="Sửa thông tin dịch vụ"
											className="btn-icon-edit rounded-lg p-2 transition">
											<Pencil className="h-3.5 w-3.5" />
										</button>
										<ServiceConfigButton
											serviceId={service.id}
											serviceName={service.name}
											defaultPrice={service.base_price}
											defaultHandlingDays={service.handling_days}
											config={config}
										/>
									</div>
								</div>

								{/* Options tree */}
								{options.length > 0 ? (
									<div className="divide-y divide-slate-100 dark:divide-slate-700/60">
										{options.map((option) => {
											const values = [
												...(option.service_option_values ?? []),
											].sort(
												(a, b) =>
													a.display_order - b.display_order,
											);
											return (
												<div key={option.id} className="px-5 py-3">
													<div className="mb-2 flex items-center gap-2">
														<span className="inline-block h-px w-3 bg-slate-300 dark:bg-slate-600" />
														<button
															onClick={() =>
																setOptionModal({
																	serviceId: service.id,
																	serviceName: service.name,
																	option,
																})
															}
															className="text-sm font-medium text-slate-700 hover:text-blue-600 hover:underline dark:text-slate-300 dark:hover:text-blue-400">
															{option.label}
														</button>
														{option.is_required && (
															<span className="text-xs font-medium text-red-500">
																required
															</span>
														)}
													</div>
													<div className="ml-5 flex flex-wrap items-center gap-2">
															{values.map((val) => (
																<button
																	key={val.id}
																	onClick={() =>
																		setValueModal({
																			optionId: option.id,
																			optionLabel:
																				option.label,
																			value: val,
																		})
																	}
																	className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
																	{val.label}
																	{val.price_adjustment !==
																		0 && (
																		<span
																			className={
																				val.price_adjustment >
																				0
																					? "text-green-600 dark:text-green-400"
																					: "text-red-600 dark:text-red-400"
																			}>
																			{
																				val.price_adjustment >
																				0
																					? "+"
																					: ""
																			}
																			{val.price_adjustment.toLocaleString(
																				"vi-VN",
																			)}
																			₫
																		</span>
																	)}
																</button>
															))}
															<button
																onClick={() =>
																	setValueModal({
																		optionId: option.id,
																		optionLabel: option.label,
																		value: null,
																	})
																}
																title="Thêm giá trị"
																className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400">
																<Plus className="h-3 w-3" />
																giá trị
															</button>
														</div>
												</div>
											);
										})}
									</div>
								) : (
									<div className="px-5 py-3 text-sm italic text-slate-400 dark:text-slate-500">
										Chưa có tuỳ chọn nào
									</div>
								)}

								{/* Add option footer */}
								<div className="border-t border-slate-100 px-5 py-2.5 dark:border-slate-700/60">
									<button
										onClick={() =>
											setOptionModal({
												serviceId: service.id,
												serviceName: service.name,
												option: null,
											})
										}
										className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
										<Plus className="h-3.5 w-3.5" />
										Thêm tuỳ chọn
									</button>
								</div>
							</div>
						);
					})}
				</div>
			) : (
				!error && (
					<div className="rounded-lg bg-white px-6 py-12 text-center text-slate-500 shadow dark:bg-slate-800 dark:text-slate-400">
						No services found
					</div>
				)
			)}

			{/* Modals */}
			{editingService && (
				<EditServiceModal
					open
					onClose={() => setEditingService(null)}
					service={editingService}
				/>
			)}
			{optionModal && (
				<ServiceOptionModal
					open
					onClose={() => setOptionModal(null)}
					serviceId={optionModal.serviceId}
					serviceName={optionModal.serviceName}
					option={optionModal.option}
				/>
			)}
			{valueModal && (
				<ServiceValueModal
					open
					onClose={() => setValueModal(null)}
					optionId={valueModal.optionId}
					optionLabel={valueModal.optionLabel}
					value={valueModal.value}
				/>
			)}
		</div>
	);
}
