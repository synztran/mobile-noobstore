"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, Gift, Search, Trophy, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface UserSummary {
	user_id: string;
	email: string | null;
	full_name: string | null;
	play_count: number;
	reward_count: number;
	last_played_at: string;
}

interface PlayEntry {
	id: number;
	reward_id: number;
	played_at: string;
	reward: { name: string; reward_type: string } | null;
}

interface Props {
	eventId: string;
}

const PAGE_SIZE = 15;

const REWARD_TYPE_COLORS: Record<string, string> = {
	product: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
	point: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
	puzzle: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
	lucky_text: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export function RewardHistoryManager({ eventId }: Props) {
	// User list view
	const [users, setUsers] = useState<UserSummary[]>([]);
	const [totalUsers, setTotalUsers] = useState(0);
	const [userPage, setUserPage] = useState(0);
	const [loadingUsers, setLoadingUsers] = useState(true);
	const [searchEmail, setSearchEmail] = useState("");
	const debounceRef = useRef<NodeJS.Timeout | null>(null);

	// User detail view
	const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
	const [plays, setPlays] = useState<PlayEntry[]>([]);
	const [totalPlays, setTotalPlays] = useState(0);
	const [playPage, setPlayPage] = useState(0);
	const [loadingPlays, setLoadingPlays] = useState(false);

	async function fetchUsers(offset: number, search?: string) {
		setLoadingUsers(true);
		const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
		if (search) params.set("search", search);
		const res = await fetch(`/api/gacha/events/${eventId}/reward-history?${params}`);
		const data = await res.json();
		setUsers(data.items ?? []);
		setTotalUsers(data.total ?? 0);
		setLoadingUsers(false);
	}

	async function fetchUserPlays(userId: string, offset: number) {
		setLoadingPlays(true);
		const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
		const res = await fetch(`/api/gacha/events/${eventId}/reward-history/${userId}?${params}`);
		const data = await res.json();
		setPlays(data.items ?? []);
		setTotalPlays(data.total ?? 0);
		setLoadingPlays(false);
	}

	useEffect(() => {
		fetchUsers(userPage * PAGE_SIZE, searchEmail);
	}, [eventId, userPage, searchEmail]);

	function handleSearchChange(value: string) {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			setUserPage(0);
			setSearchEmail(value);
		}, 400);
	}

	function handleSelectUser(user: UserSummary) {
		setSelectedUser(user);
		setPlayPage(0);
		fetchUserPlays(user.user_id, 0);
	}

	function handleBack() {
		setSelectedUser(null);
		setPlays([]);
	}

	function handlePlayPageChange(newPage: number) {
		setPlayPage(newPage);
		if (selectedUser) fetchUserPlays(selectedUser.user_id, newPage * PAGE_SIZE);
	}

	const totalUserPages = Math.ceil(totalUsers / PAGE_SIZE);
	const totalPlayPages = Math.ceil(totalPlays / PAGE_SIZE);

	// ─── Detail view ─────────────────────────────────────────────────────────────
	if (selectedUser) {
		return (
			<div className="space-y-4">
				<div className="flex items-center gap-3">
					<button
						onClick={handleBack}
						className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center transition-colors">
						<ArrowLeft className="w-4 h-4 text-body" />
					</button>
					<div>
						<h3 className="font-bold text-heading">
							{selectedUser.email ?? selectedUser.user_id}
						</h3>
						<p className="text-xs text-muted">
							{selectedUser.play_count} plays · {selectedUser.reward_count} rewards
						</p>
					</div>
				</div>

				{loadingPlays ? (
					<div className="card-bg rounded-lg card-shadow p-6 animate-pulse">
						<div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
					</div>
				) : plays.length === 0 ? (
					<div className="card-bg rounded-lg card-shadow p-8 text-center">
						<p className="text-muted text-sm">No play history</p>
					</div>
				) : (
					<div className="card-bg rounded-lg card-shadow overflow-hidden">
						<table className="w-full">
							<thead className="thead-bg border-b table-border">
								<tr>
									<th className="px-6 py-3 text-left text-sm font-semibold text-heading">#</th>
									<th className="px-6 py-3 text-left text-sm font-semibold text-heading">Reward</th>
									<th className="px-6 py-3 text-center text-sm font-semibold text-heading">Type</th>
									<th className="px-6 py-3 text-left text-sm font-semibold text-heading">Played At</th>
								</tr>
							</thead>
							<tbody className="table-divide">
								{plays.map((entry, idx) => (
									<tr key={entry.id} className="table-row-hover">
										<td className="px-6 py-3 text-sm text-muted">
											{playPage * PAGE_SIZE + idx + 1}
										</td>
										<td className="px-6 py-3">
											<div className="flex items-center gap-2">
												<Gift className="w-4 h-4 text-purple-500" />
												<span className="text-sm font-medium text-heading">
													{entry.reward?.name ?? "Unknown"}
												</span>
											</div>
										</td>
										<td className="px-6 py-3 text-center">
											<span
												className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
													REWARD_TYPE_COLORS[entry.reward?.reward_type ?? ""] ??
													"bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
												}`}>
												{entry.reward?.reward_type ?? "—"}
											</span>
										</td>
										<td className="px-6 py-3 text-sm text-muted">
											{new Date(entry.played_at).toLocaleString("vi-VN")}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{totalPlayPages > 1 && (
					<Pagination
						currentPage={playPage}
						totalPages={totalPlayPages}
						onPageChange={handlePlayPageChange}
					/>
				)}
			</div>
		);
	}

	// ─── User list view ──────────────────────────────────────────────────────────
	return (
		<div className="space-y-4">
			{/* Search + Stats */}
			<div className="flex items-stretch gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
					<input
						type="text"
						placeholder="Search by email..."
						onChange={(e) => handleSearchChange(e.target.value)}
						className="w-full pl-9 pr-3 py-2 border input-base rounded-lg text-sm h-full"
					/>
				</div>
				{!loadingUsers && totalUsers > 0 && (
					<div className="card-bg rounded-lg card-shadow px-4 py-3 flex items-center gap-2 shrink-0">
						<Users className="w-5 h-5 text-purple-600" />
						<span className="text-sm font-bold text-heading">{totalUsers}</span>
						<span className="text-xs text-muted">participants</span>
					</div>
				)}
			</div>

			{loadingUsers ? (
				<div className="card-bg rounded-lg card-shadow p-6 animate-pulse">
					<div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
				</div>
			) : users.length === 0 ? (
				<div className="card-bg rounded-lg card-shadow p-8 text-center">
					<Trophy className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
					<p className="text-muted text-sm">No participants yet</p>
				</div>
			) : (
				<div className="card-bg rounded-lg card-shadow overflow-hidden">
					<table className="w-full">
						<thead className="thead-bg border-b table-border">
							<tr>
								<th className="px-6 py-3 text-left text-sm font-semibold text-heading">User</th>
								<th className="px-6 py-3 text-center text-sm font-semibold text-heading">Plays</th>
								<th className="px-6 py-3 text-center text-sm font-semibold text-heading">Rewards</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-heading">Last Played</th>
							</tr>
						</thead>
						<tbody className="table-divide">
							{users.map((user) => (
								<tr
									key={user.user_id}
									onClick={() => handleSelectUser(user)}
									className="table-row-hover cursor-pointer">
									<td className="px-6 py-4">
										<div>
											<p className="text-sm font-medium text-heading">
												{user.email ?? user.user_id.slice(0, 12)}
											</p>
											<p className="text-xs text-muted font-mono">{user.user_id}</p>
											{user.full_name && (
												<p className="text-xs text-muted">{user.full_name}</p>
											)}
										</div>
									</td>
									<td className="px-6 py-4 text-center">
										<span className="text-sm font-bold text-heading">{user.play_count}</span>
									</td>
									<td className="px-6 py-4 text-center">
										<span className="text-sm font-bold text-purple-600">{user.reward_count}</span>
									</td>
									<td className="px-6 py-4 text-sm text-muted">
										{new Date(user.last_played_at).toLocaleString("vi-VN")}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{totalUserPages > 1 && (
				<Pagination
					currentPage={userPage}
					totalPages={totalUserPages}
					onPageChange={setUserPage}
				/>
			)}
		</div>
	);
}

// ─── Pagination component ────────────────────────────────────────────────────
function Pagination({
	currentPage,
	totalPages,
	onPageChange,
}: {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}) {
	return (
		<div className="flex items-center justify-between">
			<p className="text-xs text-muted">
				Page {currentPage + 1} of {totalPages}
			</p>
			<div className="flex items-center gap-2">
				<button
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 0}
					className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
					<ChevronLeft className="w-4 h-4 text-body" />
				</button>
				<button
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage >= totalPages - 1}
					className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
					<ChevronRight className="w-4 h-4 text-body" />
				</button>
			</div>
		</div>
	);
}
