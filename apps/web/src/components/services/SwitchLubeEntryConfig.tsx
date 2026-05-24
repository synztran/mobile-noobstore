"use client";

import type { BookingOption } from "@/app/api/services/booking-config/route";
import { formatVND } from "@/lib/currency";
import clsx from "clsx";
import {
	SWITCH_STATUS_OPTIONS,
	SWITCH_TYPE_OPTIONS,
	computeSwitchLubePrice,
} from "./bookingHelpers";
import { GreaseSearchSelect } from "./GreaseSearchSelect";
import { QuantityStepper } from "./QuantityStepper";
import type { ServiceEntryDraft } from "./types";

interface SwitchLubeEntryConfigProps {
	entry: ServiceEntryDraft;
	serviceId: string;
	greaseOption: BookingOption | undefined;
	onUpdateEntry: (
		serviceId: string,
		entryId: string,
		update: Partial<ServiceEntryDraft>,
	) => void;
}

export function SwitchLubeEntryConfig({
	entry,
	serviceId,
	greaseOption,
	onUpdateEntry,
}: SwitchLubeEntryConfigProps) {
	const selectedGreaseAdj = greaseOption
		? (greaseOption.values.find(
				(v) =>
					v.id === entry.selectedByOptionId[String(greaseOption.id)],
			)?.price_adjustment ?? 0)
		: 0;
	const totalPreviewPrice =
		computeSwitchLubePrice(entry) +
		(entry.switchCount ?? 0) * selectedGreaseAdj;

	return (
		<div className="space-y-3">
			<div className="space-y-1.5">
				<p className="text-[11px] font-bold text-on-surface-variant">
					Số lượng switch <span className="text-error">*</span>
				</p>
				<QuantityStepper
					value={entry.switchCount}
					onChange={(v) =>
						onUpdateEntry(serviceId, entry.entryId, {
							switchCount: v,
						})
					}
					unit="switch"
					maxW
				/>
			</div>

			<div className="space-y-1.5">
				<p className="text-[11px] font-bold text-on-surface-variant">
					Loại switch <span className="text-error">*</span>
				</p>
				<div className="flex gap-2 flex-wrap">
					{SWITCH_TYPE_OPTIONS.map(
						({ type, label, pricePerUnit }) => (
							<button
								key={type}
								type="button"
								onClick={() =>
									onUpdateEntry(serviceId, entry.entryId, {
										switchType: type,
									})
								}
								className={clsx(
									"rounded-xl px-3 py-1.5 text-[11px] font-semibold border",
									entry.switchType === type
										? "border-primary bg-primary text-primary-content"
										: "border-base-200 bg-base-100 text-on-surface",
								)}>
								{label}
								<span className="ml-1 opacity-75 text-[10px]">
									{formatVND(pricePerUnit)}/switch
								</span>
							</button>
						),
					)}
				</div>
			</div>

			<div className="space-y-1.5">
				<p className="text-[11px] font-bold text-on-surface-variant">
					Tình trạng switch <span className="text-error">*</span>
				</p>
				<div className="flex flex-wrap gap-1.5">
					{SWITCH_STATUS_OPTIONS.map(
						({ status, label, adjustment }) => (
							<button
								key={status}
								type="button"
								onClick={() =>
									onUpdateEntry(serviceId, entry.entryId, {
										switchStatus: status,
									})
								}
								className={clsx(
									"rounded-xl px-2.5 py-1.5 text-[11px] font-semibold border text-left",
									entry.switchStatus === status
										? "border-primary bg-primary text-primary-content"
										: "border-base-200 bg-base-100 text-on-surface",
								)}>
								{label}
								{adjustment !== 0 ? (
									<span className="ml-1 opacity-75 text-[10px]">
										{adjustment > 0 ? "+" : ""}
										{formatVND(adjustment)}
									</span>
								) : null}
							</button>
						),
					)}
				</div>
			</div>

			{greaseOption ? (
				<div className="space-y-1.5">
					<p className="text-[11px] font-bold text-on-surface-variant">
						Loại grease <span className="text-error">*</span>
					</p>
					<GreaseSearchSelect
						option={greaseOption}
						selectedValueId={
							entry.selectedByOptionId[String(greaseOption.id)] ??
							null
						}
						onSelect={(valueId) =>
							onUpdateEntry(serviceId, entry.entryId, {
								selectedByOptionId: {
									...entry.selectedByOptionId,
									[String(greaseOption.id)]: valueId,
								},
							})
						}
					/>
				</div>
			) : null}

			{entry.switchCount && entry.switchType && entry.switchStatus ? (
				<p className="text-[11px] text-on-surface-variant">
					Tạm tính: <strong>{formatVND(totalPreviewPrice)}</strong>
				</p>
			) : null}
		</div>
	);
}

export { computeSwitchLubePrice };
