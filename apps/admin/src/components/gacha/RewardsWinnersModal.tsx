"use client";

import { useState, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchRewardWinners } from "@/lib/react-query/gacha/queries";
import { adminQueryKeys } from "@/lib/react-query/root";
import { Reward, Winner } from "./types/gacha";

const PAGE_SIZE = 10;

type SearchField = "user_name" | "user_id";

interface Props {
  open: boolean;
  onClose: () => void;
  reward: Reward | null;
  eventId: string;
}

export default function RewardsWinnersModal({
  open,
  onClose,
  reward,
  eventId,
}: Props) {
  const [page, setPage] = useState(1);
  const [searchField, setSearchField] = useState<SearchField>("user_name");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: winners = [], isLoading: loading } = useQuery<Winner[], Error>({
    queryKey: adminQueryKeys.gacha.rewardWinners(eventId, reward?.id),
    queryFn: () => fetchRewardWinners(eventId, reward!.id),
    enabled: !!reward && !!eventId,
  });

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return winners;
    return winners.filter((w) => {
      const val =
        searchField === "user_name"
          ? (w.user_name ?? w.user_email ?? "").toLowerCase()
          : (w.user_id ?? "").toLowerCase();
      return val.includes(q);
    });
  }, [winners, searchField, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };
  const handleFieldChange = (f: SearchField) => {
    setSearchField(f);
    setSearchQuery("");
    setPage(1);
  };

  // Reset state when modal closes
  const handleClose = () => {
    setPage(1);
    setSearchQuery("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-5xl">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold">
            Winners for {reward?.name ?? "reward"}
          </h3>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 "
          >
            <X className="text-muted h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          {/* Search bar */}
          {!loading && winners.length > 0 && (
            <div className="mb-3 flex gap-2">
              <select
                className="input-base w-36 rounded-lg px-3 py-2 text-sm"
                value={searchField}
                onChange={(e) =>
                  handleFieldChange(e.target.value as SearchField)
                }
              >
                <option value="user_name">Name</option>
                <option value="user_id">User ID</option>
              </select>
              <label className="input input-sm input-bordered flex flex-1 items-center gap-2">
                <Search className="text-muted h-3.5 w-3.5 shrink-0" />
                <input
                  type="text"
                  className="grow pl-2"
                  placeholder={
                    searchField === "user_name"
                      ? "Search by name…"
                      : "Search by user ID…"
                  }
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => handleSearch("")} className="shrink-0">
                    <X className="text-muted h-3.5 w-3.5" />
                  </button>
                )}
              </label>
            </div>
          )}
          {loading ? (
            <div className="p-6">Loading...</div>
          ) : winners.length === 0 ? (
            <div className="text-muted p-6 text-center">No winners yet</div>
          ) : filtered.length === 0 ? (
            <div className="text-muted p-6 text-center">
              No results for &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>User</th>
                    <th className="text-center">Played At</th>
                    <th className="text-center">Plays</th>
                    <th className="text-center">Win times</th>
                    <th className="text-center">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((w) => {
                    const rate =
                      w.plays_count > 0
                        ? ((1 / w.plays_count) * 100).toFixed(2) + "%"
                        : "—";
                    const key = w.history_id ?? `${w.user_id}-${w.played_at}`;
                    return (
                      <tr key={key}>
                        <td>
                          <div className="text-sm font-medium">
                            {w.user_name ?? w.user_email ?? w.user_id}
                          </div>
                          {w.user_email && (
                            <div className="text-muted text-xs">
                              {w.user_email}
                            </div>
                          )}
                          {w.user_id && (
                            <div className="text-muted line-clamp-1 text-xs">
                              ID: {w.user_id}
                            </div>
                          )}
                        </td>
                        <td className="text-muted text-center text-sm">
                          {w.played_at
                            ? new Date(w.played_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="text-center">{w.plays_count}</td>
                        <td className="text-center">{w.wins_count}</td>
                        <td className="text-center font-mono">{rate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && filtered.length > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between px-1">
            <span className="text-muted text-sm">
              {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                className="btn btn-ghost btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`btn btn-sm ${p === page ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="btn btn-ghost btn-sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="modal-action">
          <button onClick={handleClose} className="btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
