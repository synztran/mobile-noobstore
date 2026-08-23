"use client";

import type { AddressFormValues } from "@/components/profile/AddressEditorDrawer";
import AddressEditorDrawer from "@/components/profile/AddressEditorDrawer";
import Icon from "@/components/ui/Icon";
import { DISTRICT_MAP, VIETNAM_CITIES } from "@/constants/vietnam-cities";
import { usePreventScroll } from "@/hooks/usePreventScroll";
import { useAuth } from "@/lib/auth/AuthProvider";
import { withAuthRedirect } from "@/components/auth/withAuthRedirect";
import type { ProfileAddress } from "@/lib/data";
import { useProfileAddresses, useUpdateProfileAddresses } from "@/lib/react-query/user/api/useUserQueries";
import { toast } from "@/lib/toast";
import clsx from "clsx";
import { AlertTriangle, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function AddressCardSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-3xl bg-surface-container-lowest p-4 shadow-ambient-sm">
      <div className="h-4 w-32 rounded-full bg-surface-container-high" />
      <div className="h-3 w-full rounded-full bg-surface-container-high" />
      <div className="h-3 w-5/6 rounded-full bg-surface-container-high" />
      <div className="h-3 w-1/2 rounded-full bg-surface-container-high" />
    </div>
  );
}

function toFormValues(address?: ProfileAddress): AddressFormValues {
  if (!address) {
    return {
      fullName: "",
      address: "",
      phoneNumber: "",
      city: "",
      cityCode: "",
      district: "",
      districtCode: "",
      ward: "",
      wardCode: "",
      isDefault: false,
    };
  }

  const rawWardDistrict = String(address.district ?? "").trim();
  const [firstPart, secondPart] = rawWardDistrict
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const parsedWard = secondPart ? firstPart : rawWardDistrict;
  const parsedDistrict = secondPart ? secondPart : rawWardDistrict;

  return {
    fullName: address.full_name,
    address: address.address,
    phoneNumber: address.phone_number,
    city: address.city,
    cityCode: address.city_code || getCityCode(address.city),
    district: address.district || parsedDistrict,
    districtCode:
      address.district_code ||
      getDistrictCode(
        address.city_code || getCityCode(address.city),
        parsedDistrict
      ),
    ward: address.ward || parsedWard,
    wardCode: address.ward_code || "",
    isDefault: address.is_default,
  };
}

function getCityCode(cityName: string) {
  return VIETNAM_CITIES.find((c) => c.name === cityName)?.code ?? "";
}

function getDistrictCode(cityCode: string, districtName: string) {
  if (!cityCode) return "";
  const districts = DISTRICT_MAP[cityCode] ?? [];
  return districts.find((d) => d.name === districtName)?.code ?? "";
}

function normalizeAddressList(data: unknown): ProfileAddress[] {
  if (!Array.isArray(data)) return [];

  return data
    .map((item): ProfileAddress | null => {
      if (!item || typeof item !== "object") return null;
      const v = item as Record<string, unknown>;
      const id = String(v.id ?? "");
      if (!id) return null;
      const rawWardDistrict = String(v.district ?? "").trim();
      const [firstPart, secondPart] = rawWardDistrict
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const parsedWard = secondPart ? firstPart : rawWardDistrict;
      const parsedDistrict = secondPart ? secondPart : rawWardDistrict;

      return {
        id,
        user_id: String(v.user_id ?? ""),
        full_name: String(v.full_name ?? ""),
        address: String(v.address ?? ""),
        phone_number: String(v.phone_number ?? ""),
        city: String(v.city ?? ""),
        city_code:
          String(v.city_code ?? "") || getCityCode(String(v.city ?? "")),
        district: String(v.district ?? "") || parsedDistrict,
        ward: String(v.ward ?? "") || parsedWard,
        district_code:
          String(v.district_code ?? "") ||
          getDistrictCode(
            String(v.city_code ?? "") || getCityCode(String(v.city ?? "")),
            String(v.district ?? "") || parsedDistrict
          ),
        ward_code: String(v.ward_code ?? ""),
        is_default: Boolean(v.is_default),
        created_at: String(v.created_at ?? ""),
        updated_at: String(v.updated_at ?? ""),
      };
    })
    .filter((v): v is ProfileAddress => v !== null)
    .sort((a, b) => Number(b.is_default) - Number(a.is_default));
}

function ProfileAddressesPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshProfile } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: profileData, isLoading: loadingAddresses } = useProfileAddresses(
    !authLoading && !!user
  );
  const updateAddressesMutation = useUpdateProfileAddresses();

  const addresses = useMemo(
    () => normalizeAddressList(profileData?.addresses),
    [profileData?.addresses]
  );

  usePreventScroll(drawerOpen || Boolean(deleteConfirmId));

  const editingAddress = useMemo(
    () =>
      editingAddressId
        ? (addresses.find((a) => a.id === editingAddressId) ?? null)
        : null,
    [addresses, editingAddressId]
  );

  const deletingAddress = useMemo(
    () =>
      deleteConfirmId
        ? (addresses.find((a) => a.id === deleteConfirmId) ?? null)
        : null,
    [addresses, deleteConfirmId]
  );

  // authentication redirect handled by withAuthRedirect HOC

  const persistAddresses = async (next: ProfileAddress[]) => {
    try {
      const payload = next.map((a) => ({
        full_name: a.full_name,
        address: a.address,
        phone_number: a.phone_number,
        city: a.city,
        city_code: a.city_code,
        district: a.district,
        ward: a.ward,
        district_code: a.district_code,
        ward_code: a.ward_code,
        is_default: a.is_default,
      }));

      await updateAddressesMutation.mutateAsync(payload);
      await refreshProfile();
      toast.success("Đã cập nhật địa chỉ");
      setDrawerOpen(false);
      setEditingAddressId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu địa chỉ");
    }
  };

  const openCreateDrawer = () => {
    setEditingAddressId(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (addressId: string) => {
    setEditingAddressId(addressId);
    setDrawerOpen(true);
  };

  const handleSaveAddress = async (values: AddressFormValues) => {
    const hasEditing = Boolean(editingAddress);
    const editingId = editingAddress?.id ?? "";
    const shouldDefault = values.isDefault || addresses.length === 0;

    const withoutCurrent = hasEditing
      ? addresses.filter((a) => a.id !== editingId)
      : addresses;

    const nextAddress: ProfileAddress = {
      id: hasEditing ? editingId : `tmp-${Date.now()}`,
      user_id: editingAddress?.user_id ?? user?.id ?? "",
      full_name: values.fullName.trim(),
      address: values.address.trim(),
      phone_number: values.phoneNumber.trim(),
      city: values.city.trim(),
      city_code: values.cityCode.trim() || getCityCode(values.city.trim()),
      district: values.district.trim(),
      ward: values.ward.trim(),
      district_code:
        values.districtCode.trim() ||
        getDistrictCode(
          values.cityCode.trim() || getCityCode(values.city.trim()),
          values.district.trim()
        ),
      ward_code: values.wardCode.trim(),
      is_default: shouldDefault,
      created_at: editingAddress?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let next = [nextAddress, ...withoutCurrent];
    if (shouldDefault) {
      next = next.map((a) => ({
        ...a,
        is_default: a.id === nextAddress.id,
      }));
    }

    if (!next.some((a) => a.is_default) && next.length > 0) {
      next = next.map((a, idx) => ({ ...a, is_default: idx === 0 }));
    }

    await persistAddresses(next);
  };

  const handleDeleteAddress = async (addressId: string) => {
    const target = addresses.find((a) => a.id === addressId);
    if (!target) return;

    let next = addresses.filter((a) => a.id !== addressId);
    if (target.is_default && next.length > 0) {
      next = next.map((a, idx) => ({ ...a, is_default: idx === 0 }));
    }

    setDeleteConfirmId(null);
    await persistAddresses(next);
  };

  const openDeleteConfirm = (addressId: string) => {
    const target = addresses.find((a) => a.id === addressId);
    if (!target) return;
    setDeleteConfirmId(addressId);
  };

  if (authLoading) {
    return (
      <div className="space-y-4 px-4 pb-24 pt-4">
        {[1, 2].map((i) => (
          <AddressCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  let addressContent: React.ReactNode;
  if (loadingAddresses) {
    addressContent = (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <AddressCardSkeleton key={i} />
        ))}
      </div>
    );
  } else if (addresses.length === 0) {
    addressContent = (
      <div className="rounded-3xl bg-surface-container p-8 text-center">
        <p className="mt-3 text-sm font-semibold text-on-surface-variant">
          Bạn chưa có địa chỉ nào
        </p>
        <button
          type="button"
          onClick={openCreateDrawer}
          className="primary-gradient mt-4 h-11 rounded-2xl px-5 text-xs font-black uppercase tracking-widest text-white"
        >
          Thêm địa chỉ đầu tiên
        </button>
      </div>
    );
  } else {
    addressContent = (
      <div className="space-y-3">
        {addresses.map((address) => (
          <div
            key={address.id}
            className="space-y-2 rounded-3xl bg-surface-container-lowest p-4 shadow-ambient-sm"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black text-on-surface">
                    {address.full_name}
                  </p>
                  {address.is_default && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-on-primary">
                      Mặc định
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {address.address}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {[address.ward, address.district, address.city]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {address.phone_number}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEditDrawer(address.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container transition-transform active:scale-90"
                >
                  <Icon name="edit" className="text-sm text-on-surface" />
                </button>
                <button
                  type="button"
                  onClick={() => openDeleteConfirm(address.id)}
                  disabled={updateAddressesMutation.isPending}
                  className={clsx(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-transform active:scale-90",
                    updateAddressesMutation.isPending
                      ? "bg-surface-container text-outline-variant"
                      : "bg-error/10 text-error"
                  )}
                >
                  <Trash className="text-red-400" size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pb-24 pt-2">
      <div className="mb-2 flex items-center gap-3">
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container transition-transform active:scale-90"
        >
          <Icon name="arrow_back" className="text-on-surface" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black tracking-tight text-on-surface">
            Địa chỉ giao hàng
          </h1>
          <p className="text-xs text-on-surface-variant">
            Quản lý địa chỉ nhận hàng của bạn
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateDrawer}
          className="primary-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white transition-transform active:scale-90"
        >
          <Icon name="add" className="text-white" />
        </button>
      </div>

      {addressContent}

      {deleteConfirmId && deletingAddress && (
        <>
          <div
            className={clsx(
              "fixed inset-0 z-[78] !mt-0 bg-on-surface/30 backdrop-blur-sm transition-opacity duration-300",
              "pointer-events-auto opacity-100"
            )}
            onClick={() => {
              if (updateAddressesMutation.isPending) return;
              setDeleteConfirmId(null);
            }}
          />

          <div
            className={clsx(
              "fixed bottom-0 left-0 right-0 z-[999] flex max-h-[80dvh] flex-col rounded-t-3xl bg-surface transition-all duration-300 ease-out"
            )}
          >
            <div className="flex flex-shrink-0 justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-outline-variant" />
            </div>

            <div className="space-y-4 px-5 pb-6 pt-2">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
                  <AlertTriangle size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-black tracking-tight text-on-surface">
                    Xoá địa chỉ này?
                  </h3>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {deletingAddress.full_name} • {deletingAddress.address},{" "}
                    {[
                      deletingAddress.ward,
                      deletingAddress.district,
                      deletingAddress.city,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={updateAddressesMutation.isPending}
                  onClick={() => setDeleteConfirmId(null)}
                  className="h-11 rounded-2xl bg-surface-container text-xs font-black uppercase tracking-widest text-on-surface disabled:opacity-50"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  disabled={updateAddressesMutation.isPending}
                  onClick={() => {
                    void handleDeleteAddress(deleteConfirmId);
                  }}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-error text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                >
                  {updateAddressesMutation.isPending ? (
                    <>
                      <span className="loading loading-spinner loading-xs" />
                      Đang xoá...
                    </>
                  ) : (
                    "Xoá địa chỉ"
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <AddressEditorDrawer
        open={drawerOpen}
        onClose={() => {
          if (updateAddressesMutation.isPending) return;
          setDrawerOpen(false);
          setEditingAddressId(null);
        }}
        onSubmit={handleSaveAddress}
        title={editingAddress ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
        initialValues={toFormValues(editingAddress ?? undefined)}
        isSubmitting={updateAddressesMutation.isPending}
      />
    </div>
  );
}

export default withAuthRedirect(ProfileAddressesPage);
