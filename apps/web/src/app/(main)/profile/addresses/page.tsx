"use client";

import type { AddressFormValues } from "@/components/profile/AddressEditorDrawer";
import AddressEditorDrawer from "@/components/profile/AddressEditorDrawer";
import Icon from "@/components/ui/Icon";
import { DISTRICT_MAP, VIETNAM_CITIES } from "@/constants/vietnam-cities";
import { usePreventScroll } from "@/hooks/usePreventScroll";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { ProfileAddress } from "@/lib/data";
import { toast } from "@/lib/toast";
import clsx from "clsx";
import { AlertTriangle, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function AddressCardSkeleton() {
	return (
		<div className="bg-surface-container-lowest rounded-3xl p-4 shadow-ambient-sm animate-pulse space-y-3">
			<div className="h-4 w-32 bg-surface-container-high rounded-full" />
			<div className="h-3 w-full bg-surface-container-high rounded-full" />
			<div className="h-3 w-5/6 bg-surface-container-high rounded-full" />
			<div className="h-3 w-1/2 bg-surface-container-high rounded-full" />
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
			wardDistrict: "",
			wardDistrictCode: "",
			isDefault: false,
		};
	}

	return {
		fullName: address.full_name,
		address: address.address,
		phoneNumber: address.phone_number,
		city: address.city,
		cityCode: address.city_code || getCityCode(address.city),
		wardDistrict: address.ward_district,
		wardDistrictCode:
			address.ward_district_code ||
			getDistrictCode(
				address.city_code || getCityCode(address.city),
				address.ward_district,
			),
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
			return {
				id,
				user_id: String(v.user_id ?? ""),
				full_name: String(v.full_name ?? ""),
				address: String(v.address ?? ""),
				phone_number: String(v.phone_number ?? ""),
				city: String(v.city ?? ""),
				city_code:
					String(v.city_code ?? "") ||
					getCityCode(String(v.city ?? "")),
				ward_district: String(v.ward_district ?? ""),
				ward_district_code:
					String(v.ward_district_code ?? "") ||
					getDistrictCode(
						String(v.city_code ?? "") ||
							getCityCode(String(v.city ?? "")),
						String(v.ward_district ?? ""),
					),
				is_default: Boolean(v.is_default),
				created_at: String(v.created_at ?? ""),
				updated_at: String(v.updated_at ?? ""),
			};
		})
		.filter((v): v is ProfileAddress => v !== null)
		.sort((a, b) => Number(b.is_default) - Number(a.is_default));
}

export default function ProfileAddressesPage() {
	const router = useRouter();
	const { user, loading: authLoading, refreshProfile } = useAuth();

	const [addresses, setAddresses] = useState<ProfileAddress[]>([]);
	const [loadingAddresses, setLoadingAddresses] = useState(true);
	const [saving, setSaving] = useState(false);

	const [drawerOpen, setDrawerOpen] = useState(false);
	const [editingAddressId, setEditingAddressId] = useState<string | null>(
		null,
	);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	usePreventScroll(drawerOpen || Boolean(deleteConfirmId));

	const editingAddress = useMemo(
		() =>
			editingAddressId
				? (addresses.find((a) => a.id === editingAddressId) ?? null)
				: null,
		[addresses, editingAddressId],
	);

	const deletingAddress = useMemo(
		() =>
			deleteConfirmId
				? (addresses.find((a) => a.id === deleteConfirmId) ?? null)
				: null,
		[addresses, deleteConfirmId],
	);

	const fetchProfileAddresses = useCallback(async () => {
		setLoadingAddresses(true);
		try {
			const res = await fetch("/api/user/profile", {
				credentials: "include",
			});
			if (res.status === 401) {
				router.push("/login");
				return;
			}
			if (!res.ok) {
				toast.error("Không thể tải địa chỉ");
				return;
			}
			const data = (await res.json()) as { addresses?: unknown };
			setAddresses(normalizeAddressList(data.addresses));
		} catch {
			toast.error("Không thể tải địa chỉ");
		} finally {
			setLoadingAddresses(false);
		}
	}, [router]);

	useEffect(() => {
		if (!authLoading && !user) {
			router.push("/login");
		}
	}, [authLoading, user, router]);

	useEffect(() => {
		if (!authLoading && user) {
			fetchProfileAddresses();
		}
	}, [authLoading, user, fetchProfileAddresses]);

	const persistAddresses = async (next: ProfileAddress[]) => {
		setSaving(true);
		try {
			const payload = next.map((a) => ({
				full_name: a.full_name,
				address: a.address,
				phone_number: a.phone_number,
				city: a.city,
				city_code: a.city_code,
				ward_district: a.ward_district,
				ward_district_code: a.ward_district_code,
				is_default: a.is_default,
			}));

			const res = await fetch("/api/user/profile", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ addresses: payload }),
			});

			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				throw new Error(data.error ?? "Save failed");
			}

			const data = (await res.json()) as { addresses?: unknown };
			setAddresses(normalizeAddressList(data.addresses));
			await refreshProfile();
			toast.success("Đã cập nhật địa chỉ");
			setDrawerOpen(false);
			setEditingAddressId(null);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Không thể lưu địa chỉ",
			);
		} finally {
			setSaving(false);
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
			city_code:
				values.cityCode.trim() || getCityCode(values.city.trim()),
			ward_district: values.wardDistrict.trim(),
			ward_district_code:
				values.wardDistrictCode.trim() ||
				getDistrictCode(
					values.cityCode.trim() || getCityCode(values.city.trim()),
					values.wardDistrict.trim(),
				),
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

		setSaving(true);
		try {
			setDeleteConfirmId(null);
			await persistAddresses(next);
		} finally {
			setSaving(false);
		}
	};

	const openDeleteConfirm = (addressId: string) => {
		const target = addresses.find((a) => a.id === addressId);
		if (!target) return;
		setDeleteConfirmId(addressId);
	};

	if (authLoading) {
		return (
			<div className="px-4 pt-4 pb-24 space-y-4">
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
			<div className="bg-surface-container rounded-3xl p-8 text-center">
				<p className="mt-3 text-on-surface-variant font-semibold text-sm">
					Bạn chưa có địa chỉ nào
				</p>
				<button
					type="button"
					onClick={openCreateDrawer}
					className="mt-4 h-11 px-5 rounded-2xl primary-gradient text-white font-black text-xs uppercase tracking-widest">
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
						className="bg-surface-container-lowest rounded-3xl p-4 shadow-ambient-sm space-y-2">
						<div className="flex items-start gap-2">
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 flex-wrap">
									<p className="text-on-surface font-black text-sm">
										{address.full_name}
									</p>
									{address.is_default && (
										<span className="text-[9px] font-black uppercase tracking-wider bg-primary text-on-primary px-2 py-0.5 rounded-full">
											Mặc định
										</span>
									)}
								</div>
								<p className="text-xs text-on-surface-variant mt-1">
									{address.address}
								</p>
								<p className="text-xs text-on-surface-variant">
									{address.ward_district}, {address.city}
								</p>
								<p className="text-xs text-on-surface-variant">
									{address.phone_number}
								</p>
							</div>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => openEditDrawer(address.id)}
									className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center active:scale-90 transition-transform">
									<Icon
										name="edit"
										className="text-on-surface text-sm"
									/>
								</button>
								<button
									type="button"
									onClick={() =>
										openDeleteConfirm(address.id)
									}
									disabled={saving}
									className={clsx(
										"w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform",
										saving
											? "bg-surface-container text-outline-variant"
											: "bg-error/10 text-error",
									)}>
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
		<div className="px-4 pt-2 pb-24 space-y-5">
			<div className="flex items-center gap-3 mb-2">
				<Link
					href="/profile"
					className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center active:scale-90 transition-transform">
					<Icon name="arrow_back" className="text-on-surface" />
				</Link>
				<div className="flex-1 min-w-0">
					<h1 className="text-xl font-black text-on-surface tracking-tight">
						Địa chỉ giao hàng
					</h1>
					<p className="text-xs text-on-surface-variant">
						Quản lý địa chỉ nhận hàng của bạn
					</p>
				</div>
				<button
					type="button"
					onClick={openCreateDrawer}
					className="w-9 h-9 rounded-xl primary-gradient text-white flex items-center justify-center active:scale-90 transition-transform">
					<Icon name="add" className="text-white" />
				</button>
			</div>

			{addressContent}

			{deleteConfirmId && deletingAddress && (
				<>
					<div
						className={clsx(
							"fixed inset-0 bg-on-surface/30 backdrop-blur-sm z-[78] transition-opacity duration-300 !mt-0",
							"opacity-100 pointer-events-auto",
						)}
						onClick={() => {
							if (saving) return;
							setDeleteConfirmId(null);
						}}
					/>

					<div
						className={clsx(
							"fixed left-0 right-0 z-[999] bg-surface rounded-t-3xl transition-all duration-300 ease-out max-h-[80dvh] flex flex-col bottom-0",
						)}>
						<div className="flex justify-center pt-3 pb-1 flex-shrink-0">
							<div className="w-10 h-1 bg-outline-variant rounded-full" />
						</div>

						<div className="px-5 pt-2 pb-6 space-y-4">
							<div className="flex items-start gap-3">
								<div className="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center flex-shrink-0">
									<AlertTriangle size={18} />
								</div>
								<div className="min-w-0 flex-1">
									<h3 className="text-base font-black text-on-surface tracking-tight">
										Xoá địa chỉ này?
									</h3>
									<p className="text-xs text-on-surface-variant mt-1">
										{deletingAddress.full_name} •{" "}
										{deletingAddress.address},{" "}
										{deletingAddress.ward_district},{" "}
										{deletingAddress.city}
									</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-2 pt-1">
								<button
									type="button"
									disabled={saving}
									onClick={() => setDeleteConfirmId(null)}
									className="h-11 rounded-2xl bg-surface-container text-on-surface font-black text-xs uppercase tracking-widest disabled:opacity-50">
									Huỷ
								</button>
								<button
									type="button"
									disabled={saving}
									onClick={() => {
										void handleDeleteAddress(
											deleteConfirmId,
										);
									}}
									className="h-11 rounded-2xl bg-error text-white font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2">
									{saving ? (
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
					if (saving) return;
					setDrawerOpen(false);
					setEditingAddressId(null);
				}}
				onSubmit={handleSaveAddress}
				title={
					editingAddress ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"
				}
				initialValues={toFormValues(editingAddress ?? undefined)}
				isSubmitting={saving}
			/>
		</div>
	);
}
