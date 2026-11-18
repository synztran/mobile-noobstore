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
  is_default: boolean;
  district?: string | null;
  ward?: string | null;
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
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--admin-hover))] text-[rgb(var(--admin-text-secondary))] transition-colors hover:bg-[rgb(var(--admin-border))] hover:text-[rgb(var(--admin-text))]"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[rgb(var(--admin-border))] bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[rgb(var(--admin-border))] px-5 py-4">
              <h2 className="text-sm font-semibold text-heading">Edit User</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-[rgb(var(--admin-text-muted))] transition-colors hover:bg-[rgb(var(--admin-hover))] hover:text-[rgb(var(--admin-text))]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-body">
                      First Name
                    </label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="input-minimal w-full"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-body">
                      Last Name
                    </label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="input-minimal w-full"
                      placeholder="Last name"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-body">
                      Email
                    </label>
                    <input
                      value={user.email}
                      disabled
                      className="w-full cursor-not-allowed rounded-lg border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-hover))] px-3 py-2 text-[13px] text-muted"
                    />
                    <p className="mt-1 text-xs text-muted">
                      Email cannot be changed.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-body">
                      Phone Number
                    </label>
                    <input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="input-minimal w-full"
                      placeholder="Phone number"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-body">
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="select-minimal w-full"
                    >
                      {USER_ROLES.map((roleOption) => (
                        <option key={roleOption} value={roleOption}>
                          {roleOption}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-body">
                      Joined
                    </label>
                    <input
                      value={new Date(user.created_at).toLocaleString("en-US")}
                      disabled
                      className="w-full cursor-not-allowed rounded-lg border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-hover))] px-3 py-2 text-[13px] text-muted"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-[rgb(var(--admin-border))] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-heading">
                      Addresses
                    </h3>
                    <span className="text-xs text-muted">
                      {addresses.length} total
                    </span>
                  </div>
                  {addresses.length > 0 ? (
                    <div className="space-y-2">
                      {addresses.map((address) => (
                        <div
                          key={address.id}
                          className="rounded-lg border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-hover))] p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-heading">
                              {address.full_name}
                            </p>
                            {address.is_default && (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-700 ring-1 ring-inset ring-blue-200">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-body">
                            {address.phone_number}
                          </p>
                          <p className="text-xs text-body">
                            {address.address}, {address.ward},{" "}
                            {address.district}, {address.city}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No addresses found.</p>
                  )}
                </div>

                <div className="rounded-xl border border-[rgb(var(--admin-border))] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-heading">
                      Wishlists
                    </h3>
                    <span className="text-xs text-muted">
                      {wishlists.length} items
                    </span>
                  </div>
                  {wishlists.length > 0 ? (
                    <div className="space-y-2">
                      {wishlists.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-lg border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-hover))] p-3"
                        >
                          {item.product?.thumbnail ? (
                            <img
                              src={item.product.thumbnail}
                              alt={item.product.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-[rgb(var(--admin-border))]" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-heading">
                              {item.product?.name ?? "Unknown product"}
                            </p>
                            <p className="truncate text-xs text-muted">
                              /{item.product?.slug ?? "-"}
                            </p>
                            <p className="text-xs text-muted">
                              Added{" "}
                              {new Date(item.added_at).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </p>
                          </div>
                          <div className="shrink-0 text-xs text-body">
                            {item.product?.base_price !== null &&
                            item.product?.base_price !== undefined
                              ? `${item.product.base_price.toLocaleString("en-US")}₫`
                              : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No wishlist items.</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-header-bg))] px-5 py-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-ghost h-9"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary h-9"
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