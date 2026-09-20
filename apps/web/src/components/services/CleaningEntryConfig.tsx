"use client";

import { formatVND } from "@/lib/currency";
import clsx from "clsx";
import {
	CLEANING_KEYBOARD_LAYOUTS,
	CLEANING_KEYBOARD_PRICES,
	CLEANING_SWITCH_BUNDLES,
	CLEANING_SWITCH_STATUSES,
	computeCleaningPrice,
} from "./bookingHelpers";
import { QuantityStepper } from "./QuantityStepper";
import type { ServiceEntryDraft } from "./types";

const CLEANING_PRODUCT_TYPES: {
	type: "keyboard" | "keycap" | "switch";
	label: string;
}[] = [
	{ type: "keyboard", label: "Bàn phím" },
	{ type: "keycap", label: "Keycap" },
	{ type: "switch", label: "Switch" },
];

interface CleaningEntryConfigProps {
	entry: ServiceEntryDraft;
	serviceId: string;
	onUpdateEntry: (
		serviceId: string,
		entryId: string,
		update: Partial<ServiceEntryDraft>,
	) => void;
}

export function CleaningEntryConfig({
	entry,
	serviceId,
	onUpdateEntry,
}: CleaningEntryConfigProps) {
	const productType = entry.cleaningProductType;

	return (
		<div className="space-y-3">
			<div className="space-y-1.5">
				<p className="text-xs font-bold text-on-surface-variant">
					Sản phẩm cần vệ sinh <span className="text-error">*</span>
				</p>
				<div className="flex gap-2 flex-wrap">
					{CLEANING_PRODUCT_TYPES.map(({ type, label }) => (
						<button
							key={type}
							type="button"
							onClick={() =>
								onUpdateEntry(serviceId, entry.entryId, {
									cleaningProductType: type,
									cleaningLayout: undefined,
									cleaningKeycapQty: undefined,
									cleaningSwitchQty: undefined,
									cleaningSwitchBundle: undefined,
									cleaningSwitchStatus: undefined,
								})
							}
							className={clsx(
								"rounded-full px-3 py-1.5 text-xs font-semibold border",
								productType === type
									? "border-primary bg-primary text-on-primary"
									: "border-outline-variant/30 bg-surface-container text-on-surface",
							)}>
							{label}
						</button>
					))}
				</div>
			</div>

			{productType === "keyboard" ? (
				<div className="space-y-1.5">
					<p className="text-xs font-bold text-on-surface-variant">
						Layout <span className="text-error">*</span>
					</p>
					<div className="flex flex-wrap gap-1.5">
						{CLEANING_KEYBOARD_LAYOUTS.map((layout) => (
							<button
								key={layout}
								type="button"
								onClick={() =>
									onUpdateEntry(serviceId, entry.entryId, {
										cleaningLayout: layout,
									})
								}
								className={clsx(
									"rounded-full px-2.5 py-1.5 text-xs font-semibold border text-left",
									entry.cleaningLayout === layout
										? "border-primary bg-primary text-on-primary"
										: "border-outline-variant/30 bg-surface-container text-on-surface",
								)}>
								{layout}
								<span className="ml-1 opacity-75 text-xs">
									{formatVND(
										CLEANING_KEYBOARD_PRICES[layout]!,
									)}
								</span>
							</button>
						))}
					</div>
				</div>
			) : null}

			{productType === "keycap" ? (
				<div className="space-y-1.5">
					<p className="text-xs font-bold text-on-surface-variant">
						Số lượng keycap <span className="text-error">*</span>
					</p>
					<QuantityStepper
						value={entry.cleaningKeycapQty}
						onChange={(v) =>
							onUpdateEntry(serviceId, entry.entryId, {
								cleaningKeycapQty: v,
							})
						}
						unit="keycap"
					/>
					{(entry.cleaningKeycapQty ?? 0) > 0 ? (
						<p className="text-xs text-on-surface-variant">
							{entry.cleaningKeycapQty! < 50
								? `Dưới 50 keycap → ${formatVND(50_000)}`
								: entry.cleaningKeycapQty! <= 150
									? `50–150 keycap → ${formatVND(100_000)}`
									: `Trên 150 keycap → ${formatVND(150_000)}`}
						</p>
					) : null}
				</div>
			) : null}

			{productType === "switch" ? (
				<div className="space-y-3">
					<div className="space-y-1.5">
						<p className="text-xs font-bold text-on-surface-variant">
							Bundle vệ sinh <span className="text-error">*</span>
						</p>
						<div className="flex flex-wrap gap-1.5">
							{CLEANING_SWITCH_BUNDLES.map((b) => (
								<button
									key={b.count}
									type="button"
									onClick={() =>
										onUpdateEntry(
											serviceId,
											entry.entryId,
											{
												cleaningSwitchBundle: b.count,
											},
										)
									}
									className={clsx(
										"rounded-full px-2.5 py-1.5 text-xs font-semibold border",
										entry.cleaningSwitchBundle === b.count
											? "border-primary bg-primary text-on-primary"
											: "border-outline-variant/30 bg-surface-container text-on-surface",
									)}>
									{b.count} switch
									<span className="ml-1 opacity-75 text-xs">
										{formatVND(b.price)}
									</span>
								</button>
							))}
						</div>
					</div>

					<div className="space-y-1.5">
						<p className="text-xs font-bold text-on-surface-variant">
							Tình trạng switch{" "}
							<span className="text-error">*</span>
						</p>
						<div className="flex flex-wrap gap-1.5">
							{CLEANING_SWITCH_STATUSES.map((status) => (
								<button
									key={status}
									type="button"
									onClick={() =>
										onUpdateEntry(
											serviceId,
											entry.entryId,
											{
												cleaningSwitchStatus: status,
											},
										)
									}
									className={clsx(
										"rounded-full px-2.5 py-1.5 text-xs font-semibold border",
										entry.cleaningSwitchStatus === status
											? "border-primary bg-primary text-on-primary"
											: "border-outline-variant/30 bg-surface-container text-on-surface",
									)}>
									{status}
								</button>
							))}
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

export { computeCleaningPrice };
