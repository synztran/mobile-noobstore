"use client";

import { Plus, Search, Trash2, UserX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
	const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [adding, setAdding] = useState(false);

	// User search state
	const [userOptions, setUserOptions] = useState<UserOption[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
	const [showDropdown, setShowDropdown] = useState(false);
	const [searching, setSearching] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Pre-fetch users on mount
	useEffect(() => {
		fetchUsers("");
	}, []);

	// Close dropdown on outside click
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setShowDropdown(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	async function fetchUsers(search: string) {
		setSearching(true);
		const params = new URLSearchParams({ limit: "20" });
		if (search) params.set("search", search);
		const res = await fetch(`/api/users?${params}`);
		const data = await res.json();
		setUserOptions(Array.isArray(data) ? data : []);
		setSearching(false);
	}

	function handleSearchChange(value: string) {
		setSearchQuery(value);
		setSelectedUser(null);
		setShowDropdown(true);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => fetchUsers(value), 300);
	}

	function handleSelectUser(user: UserOption) {
		setSelectedUser(user);
		setSearchQuery(user.email);
		setShowDropdown(false);
	}

	async function fetchBlocked() {
		setLoading(true);
		const res = await fetch(`/api/gacha/events/${eventId}/blocked-users`);
		const data = await res.json();
		setBlockedUsers(Array.isArray(data) ? data : []);
		setLoading(false);
	}

	useEffect(() => {
		fetchBlocked();
	}, [eventId]);

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
			fetchBlocked();
		}
		setAdding(false);
	}

	async function handleRemove(uid: string) {
		if (!confirm("Remove this user from blacklist?")) return;
		await fetch(`/api/gacha/events/${eventId}/blocked-users/${uid}`, {
			method: "DELETE",
		});
		fetchBlocked();
	}

	return (
		<div className="space-y-4">
			{/* Add user form */}
			<form onSubmit={handleAdd} className="flex gap-3">
				<div className="relative flex-1" ref={dropdownRef}>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
						<input
							type="text"
							placeholder="Search by email..."
							value={searchQuery}
							onChange={(e) => handleSearchChange(e.target.value)}
							onFocus={() => setShowDropdown(true)}
							className="w-full pl-9 pr-3 py-2 border input-base rounded-lg text-sm"
						/>
					</div>
					{showDropdown && (
						<div className="absolute z-20 mt-1 w-full card-bg rounded-lg card-shadow border table-border max-h-52 overflow-y-auto">
							{searching ? (
								<div className="px-4 py-3 text-sm text-muted">Searching...</div>
							) : userOptions.length === 0 ? (
								<div className="px-4 py-3 text-sm text-muted">No users found</div>
							) : (
								userOptions.map((user) => (
									<button
										key={user.id}
										type="button"
										onClick={() => handleSelectUser(user)}
										className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between">
										<span className="text-heading">{user.email}</span>
										{(user.first_name || user.last_name) && (
											<span className="text-muted text-xs">
												{[user.first_name, user.last_name].filter(Boolean).join(" ")}
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
					className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50">
					<Plus className="w-4 h-4" />
					Block User
				</button>
			</form>

			{/* List */}
			{loading ? (
				<div className="card-bg rounded-lg card-shadow p-6 animate-pulse">
					<div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
				</div>
			) : blockedUsers.length === 0 ? (
				<div className="card-bg rounded-lg card-shadow p-8 text-center">
					<UserX className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
					<p className="text-muted text-sm">No blocked users</p>
				</div>
			) : (
				<div className="card-bg rounded-lg card-shadow overflow-hidden">
					<table className="w-full">
						<thead className="thead-bg border-b table-border">
							<tr>
								<th className="px-6 py-3 text-left text-sm font-semibold text-heading">
									User ID
								</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-heading">
									Email
								</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-heading">
									Name
								</th>
								<th className="px-6 py-3 text-center text-sm font-semibold text-heading">
									Action
								</th>
							</tr>
						</thead>
						<tbody className="table-divide">
							{blockedUsers.map((item) => (
								<tr key={item.user_id} className="table-row-hover">
									<td className="px-6 py-4 text-sm font-mono text-body">
										{item.user_id.slice(0, 8)}...
									</td>
									<td className="px-6 py-4 text-sm text-heading">
										{item.users?.email ?? "—"}
									</td>
									<td className="px-6 py-4 text-sm text-body">
										{item.users?.full_name ?? "—"}
									</td>
									<td className="px-6 py-4 text-center">
										<button
											onClick={() => handleRemove(item.user_id)}
											className="w-8 h-8 rounded-full btn-icon-delete flex items-center justify-center transition-colors mx-auto"
											title="Unblock">
											<Trash2 className="w-4 h-4" />
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
