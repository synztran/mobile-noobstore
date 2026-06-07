export interface Reward {
    id: string;
    event_id: string;
    reward_type: "product" | "point" | "puzzle" | "lucky_text";
    name: string;
    weight: number | null;
    max_quantity: number | null;
    claimed_count: number;
    is_golden: boolean;
    thumbnail_url: string | null;
    percent_display: number | null;
}

export interface Winner {
    user_id: string;
    user_name?: string | null;
    user_email?: string | null;
    plays_count: number;
    wins_count: number;
    // For per-win entries include the played_at timestamp for that win
    played_at: string;
    // optional history row id to use as a stable key
    history_id?: number;
}

export interface RewardsTableProps {
    rewards: Reward[];
    totalWeight: number;
    onEdit: (r: Reward) => void;
    onDelete: (id: string) => void;
    onViewWinners: (r: Reward) => void;
}
