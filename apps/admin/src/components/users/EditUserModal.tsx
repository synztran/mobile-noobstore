"use client";

import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type UserAddress = {
  id: string;
  full_name: string;
  address: string;
  phone_number: string;
  city: string;
  ward_district: string;
  is_default: boolean;
};

type WishlistItem = {
  id: string;
  added_at: string;
  product: {
    id: string;
    name: string;
    slug: string;
    thumbnail: string | null;
    base_price: number | null;
  } | null;
};

type UserRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  role: string;
  created_at: string;
  user_addresses?: UserAddress[] | null;
  wishlists?: WishlistItem[] | null;
};

type Props = {
  user: UserRow;
};

const USER_ROLES = ["user", "staff", "admin"];

export default function EditUserModal({ user }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(user.first_name ?? "");
  const [lastName, setLastName] = useState(user.last_name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user.phone_number ?? "");
  const [role, setRole] = useState(user.role ?? "user");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFirstName(user.first_name ?? "");
    setLastName(user.last_name ?? "");
    setPhoneNumber(user.phone_number ?? "");
    setRole(user.role ?? "user");
  }, [open, user]);

  const addresses = user.user_addresses ?? [];
  const wishlists = user.wishlists ?? [];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone_number: phoneNumber.trim() || null,
        role,
      }),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Failed to update user");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Edit User
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 transition-colors hover:bg-slate-100"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      First Name
                    </label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm input-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Last Name
                    </label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm input-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Last name"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Email
                    </label>
                    <input
                      value={user.email}
                      disabled
                      className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 dark:bg-slate-600 px-3 py-2 text-sm text-slate-500 dark:text-slate-400"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Email cannot be changed.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Phone Number
                    </label>
                    <input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm input-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Phone number"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm input-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {USER_ROLES.map((roleOption) => (
                        <option key={roleOption} value={roleOption}>
                          {roleOption}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Joined
                    </label>
                    <input
                      value={new Date(user.created_at).toLocaleString("vi-VN")}
                      disabled
                      className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 dark:bg-slate-600 px-3 py-2 text-sm text-slate-500 dark:text-slate-400"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Addresses
                    </h3>
                    <span className="text-xs text-slate-500">
                      {addresses.length} total
                    </span>
                  </div>
                  {addresses.length > 0 ? (
                    <div className="space-y-2">
                      {addresses.map((address) => (
                        <div
                          key={address.id}
                          className="rounded-md border border-slate-100 bg-slate-50 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900">
                              {address.full_name}
                            </p>
                            {address.is_default && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-700">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-600">
                            {address.phone_number}
                          </p>
                          <p className="text-xs text-slate-600">
                            {address.address}, {address.ward_district},{" "}
                            {address.city}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No addresses found.
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Wishlists
                    </h3>
                    <span className="text-xs text-slate-500">
                      {wishlists.length} items
                    </span>
                  </div>
                  {wishlists.length > 0 ? (
                    <div className="space-y-2">
                      {wishlists.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50 p-3"
                        >
                          {item.product?.thumbnail ? (
                            <img
                              src={item.product.thumbnail}
                              alt={item.product.name}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-slate-200" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {item.product?.name ?? "Unknown product"}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              /{item.product?.slug ?? "-"}
                            </p>
                            <p className="text-xs text-slate-500">
                              Added{" "}
                              {new Date(item.added_at).toLocaleDateString(
                                "vi-VN"
                              )}
                            </p>
                          </div>
                          <div className="shrink-0 text-xs text-slate-600">
                            {item.product?.base_price !== null &&
                            item.product?.base_price !== undefined
                              ? `${item.product.base_price.toLocaleString("vi-VN")}₫`
                              : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No wishlist items.</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
