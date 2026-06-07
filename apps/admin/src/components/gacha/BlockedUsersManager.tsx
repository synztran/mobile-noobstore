"use client";

import { Plus, Search, Trash2, UserX } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBlockedUsers } from "@/lib/react-query/gacha/queries";
import { adminQueryKeys } from "@/lib/react-query/root";

interface BlockedUser {
  event_id: string;
  user_id: string;
  users: { id: string; email: string; full_name: string | null } | null;
}

interface UserOption {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface Props {
  eventId: string;
}

export function BlockedUsersManager({ eventId }: Props) {
  const [adding, setAdding] = useState(false);

  // User search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const blockedQuery = useQuery<BlockedUser[], Error>({
    queryKey: adminQueryKeys.gacha.blockedUsers(eventId),
    queryFn: () => fetchBlockedUsers(eventId),
    enabled: !!eventId,
  });

  const blockedUsers = blockedQuery.data ?? [];
  const loading = blockedQuery.isLoading;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchUserOptions(search: string) {
    const params = new URLSearchParams({ limit: "20" });
    if (search) params.set("search", search);
    const res = await fetch(`/api/users?${params}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  const userOptionsQuery = useQuery<UserOption[], Error>({
    queryKey: adminQueryKeys.users.list(searchQuery, 1),
    queryFn: () => fetchUserOptions(searchQuery),
    enabled: true,
    // keepPreviousData: true,
  });

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setSelectedUser(null);
    setShowDropdown(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // queryClient.invalidateQueries(adminQueryKeys.users.list(value, 1));
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.users.list(value, 1),
      });
    }, 300);
  }

  function handleSelectUser(user: UserOption) {
    setSelectedUser(user);
    setSearchQuery(user.email);
    setShowDropdown(false);
  }

  // blocked users loaded via react-query

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setAdding(true);
    const res = await fetch(`/api/gacha/events/${eventId}/blocked-users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: selectedUser.id }),
    });
    if (res.ok) {
      setSelectedUser(null);
      setSearchQuery("");
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.gacha.blockedUsers(eventId),
      });
    }
    setAdding(false);
  }

  async function handleRemove(uid: string) {
    if (!confirm("Remove this user from blacklist?")) return;
    await fetch(`/api/gacha/events/${eventId}/blocked-users/${uid}`, {
      method: "DELETE",
    });
    queryClient.invalidateQueries({
      queryKey: adminQueryKeys.gacha.blockedUsers(eventId),
    });
  }

  return (
    <div className="space-y-4">
      {/* Add user form */}
      <form onSubmit={handleAdd} className="flex gap-3">
        <div className="relative flex-1" ref={dropdownRef}>
          <div className="relative">
            <Search className="text-muted absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              className="input-base w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
            />
          </div>
          {showDropdown && (
            <div className="card-bg card-shadow table-border absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border">
              {userOptionsQuery.isLoading ? (
                <div className="text-muted px-4 py-3 text-sm">Searching...</div>
              ) : userOptionsQuery.data &&
                userOptionsQuery.data.length === 0 ? (
                <div className="text-muted px-4 py-3 text-sm">
                  No users found
                </div>
              ) : (
                (userOptionsQuery.data ?? []).map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <span className="text-heading">{user.email}</span>
                    {(user.first_name || user.last_name) && (
                      <span className="text-muted text-xs">
                        {[user.first_name, user.last_name]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={adding || !selectedUser}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Block User
        </button>
      </form>

      {/* List */}
      {loading ? (
        <div className="card-bg card-shadow animate-pulse rounded-lg p-6">
          <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      ) : blockedUsers.length === 0 ? (
        <div className="card-bg card-shadow rounded-lg p-8 text-center">
          <UserX className="mx-auto mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-muted text-sm">No blocked users</p>
        </div>
      ) : (
        <div className="card-bg card-shadow overflow-hidden rounded-lg">
          <table className="w-full">
            <thead className="thead-bg table-border border-b">
              <tr>
                <th className="text-heading px-6 py-3 text-left text-sm font-semibold">
                  User ID
                </th>
                <th className="text-heading px-6 py-3 text-left text-sm font-semibold">
                  Email
                </th>
                <th className="text-heading px-6 py-3 text-left text-sm font-semibold">
                  Name
                </th>
                <th className="text-heading px-6 py-3 text-center text-sm font-semibold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="table-divide">
              {blockedUsers.map((item) => (
                <tr key={item.user_id} className="table-row-hover">
                  <td className="text-body px-6 py-4 font-mono text-sm">
                    {item.user_id.slice(0, 8)}...
                  </td>
                  <td className="text-heading px-6 py-4 text-sm">
                    {item.users?.email ?? "—"}
                  </td>
                  <td className="text-body px-6 py-4 text-sm">
                    {item.users?.full_name ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleRemove(item.user_id)}
                      className="btn-icon-delete mx-auto flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                      title="Unblock"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
