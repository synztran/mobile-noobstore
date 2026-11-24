"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { auctionQueryKeys } from "./query-keys";

export function useAuctionRealtime(auctionId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!auctionId) return;

    const supabase = createClient();
    const refreshAuction = () => {
      queryClient.invalidateQueries({
        queryKey: auctionQueryKeys.detail(auctionId).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: auctionQueryKeys.list().queryKey,
      });
    };
    type AuctionChannel = ReturnType<typeof supabase.channel>;
    let channel: AuctionChannel | undefined;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryAttempt = 0;
    let channelGeneration = 0;

    const connect = async () => {
      const generation = ++channelGeneration;
      try {
        await supabase.realtime.setAuth();
        if (cancelled || generation !== channelGeneration) return;
        const nextChannel = supabase
          .channel(`auction:${auctionId}`, { config: { private: true } })
          .on("broadcast", { event: "bid_changed" }, refreshAuction)
          .on("broadcast", { event: "auction_changed" }, refreshAuction);
        channel = nextChannel;
        nextChannel.subscribe((status, error) => {
          if (cancelled || channel !== nextChannel) return;
          if (status === "SUBSCRIBED") {
            retryAttempt = 0;
            console.info(`[auction/realtime] ${auctionId}: ${status}`);
            return;
          }
          console.warn(`[auction/realtime] ${auctionId}: ${status}`, error ?? "");
          if (status !== "CLOSED" && status !== "CHANNEL_ERROR" && status !== "TIMED_OUT") return;

          channel = undefined;
          void supabase.removeChannel(nextChannel);
          if (retryTimer) clearTimeout(retryTimer);
          const delay = Math.min(1000 * 2 ** retryAttempt, 30_000);
          retryAttempt += 1;
          retryTimer = setTimeout(() => void connect(), delay);
        });
      } catch (error) {
        if (cancelled || generation !== channelGeneration) return;
        console.warn(`[auction/realtime] ${auctionId}: reconnect failed`, error);
        const delay = Math.min(1000 * 2 ** retryAttempt, 30_000);
        retryAttempt += 1;
        retryTimer = setTimeout(() => void connect(), delay);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      channelGeneration += 1;
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [auctionId, queryClient]);
}
