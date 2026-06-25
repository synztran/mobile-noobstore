"use client";

import { Gift, Pencil, Trash2 } from "lucide-react";
import { Reward, RewardsTableProps } from "./types/gacha";

export default function RewardsTable({ rewards, totalWeight, onEdit, onDelete, onViewWinners }: RewardsTableProps) {
    if (rewards.length === 0) {
        return (
            <div className="card-bg rounded-lg card-shadow p-8 text-center">
                <Gift className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-muted text-sm">No rewards configured</p>
            </div>
        );
    }

    return (
        <div className="card-bg rounded-lg card-shadow overflow-hidden">
            <table className="table w-full">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th className="text-center">Weight</th>
                        <th className="text-center">Actual %</th>
                        <th className="text-center">Display %</th>
                        <th className="text-center">Claimed</th>
                        <th className="text-center">Golden</th>
                        <th className="text-center">Active</th>
                        <th className="text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rewards.map((reward: Reward) => (
                        <tr key={reward.id} className="hover">
                            <td className="font-medium">{reward.id}</td>
                            <td className="font-medium">{reward.name}</td>
                            <td>
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                    {reward.reward_type}
                                </span>
                            </td>
                            <td className="text-center">{reward.weight}</td>
                            <td className="text-center font-mono">
                                {totalWeight > 0 ? (((reward?.weight || 0) / totalWeight) * 100).toFixed(2) : "0"}%
                            </td>
                            <td className="text-center">
                                {reward.percent_display != null ? `${reward.percent_display}%` : "—"}
                            </td>
                            <td className="text-center">
                                {reward.claimed_count}
                                {reward.max_quantity != null && ` / ${reward.max_quantity}`}
                            </td>
                            <td className="text-center">
                                {reward.is_golden ? (
                                    <span className="text-yellow-500 text-lg">★</span>
                                ) : (
                                    <span className="text-slate-300 dark:text-slate-600">—</span>
                                )}
                            </td>
                            <td className="text-center">
                                {reward.is_active !== false ? (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                        Active
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                        Inactive
                                    </span>
                                )}
                            </td>
                            <td className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => onViewWinners && onViewWinners(reward)}
                                        className="btn btn-ghost btn-sm"
                                        title="Winners">
                                        <Gift className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onEdit(reward)}
                                        className="btn btn-ghost btn-sm"
                                        title="Edit">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(reward.id)}
                                        className="btn btn-ghost btn-sm"
                                        title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
