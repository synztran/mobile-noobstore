"use client";

import {
  useGachaDraw,
  useGachaEvent,
} from "@/lib/react-query/gacha/api/useGachaQueries";
import { appQueryKeys } from "@/lib/react-query/root";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { GachaHistoryDrawer } from "./GachaHistoryDrawer";
import { GachaMissionsDrawer } from "./GachaMissionsDrawer";
import { GachaRewardsDrawer } from "./GachaRewardsDrawer";
import { GachaRulesDrawer } from "./GachaRulesDrawer";
import { BALL_PALETTE } from "./LuckyBall";
import { MachineCabinet, type Phase } from "./MachineCabinet";
import { type GachaRewardData } from "./RewardReveal";

// Maps reward type/golden flag to a BALL_PALETTE index so the ball color
// matches the reward revealed. See docs/features/gacha-ball-color-mapping.md
function rewardToColorIndex(r: {
  is_golden: boolean;
  reward_type: string;
}): number {
  if (r.is_golden) return 4; // Gold
  switch (r.reward_type) {
    case "product":
      return 1; // Ocean (blue)
    case "point":
      return 3; // Forest (green)
    case "puzzle":
      return 2; // Cosmic (purple)
    case "lucky_text":
      return 5; // Rose (pink)
    default:
      return 0; // Flame (red) — fallback
  }
}

interface GachaRewardMeta extends GachaRewardData {
  weight: number;
  max_quantity: number | null;
  claimed_count: number;
  percent: number;
  percent_display: number;
}

interface GachaEvent {
  id: number;
  name: string;
}

interface GachaMachineProps {
  eventId: number;
}

export function GachaMachine({ eventId }: GachaMachineProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [rewardIndex, setRewardIndex] = useState<number | null>(null);
  const [reward, setReward] = useState<GachaRewardData | null>(null);
  const [drawError, setDrawError] = useState<string | null>(null);

  const { data: gachaData } = useGachaEvent(eventId);

  const eventData: GachaEvent | null = gachaData?.event ?? null;
  const rewards: GachaRewardMeta[] = gachaData?.rewards ?? [];
  const [tokenCount, setTokenCount] = useState<number | null>(null);

  // Sync token count from query on first load only
  const fetchedTokenCount: number | undefined = gachaData?.token_count;
  if (fetchedTokenCount !== undefined && tokenCount === null) {
    setTokenCount(fetchedTokenCount);
  }

  // Drawer states
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);

  const drawMutation = useGachaDraw();
  const queryClient = useQueryClient();

  const handleInsertToken = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("token-inserted");
  }, [phase]);

  const handleInsert10xTokens = useCallback(() => {
    if (phase !== "idle") return;
    if (tokenCount === null || tokenCount < 10) return;

    const newPhase = tokenCount >= 10 ? "dispensing" : "token-inserted";
    setPhase(newPhase);
    setTokenCount((prev) => (prev !== null ? Math.max(0, prev - 10) : prev));

    // If we have enough tokens, start the draw immediately
    if (tokenCount >= 10) {
      const idx = Math.floor(Math.random() * BALL_PALETTE.length);
      setRewardIndex(idx);
      setReward(null);
      setDrawError(null);

      drawMutation.mutate(eventId, {
        onSuccess: (data) => {
          if (data.reward) {
            setReward(data.reward);
            setRewardIndex(rewardToColorIndex(data.reward));
            setTokenCount((prev) =>
              prev != null ? Math.max(0, prev - 1) : prev
            );
            setPhase("rolling");
            queryClient.invalidateQueries(appQueryKeys.gacha.missions(eventId));
          }
        },
        onError: (err: Error) => {
          setDrawError(err.message);
          setRewardIndex(null);
          setPhase("idle");
        },
      });
    }
  }, [phase, tokenCount, eventId, drawMutation, queryClient]);

  const handleKnobTurnComplete = useCallback(() => {
    if (phase !== "token-inserted") return;

    // Pick a visual color immediately to start animation
    const idx = Math.floor(Math.random() * BALL_PALETTE.length);
    setRewardIndex(idx);
    setReward(null);
    setDrawError(null);
    setPhase("dispensing");

    // BallTank keeps shaking while API is in-flight.
    // Ball drops into tray only after API responds.
    drawMutation.mutate(eventId, {
      onSuccess: (data) => {
        if (data.reward) {
          setReward(data.reward);
          setRewardIndex(rewardToColorIndex(data.reward));
          setTokenCount((prev) =>
            prev != null ? Math.max(0, prev - 1) : prev
          );
          setPhase("rolling");
          queryClient.invalidateQueries(appQueryKeys.gacha.missions(eventId));
        }
      },
      onError: (err: Error) => {
        setDrawError(err.message);
        setRewardIndex(null);
        setPhase("idle");
      },
    });
  }, [phase, eventId, drawMutation]);

  const handleReset = useCallback(() => {
    setPhase("idle");
    setRewardIndex(null);
    setReward(null);
    setDrawError(null);
  }, []);

  const handleBallClick = useCallback(() => {
    if (phase !== "rolling") return;
    if (drawError) {
      handleReset();
      return;
    }
    setPhase("reveal");
  }, [phase, drawError, handleReset]);

  // Drawer handlers — stable refs keep MachineCabinet memoized when drawers open/close
  const handleHistoryOpen = useCallback(() => setHistoryOpen(true), []);
  const handleHistoryClose = useCallback(() => setHistoryOpen(false), []);
  const handleRewardsOpen = useCallback(() => setRewardsOpen(true), []);
  const handleRewardsClose = useCallback(() => setRewardsOpen(false), []);
  const handleRulesOpen = useCallback(() => setRulesOpen(true), []);
  const handleRulesClose = useCallback(() => setRulesOpen(false), []);
  const handleMissionsOpen = useCallback(() => setMissionsOpen(true), []);
  const handleMissionsClose = useCallback(() => setMissionsOpen(false), []);
  const handleMissionClaimed = useCallback((tokenReward: number) => {
    setTokenCount((prev) => (prev ?? 0) + tokenReward);
  }, []);

  console.log("phase", phase);

  return (
    <div className="flex flex-col items-center gap-2">
      <MachineCabinet
        phase={phase}
        rewardIndex={rewardIndex}
        reward={reward}
        drawError={drawError}
        tokenCount={tokenCount}
        eventId={eventId}
        onInsertToken={handleInsertToken}
        onInsert10xTokens={handleInsert10xTokens}
        onKnobTurnComplete={handleKnobTurnComplete}
        onBallClick={handleBallClick}
        onReset={handleReset}
        onHistoryOpen={handleHistoryOpen}
        onRewardsOpen={handleRewardsOpen}
        onRulesOpen={handleRulesOpen}
        onMissionsOpen={handleMissionsOpen}
      />

      {/* ── Drawers ── */}
      <GachaHistoryDrawer
        open={historyOpen}
        onClose={handleHistoryClose}
        eventId={eventId}
      />
      <GachaRewardsDrawer
        open={rewardsOpen}
        onClose={handleRewardsClose}
        rewards={rewards}
      />
      <GachaRulesDrawer open={rulesOpen} onClose={handleRulesClose} />
      <GachaMissionsDrawer
        open={missionsOpen}
        onClose={handleMissionsClose}
        eventId={eventId}
        onClaimed={handleMissionClaimed}
      />
    </div>
  );
}
