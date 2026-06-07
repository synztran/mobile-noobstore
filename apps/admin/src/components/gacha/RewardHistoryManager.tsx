"use client";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Gift,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchRewardHistoryUsers,
  fetchUserPlays,
} from "@/lib/react-query/gacha/queries";
import { adminQueryKeys } from "@/lib/react-query/root";

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
  puzzle:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  lucky_text:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export function RewardHistoryManager({ eventId }: Props) {
  // User list view
  const [userPage, setUserPage] = useState(0);
  const [searchEmail, setSearchEmail] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const usersQuery = useQuery<{ items: UserSummary[]; total: number }, Error>({
    queryKey: adminQueryKeys.gacha.rewardHistoryUsers(
      eventId,
      searchEmail,
      userPage
    ),
    queryFn: () =>
      fetchRewardHistoryUsers(eventId, {
        limit: PAGE_SIZE,
        offset: userPage * PAGE_SIZE,
        search: searchEmail,
      }),
    enabled: !!eventId,
  });

  const users = usersQuery.data?.items ?? [];
  const totalUsers = usersQuery.data?.total ?? 0;
  const loadingUsers = usersQuery.isLoading;

  // User detail view
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [playPage, setPlayPage] = useState(0);

  const playsQuery = useQuery<{ items: PlayEntry[]; total: number }, Error>({
    queryKey: adminQueryKeys.gacha.rewardHistoryPlays(
      eventId,
      selectedUser?.user_id,
      playPage
    ),
    queryFn: () =>
      fetchUserPlays(eventId, selectedUser!.user_id, {
        limit: PAGE_SIZE,
        offset: playPage * PAGE_SIZE,
      }),
    enabled: !!selectedUser,
  });

  const plays = playsQuery.data?.items ?? [];
  const totalPlays = playsQuery.data?.total ?? 0;
  const loadingPlays = playsQuery.isLoading;

  // data loaded via react-query

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
  }

  function handleBack() {
    setSelectedUser(null);
  }

  function handlePlayPageChange(newPage: number) {
    setPlayPage(newPage);
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
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            <ArrowLeft className="text-body h-4 w-4" />
          </button>
          <div>
            <h3 className="text-heading font-bold">
              {selectedUser.email ?? selectedUser.user_id}
            </h3>
            <p className="text-muted text-xs">
              {selectedUser.play_count} plays · {selectedUser.reward_count}{" "}
              rewards
            </p>
          </div>
        </div>

        {loadingPlays ? (
          <div className="card-bg card-shadow animate-pulse rounded-lg p-6">
            <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ) : plays.length === 0 ? (
          <div className="card-bg card-shadow rounded-lg p-8 text-center">
            <p className="text-muted text-sm">No play history</p>
          </div>
        ) : (
          <div className="card-bg card-shadow overflow-hidden rounded-lg">
            <table className="w-full">
              <thead className="thead-bg table-border border-b">
                <tr>
                  <th className="text-heading px-6 py-3 text-left text-sm font-semibold">
                    #
                  </th>
                  <th className="text-heading px-6 py-3 text-left text-sm font-semibold">
                    Reward
                  </th>
                  <th className="text-heading px-6 py-3 text-center text-sm font-semibold">
                    Type
                  </th>
                  <th className="text-heading px-6 py-3 text-left text-sm font-semibold">
                    Played At
                  </th>
                </tr>
              </thead>
              <tbody className="table-divide">
                {plays.map((entry, idx) => (
                  <tr key={entry.id} className="table-row-hover">
                    <td className="text-muted px-6 py-3 text-sm">
                      {playPage * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-purple-500" />
                        <span className="text-heading text-sm font-medium">
                          {entry.reward?.name ?? "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          REWARD_TYPE_COLORS[entry.reward?.reward_type ?? ""] ??
                          "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {entry.reward?.reward_type ?? "—"}
                      </span>
                    </td>
                    <td className="text-muted px-6 py-3 text-sm">
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
          <Search className="text-muted absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by email..."
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input-base h-full w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
          />
        </div>
        {!loadingUsers && totalUsers > 0 && (
          <div className="card-bg card-shadow flex shrink-0 items-center gap-2 rounded-lg px-4 py-3">
            <Users className="h-5 w-5 text-purple-600" />
            <span className="text-heading text-sm font-bold">{totalUsers}</span>
            <span className="text-muted text-xs">participants</span>
          </div>
        )}
      </div>

      {loadingUsers ? (
        <div className="card-bg card-shadow animate-pulse rounded-lg p-6">
          <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      ) : users.length === 0 ? (
        <div className="card-bg card-shadow rounded-lg p-8 text-center">
          <Trophy className="mx-auto mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-muted text-sm">No participants yet</p>
        </div>
      ) : (
        <div className="card-bg card-shadow overflow-hidden rounded-lg">
          <table className="w-full">
            <thead className="thead-bg table-border border-b">
              <tr>
                <th className="text-heading px-6 py-3 text-left text-sm font-semibold">
                  User
                </th>
                <th className="text-heading px-6 py-3 text-center text-sm font-semibold">
                  Plays
                </th>
                <th className="text-heading px-6 py-3 text-center text-sm font-semibold">
                  Rewards
                </th>
                <th className="text-heading px-6 py-3 text-left text-sm font-semibold">
                  Last Played
                </th>
              </tr>
            </thead>
            <tbody className="table-divide">
              {users.map((user) => (
                <tr
                  key={user.user_id}
                  onClick={() => handleSelectUser(user)}
                  className="table-row-hover cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-heading text-sm font-medium">
                        {user.email ?? user.user_id.slice(0, 12)}
                      </p>
                      <p className="text-muted font-mono text-xs">
                        {user.user_id}
                      </p>
                      {user.full_name && (
                        <p className="text-muted text-xs">{user.full_name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-heading text-sm font-bold">
                      {user.play_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-bold text-purple-600">
                      {user.reward_count}
                    </span>
                  </td>
                  <td className="text-muted px-6 py-4 text-sm">
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
      <p className="text-muted text-xs">
        Page {currentPage + 1} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          <ChevronLeft className="text-body h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          <ChevronRight className="text-body h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
