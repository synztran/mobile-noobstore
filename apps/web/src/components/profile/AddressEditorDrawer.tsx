"use client";

import {
	CitySearchInput,
	DistrictSearchInput,
} from "@/components/ui/CityDistrictSelect";
import { VIETNAM_CITIES } from "@/constants/vietnam-cities";
import { usePreventScroll } from "@/hooks/usePreventScroll";
import clsx from "clsx";
import { useFormik } from "formik";
import { X } from "lucide-react";
import { memo, useEffect, useMemo } from "react";
import * as yup from "yup";

export type AddressFormValues = {
	fullName: string;
	address: string;
	phoneNumber: string;
	city: string;
	cityCode: string;
	wardDistrict: string;
	wardDistrictCode: string;
	isDefault: boolean;
};

type Props = {
	open: boolean;
	onClose: () => void;
	onSubmit: (values: AddressFormValues) => Promise<void>;
	title: string;
	initialValues: AddressFormValues;
	isSubmitting: boolean;
};

const addressSchema = yup.object({
	fullName: yup
		.string()
		.trim()
		.required("Họ và tên là bắt buộc")
		.min(2, "Họ và tên phải có ít nhất 2 ký tự"),
	phoneNumber: yup
		.string()
		.trim()
		.required("Số điện thoại là bắt buộc")
		.matches(
			/^(0[35789])\d{8}$/,
			"Số điện thoại không hợp lệ (VD: 0901234567)",
		),
	city: yup.string().trim().required("Vui lòng chọn tỉnh / thành phố"),
	cityCode: yup.string().trim().required("Mã tỉnh / thành phố là bắt buộc"),
	wardDistrict: yup.string().trim().required("Phường / Quận là bắt buộc"),
	wardDistrictCode: yup
		.string()
		.trim()
		.required("Mã phường / quận là bắt buộc"),
	address: yup.string().trim(),
});

const AddressEditorDrawer = ({
	open,
	onClose,
	onSubmit,
	title,
	initialValues,
	isSubmitting,
}: Props) => {
	usePreventScroll(open);

	const formik = useFormik<AddressFormValues>({
		initialValues,
		enableReinitialize: true,
		validationSchema: addressSchema,
		onSubmit,
	});

	const cityCode = useMemo(
		() =>
			VIETNAM_CITIES.find((c) => c.name === formik.values.city)?.code ??
			null,
		[formik.values.city],
	);

	useEffect(() => {
		if (!open) return;
		if (isSubmitting) return;
		formik.resetForm({ values: initialValues });
	}, [open, initialValues, isSubmitting, formik.resetForm]);

	const handleCityChange = (city: string) => {
		formik.setFieldValue("city", city, true);
		formik.setFieldValue("cityCode", "", false);
		formik.setFieldValue("wardDistrict", "", false);
		formik.setFieldValue("wardDistrictCode", "", false);
		formik.setFieldTouched("city", true, true);
		formik.setFieldTouched("wardDistrict", false, false);
	};

	const fieldClass = (hasError: boolean) =>
		clsx(
			"w-full bg-surface-container rounded-2xl px-4 py-3.5 border-2 outline-none text-sm text-on-surface disabled:opacity-60",
			hasError
				? "border-error"
				: "border-transparent focus:border-primary",
		);

	return (
		<>
			<div
				className={clsx(
					"fixed inset-0 bg-on-surface/30 backdrop-blur-sm z-[78] transition-opacity duration-300 !mt-0",
					open
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none",
				)}
				onClick={onClose}
			/>

			<div
				className={clsx(
					"fixed left-0 right-0 z-[999] bg-surface rounded-t-3xl transition-all duration-300 ease-out max-h-[90dvh] flex flex-col",
					open ? "bottom-0" : "-bottom-full",
				)}>
				<div className="flex justify-center pt-3 pb-1 flex-shrink-0">
					<div className="w-10 h-1 bg-outline-variant rounded-full" />
				</div>

				<div className="flex items-center justify-between px-5 pt-2 pb-4 flex-shrink-0 border-b border-outline-variant/20">
					<h2 className="text-lg font-black text-on-surface tracking-tight">
						{title}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center active:scale-90 transition-transform">
						<X size={18} className="text-on-surface" />
					</button>
				</div>

				<div className="overflow-y-auto flex-1 px-5 pt-4 pb-8 hide-scrollbar">
					<form onSubmit={formik.handleSubmit} className="space-y-4">
						{/* ── Full name ── */}
						<div>
							<label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
								Họ và tên{" "}
								<span className="text-primary normal-case">
									*
								</span>
							</label>
							<input
								name="fullName"
								value={formik.values.fullName}
								disabled={isSubmitting}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								placeholder="Nguyen Van A"
								className={fieldClass(
									Boolean(
										formik.touched.fullName &&
										formik.errors.fullName,
									),
								)}
							/>
							{formik.touched.fullName &&
								formik.errors.fullName && (
									<p className="text-error text-[10px] font-bold mt-1 ml-1">
										{formik.errors.fullName}
									</p>
								)}
						</div>

						{/* ── Phone ── */}
						<div>
							<label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
								Số điện thoại{" "}
								<span className="text-primary normal-case">
									*
								</span>
							</label>
							<input
								name="phoneNumber"
								value={formik.values.phoneNumber}
								disabled={isSubmitting}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								placeholder="0901234567"
								type="tel"
								className={fieldClass(
									Boolean(
										formik.touched.phoneNumber &&
										formik.errors.phoneNumber,
									),
								)}
							/>
							{formik.touched.phoneNumber &&
								formik.errors.phoneNumber && (
									<p className="text-error text-[10px] font-bold mt-1 ml-1">
										{formik.errors.phoneNumber}
									</p>
								)}
						</div>

						{/* ── City (searchable) ── */}
						<div>
							<label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
								Tỉnh / Thành phố{" "}
								<span className="text-primary normal-case">
									*
								</span>
							</label>
							<CitySearchInput
								value={formik.values.city}
								onChange={handleCityChange}
								onCodeChange={(code) => {
									formik.setFieldValue(
										"cityCode",
										code,
										true,
									);
								}}
								onBlur={() =>
									formik.setFieldTouched("city", true, true)
								}
								disabled={isSubmitting}
								hasError={Boolean(
									formik.touched.city && formik.errors.city,
								)}
							/>
							{formik.touched.city && formik.errors.city && (
								<p className="text-error text-[10px] font-bold mt-1 ml-1">
									{formik.errors.city}
								</p>
							)}
						</div>

						{/* ── Ward / District ── */}
						<div>
							<label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
								Phường / Quận{" "}
								<span className="text-primary normal-case">
									*
								</span>
							</label>
							<DistrictSearchInput
								value={formik.values.wardDistrict}
								onChange={(district) => {
									formik.setFieldValue(
										"wardDistrict",
										district,
										true,
									);
									formik.setFieldTouched(
										"wardDistrict",
										true,
										true,
									);
								}}
								onCodeChange={(code) => {
									formik.setFieldValue(
										"wardDistrictCode",
										code,
										true,
									);
								}}
								onBlur={() =>
									formik.setFieldTouched(
										"wardDistrict",
										true,
										true,
									)
								}
								disabled={isSubmitting}
								hasError={Boolean(
									formik.touched.wardDistrict &&
									formik.errors.wardDistrict,
								)}
								cityCode={cityCode}
							/>
							{formik.touched.wardDistrict &&
								formik.errors.wardDistrict && (
									<p className="text-error text-[10px] font-bold mt-1 ml-1">
										{formik.errors.wardDistrict}
									</p>
								)}
						</div>

						{/* ── Address detail ── */}
						<div>
							<label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
								Địa chỉ chi tiết{" "}
								<span className="text-primary normal-case">
									*
								</span>
							</label>
							<textarea
								name="address"
								value={formik.values.address}
								disabled={isSubmitting}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								rows={3}
								placeholder="123 Đường Nguyễn Huệ"
								className={clsx(
									"w-full bg-surface-container rounded-2xl px-4 py-3.5 border-2 outline-none text-sm text-on-surface resize-none disabled:opacity-60",
									formik.touched.address &&
										formik.errors.address
										? "border-error"
										: "border-transparent focus:border-primary",
								)}
							/>
							{formik.touched.address &&
								formik.errors.address && (
									<p className="text-error text-[10px] font-bold mt-1 ml-1">
										{formik.errors.address}
									</p>
								)}
						</div>

						{/* ── Is default ── */}
						<label
							className={clsx(
								"flex items-center gap-3 bg-surface-container rounded-2xl px-4 py-3.5 cursor-pointer",
								isSubmitting && "opacity-60 cursor-not-allowed",
							)}>
							<input
								type="checkbox"
								checked={formik.values.isDefault}
								disabled={isSubmitting}
								onChange={(e) =>
									formik.setFieldValue(
										"isDefault",
										e.target.checked,
									)
								}
								className="checkbox checkbox-sm checkbox-primary"
							/>
							<span className="text-sm font-semibold text-on-surface">
								Đặt làm địa chỉ mặc định
							</span>
						</label>

						{/* ── Submit ── */}
						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full h-12 rounded-2xl primary-gradient text-white font-black uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
							{isSubmitting ? (
								<>
									<span className="loading loading-spinner loading-sm" />
									Đang lưu...
								</>
							) : (
								"Lưu địa chỉ"
							)}
						</button>
					</form>
				</div>
			</div>
		</>
	);
};

export default memo(AddressEditorDrawer);
