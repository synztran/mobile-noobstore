"use client";

import { useState } from "react";
import { FerrisWheel, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchEvents } from "@/lib/react-query/gacha/queries";
import { adminQueryKeys } from "@/lib/react-query/root";
import { GachaEventCard } from "@/components/gacha/GachaEventCard";
import { GachaEventDetail } from "@/components/gacha/GachaEventDetail";
import { CreateEventModal } from "@/components/gacha/CreateEventModal";

export interface GachaEvent {
  id: string;
  name: string;
  description: string | null;
  start_at: string;
  end_at: string;
  is_active: boolean;
  free_tokens_per_grant: number;
  free_token_interval_days: number;
  theme: string | null;
  created_at: string;
}

export const THEMES = [
  { value: "classic", label: "Classic (màu trắng)" },
  { value: "ga2", label: "Mega Arcade (đèn neon + hốc kính hồng)" },
] as const;

export default function GachaPage() {
  const queryClient = useQueryClient();
  const { data: events = [], isLoading: loading } = useQuery<GachaEvent[]>({
    queryKey: adminQueryKeys.gacha.events(),
    queryFn: fetchEvents,
  });

  const [selectedEvent, setSelectedEvent] = useState<GachaEvent | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function invalidateEvents() {
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.gacha.events() });
  }

  if (selectedEvent) {
    return (
      <GachaEventDetail
        event={selectedEvent}
        onBack={() => {
          setSelectedEvent(null);
          invalidateEvents();
        }}
        onUpdate={(updated) => setSelectedEvent(updated)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FerrisWheel className="h-7 w-7 text-purple-600" />
          <h1 className="text-heading text-2xl font-bold">Gacha Events</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          New Event
        </button>
      </div>

      {/* Active event highlight */}
      {!loading && events.filter((e) => e.is_active).length > 0 && (
        <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4   ">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-purple-600 ">
            Currently Running
          </p>
          <p className="text-heading text-lg font-bold">
            {events.find((e) => e.is_active)?.name}
          </p>
        </div>
      )}

      {/* Events list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="card-bg card-shadow animate-pulse rounded-lg p-6"
            >
              <div className="mb-3 h-5 w-48 rounded bg-slate-200 " />
              <div className="h-4 w-32 rounded bg-slate-200 " />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="card-bg card-shadow rounded-lg p-12 text-center">
          <FerrisWheel className="mx-auto mb-3 h-12 w-12 text-slate-300 " />
          <p className="text-muted">No gacha events yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <GachaEventCard
              key={event.id}
              event={event}
              onClick={() => setSelectedEvent(event)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            invalidateEvents();
          }}
        />
      )}
    </div>
  );
}
