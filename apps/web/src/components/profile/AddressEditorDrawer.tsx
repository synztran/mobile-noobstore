"use client";

import {
  CitySearchInput,
  DistrictSearchInput,
  WardSearchInput,
} from "@/components/ui/CityDistrictSelect";
import { VIETNAM_CITIES } from "@/constants/vietnam-cities";
import { usePreventScroll } from "@/hooks/usePreventScroll";
import clsx from "clsx";
import { useFormik } from "formik";

import { memo, useEffect, useMemo } from "react";
import * as yup from "yup";

export type AddressFormValues = {
  fullName: string;
  address: string;
  phoneNumber: string;
  city: string;
  cityCode: string;
  district: string;
  districtCode: string;
  ward: string;
  wardCode: string;
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
      "Số điện thoại không hợp lệ (VD: 0901234567)"
    ),
  city: yup.string().trim().required("Vui lòng chọn tỉnh / thành phố"),
  cityCode: yup.string().trim().required("Mã tỉnh / thành phố là bắt buộc"),
  district: yup.string().trim().required("Quận / Huyện là bắt buộc"),
  districtCode: yup.string().trim().required("Mã quận / huyện là bắt buộc"),
  ward: yup.string().trim().required("Phường là bắt buộc"),
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
      VIETNAM_CITIES.find((c) => c.name === formik.values.city)?.code ?? null,
    [formik.values.city]
  );

  useEffect(() => {
    if (!open) return;
    if (isSubmitting) return;
    formik.resetForm({ values: initialValues });
  }, [open, initialValues, isSubmitting, formik.resetForm]);

  const handleCityChange = (city: string) => {
    formik.setFieldValue("city", city, true);
    formik.setFieldValue("cityCode", "", false);
    formik.setFieldValue("district", "", false);
    formik.setFieldValue("districtCode", "", false);
    formik.setFieldValue("ward", "", false);
    formik.setFieldTouched("city", true, true);
    formik.setFieldTouched("district", false, false);
  };

  const fieldClass = (hasError: boolean) =>
    clsx(
      "w-full bg-surface-container rounded-2xl px-4 py-3.5 border-2 outline-none text-sm text-on-surface disabled:opacity-60",
      hasError ? "border-error" : "border-transparent focus:border-primary"
    );

  return (
    <>
      <div
        className={clsx(
          "fixed inset-0 z-[78] !mt-0 bg-on-surface/30 backdrop-blur-sm transition-opacity duration-300",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <div
        className={clsx(
          "fixed left-0 right-0 z-[999] flex max-h-[90dvh] flex-col rounded-t-3xl bg-surface transition-all duration-300 ease-out",
          open ? "bottom-0" : "-bottom-full"
        )}
      >
        <div className="flex flex-shrink-0 justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-outline-variant" />
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-b border-outline-variant/20 px-5 pb-4 pt-2">
          <h2 className="text-lg font-black tracking-tight text-on-surface">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90"
          >
            Đóng
          </button>
        </div>

        <div className="hide-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-4">
          <form onSubmit={formik.handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Họ và tên <span className="normal-case text-primary">*</span>
              </label>
              <input
                name="fullName"
                value={formik.values.fullName}
                disabled={isSubmitting}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Nguyen Van A"
                className={fieldClass(
                  Boolean(formik.touched.fullName && formik.errors.fullName)
                )}
              />
              {formik.touched.fullName && formik.errors.fullName && (
                <p className="ml-1 mt-1 text-[10px] font-bold text-error">
                  {formik.errors.fullName}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Số điện thoại{" "}
                <span className="normal-case text-primary">*</span>
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
                    formik.touched.phoneNumber && formik.errors.phoneNumber
                  )
                )}
              />
              {formik.touched.phoneNumber && formik.errors.phoneNumber && (
                <p className="ml-1 mt-1 text-[10px] font-bold text-error">
                  {formik.errors.phoneNumber}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Tỉnh / Thành phố{" "}
                <span className="normal-case text-primary">*</span>
              </label>
              <CitySearchInput
                value={formik.values.city}
                onChange={handleCityChange}
                onCodeChange={(code) => {
                  formik.setFieldValue("cityCode", code, true);
                }}
                onBlur={() => formik.setFieldTouched("city", true, true)}
                disabled={isSubmitting}
                hasError={Boolean(formik.touched.city && formik.errors.city)}
              />
              {formik.touched.city && formik.errors.city && (
                <p className="ml-1 mt-1 text-[10px] font-bold text-error">
                  {formik.errors.city}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Quận / Huyện <span className="normal-case text-primary">*</span>
              </label>
              <DistrictSearchInput
                value={formik.values.district}
                onChange={(district) => {
                  formik.setFieldValue("district", district, true);
                  formik.setFieldTouched("district", true, true);
                  formik.setFieldValue("ward", "", false);
                }}
                onCodeChange={(code) => {
                  formik.setFieldValue("districtCode", code, true);
                }}
                onBlur={() => formik.setFieldTouched("district", true, true)}
                disabled={isSubmitting}
                hasError={Boolean(
                  formik.touched.district && formik.errors.district
                )}
                cityCode={cityCode}
              />
              {formik.touched.district && formik.errors.district && (
                <p className="ml-1 mt-1 text-[10px] font-bold text-error">
                  {formik.errors.district}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Phường / Xã <span className="normal-case text-primary">*</span>
              </label>
              <WardSearchInput
                value={formik.values.ward}
                onChange={(ward) => formik.setFieldValue("ward", ward, true)}
                onCodeChange={(code) =>
                  formik.setFieldValue("wardCode", code, true)
                }
                onBlur={() => formik.setFieldTouched("ward", true, true)}
                disabled={isSubmitting}
                hasError={Boolean(formik.touched.ward && formik.errors.ward)}
                cityName={formik.values.city}
                districtName={formik.values.district}
              />
              {formik.touched.ward && formik.errors.ward && (
                <p className="ml-1 mt-1 text-[10px] font-bold text-error">
                  {formik.errors.ward}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Địa chỉ chi tiết{" "}
                <span className="normal-case text-primary">*</span>
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
                  "w-full resize-none rounded-2xl border-2 bg-surface-container px-4 py-3.5 text-sm text-on-surface outline-none disabled:opacity-60",
                  formik.touched.address && formik.errors.address
                    ? "border-error"
                    : "border-transparent focus:border-primary"
                )}
              />
              {formik.touched.address && formik.errors.address && (
                <p className="ml-1 mt-1 text-[10px] font-bold text-error">
                  {formik.errors.address}
                </p>
              )}
            </div>

            <label
              className={clsx(
                "flex cursor-pointer items-center gap-3 rounded-2xl bg-surface-container px-4 py-3.5",
                isSubmitting && "cursor-not-allowed opacity-60"
              )}
            >
              <input
                type="checkbox"
                checked={formik.values.isDefault}
                disabled={isSubmitting}
                onChange={(e) =>
                  formik.setFieldValue("isDefault", e.target.checked)
                }
                className="checkbox-primary checkbox checkbox-sm"
              />
              <span className="text-sm font-semibold text-on-surface">
                Đặt làm địa chỉ mặc định
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="primary-gradient flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
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
