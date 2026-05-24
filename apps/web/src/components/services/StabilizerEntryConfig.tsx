"use client";

import type { BookingOption } from "@/app/api/services/booking-config/route";
import clsx from "clsx";
import { Minus, Plus } from "lucide-react";
import {
	STABILIZER_BUNDLES,
	STABILIZER_SIZES,
	STABILIZER_TYPES,
} from "./bookingHelpers";
import { GreaseSearchSelect } from "./GreaseSearchSelect";
import type { ServiceEntryDraft } from "./types";

interface StabilizerEntryConfigProps {
	entry: ServiceEntryDraft;
	serviceId: string;
	lubeOption?: BookingOption;
	onUpdateEntry: (
		serviceId: string,
		entryId: string,
		update: Partial<ServiceEntryDraft>,
	) => void;
}

export function StabilizerEntryConfig({
	entry,
	serviceId,
	lubeOption,
	onUpdateEntry,
}: StabilizerEntryConfigProps) {
	const mode = entry.stabilizerMode ?? "bundle";
	const selectedBundle = entry.stabilizerBundle ?? "6.25u";
	const quantities = entry.stabilizerQuantities ?? {};

	return (
		<div className="space-y-3">
			{/* Stabilizer type: clip-in / screw-in */}
			<div className="space-y-1.5">
				<p className="text-[11px] font-bold text-on-surface-variant">
					Loại stabilizer <span className="text-error">*</span>
				</p>
				<div className="flex gap-2">
					{STABILIZER_TYPES.map(({ type, label, detail }) => (
						<button
							key={type}
							type="button"
							onClick={() =>
								onUpdateEntry(serviceId, entry.entryId, {
									stabilizerType: type,
								})
							}
							className={clsx(
								"rounded-xl px-3 py-2 text-left border flex-1",
								entry.stabilizerType === type
									? "border-primary bg-primary text-primary-content"
									: "border-base-200 bg-base-100 text-on-surface",
							)}>
							<p className="text-[11px] font-black">{label}</p>
							<p className="text-[10px] opacity-75 mt-0.5">
								{detail}
							</p>
						</button>
					))}
				</div>
			</div>

			{/* Bundle / Individual mode */}
			<div className="space-y-2">
				<p className="text-[11px] font-bold text-on-surface-variant">
					Bộ stabilizer <span className="text-error">*</span>
				</p>
				<div className="flex gap-2">
					{(["bundle", "individual"] as const).map((m) => (
						<button
							key={m}
							type="button"
							onClick={() =>
								onUpdateEntry(serviceId, entry.entryId, {
									stabilizerMode: m,
								})
							}
							className={clsx(
								"rounded-xl px-3 py-1.5 text-[11px] font-semibold border",
								mode === m
									? "border-primary bg-primary text-primary-content"
									: "border-base-200 bg-base-100 text-on-surface",
							)}>
							{m === "bundle" ? "Bundle sẵn" : "Tùy chỉnh"}
						</button>
					))}
				</div>

				{mode === "bundle" ? (
					<div className="grid grid-cols-2 gap-2">
						{(["6.25u", "7u"] as const).map((bKey) => (
							<button
								key={bKey}
								type="button"
								onClick={() =>
									onUpdateEntry(serviceId, entry.entryId, {
										stabilizerBundle: bKey,
									})
								}
								className={clsx(
									"rounded-xl px-3 py-2 text-left border transition-colors",
									selectedBundle === bKey
										? "border-primary bg-primary text-primary-content"
										: "border-base-200 bg-base-100 text-on-surface",
								)}>
								<p className="text-[11px] font-black">
									{STABILIZER_BUNDLES[bKey].label}
								</p>
								<p className="text-[10px] opacity-75 mt-0.5">
									{STABILIZER_BUNDLES[bKey].detail}
								</p>
							</button>
						))}
					</div>
				) : (
					<div className="grid grid-cols-2 gap-2">
						{STABILIZER_SIZES.map((size) => (
							<div
								key={size}
								className="flex items-center gap-2 rounded-xl border border-base-200 bg-base-100 px-2.5 py-1.5">
								<span className="text-[11px] font-bold text-on-surface w-10">
									{size}
								</span>
								<div className="flex items-center gap-1 ml-auto">
									<button
										type="button"
										onClick={() =>
											onUpdateEntry(
												serviceId,
												entry.entryId,
												{
													stabilizerQuantities: {
														...quantities,
														[size]: Math.max(
															0,
															(quantities[size] ??
																0) - 1,
														),
													},
												},
											)
										}
										className="btn btn-ghost btn-xs rounded-full w-6 h-6 min-h-0 p-0">
										<Minus size={10} />
									</button>
									<span className="text-[11px] font-black w-5 text-center">
										{quantities[size] ?? 0}
									</span>
									<button
										type="button"
										onClick={() =>
											onUpdateEntry(
												serviceId,
												entry.entryId,
												{
													stabilizerQuantities: {
														...quantities,
														[size]:
															(quantities[size] ??
																0) + 1,
													},
												},
											)
										}
										className="btn btn-ghost btn-xs rounded-full w-6 h-6 min-h-0 p-0">
										<Plus size={10} />
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Lube type */}
			{lubeOption ? (
				<div className="space-y-1.5">
					<p className="text-[11px] font-bold text-on-surface-variant">
						Loại lube <span className="text-error">*</span>
					</p>
					<GreaseSearchSelect
						option={lubeOption}
						selectedValueId={
							entry.selectedByOptionId[String(lubeOption.id)] ??
							null
						}
						onSelect={(valueId) =>
							onUpdateEntry(serviceId, entry.entryId, {
								selectedByOptionId: {
									...entry.selectedByOptionId,
									[String(lubeOption.id)]: valueId,
								},
							})
						}
					/>
				</div>
			) : null}
		</div>
	);
}
