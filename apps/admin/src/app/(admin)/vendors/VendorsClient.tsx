"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type VendorRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
};

type Props = {
  vendors: VendorRow[];
};

export default function VendorsClient({ vendors }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editVendor, setEditVendor] = useState<VendorRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this vendor?")) return;
    setDeleting(id);

    const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Failed to delete");
    }
    setDeleting(null);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-3xl font-bold text-slate-900">Vendors</p>
        <button
          type="button"
          onClick={() => {
            setEditVendor(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Add Vendor
        </button>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Vendor</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Slug</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Website</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {vendors.length > 0 ? (
              vendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {v.logo_url && (
                        <img
                          src={v.logo_url}
                          alt={v.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{v.name}</p>
                        {v.description && (
                          <p className="text-xs text-slate-500 line-clamp-1">{v.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{v.slug}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {v.website ? (
                      <a href={v.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        {v.website}
                      </a>
                    ) : "-"}
                  </td>
                  <td className="space-x-2 px-6 py-4 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setEditVendor(v);
                        setShowForm(true);
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                    >
                      <Pencil className="mr-1 inline-block h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(v.id)}
                      disabled={deleting === v.id}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="mr-1 inline-block h-4 w-4" />
                      {deleting === v.id ? "..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                  No vendors yet. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <VendorFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        vendor={editVendor}
      />
    </>
  );
}

function VendorFormModal({
  open,
  onClose,
  vendor,
}: {
  open: boolean;
  onClose: () => void;
  vendor: VendorRow | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(vendor?.name ?? "");
  const [slug, setSlug] = useState(vendor?.slug ?? "");
  const [logoUrl, setLogoUrl] = useState(vendor?.logo_url ?? "");
  const [description, setDescription] = useState(vendor?.description ?? "");
  const [website, setWebsite] = useState(vendor?.website ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const isUpdate = !!vendor;
    const url = isUpdate ? `/api/vendors/${vendor.id}` : "/api/vendors";
    const method = isUpdate ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, logo_url: logoUrl || null, description: description || null, website: website || null }),
    });

    setLoading(false);

    if (res.ok) {
      onClose();
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to save vendor");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center !mt-0">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <p className="mb-4 text-lg font-semibold text-slate-900">
          {vendor ? "Edit Vendor" : "Add Vendor"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Slug{" "}
              <span className="text-xs text-slate-400">(URL-friendly, e.g. novelkeys)</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Logo URL</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : vendor ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
