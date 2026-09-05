# Module: gacha

The gacha (quay thưởng / lottery) domain — the animated gacha machine, token
economy, weighted draws, missions, and winner ticker on `/gacha`.

Migrated from the scattered `components/gacha/`, `lib/gacha/`, `lib/react-query/gacha/`,
`types/gacha.ts`, and the six `app/api/gacha/**` routes. Pure moves + import
repoints — zero logic changes at migration time.

## Layout

| Layer | Location | Runs on | Contents |
|---|---|---|---|
| Contract types | `types.ts` | shared | `GachaEvent`, `GachaRewardMeta`, `GachaEventResponse`, `HistoryReward`/`HistoryEntry`/`GachaHistoryPage`, `GachaMission`, `Winner`, `GachaRewardData`, `Phase`, `MissionType`, `TriggerResult`, `MissionProgressRow` — the single home; **never export gacha types from route files** |
| Server logic | `server/` | server only | `event.ts` (event+rewards+token GET, 60s cache), `draw.ts` (the atomic weighted draw POST), `history.ts` (pagination), `winners.ts` (masked winners + 30s cache), `missions.ts` (mission list + claim/progress RPCs + `triggerMissionServer`). Every file starts with `import "server-only"` |
| Client logic | `client/` | client only | react-query hooks (`queries.ts`), `triggerMissionClient` fire-and-forget (`missions.ts`), `gachaQueryKeys` (`query-keys.ts`) |
| UI components | `ui/` | client | `GachaMachine.tsx` (page entry / orchestrator), `machine/` (13 animated parts: BallTank, InsertButton, LuckyBall, MachineActions, MachineCabinet, MachineHeader, MachineStand, OutputTray, RewardReveal, RotaryKnob, TokenBadge, TokenSlot, WinnerTicker), `drawers/` (4 info drawers: History, Missions, Rewards, Rules) |

## Rules that keep this clean

1. **Route files contain no logic and export no types.** The six
   `app/api/gacha/**` routes are thin handlers: auth + input validation +
   response mapping, delegating DB/redis/points work to `server/*`.
2. **`draw.ts` owns the money path.** The token deduct → weighted roll → CAS
   `claimed_count` → refund flow is one function (`drawGacha`) so the
   refund-on-failure invariants stay reviewable in one place.
3. **Client hooks fetch via API routes only.** `client/queries.ts` calls
   `/api/gacha/**`; it never touches Supabase. Server components use
   `server/*` directly.
4. **`triggerMissionClient` is client-only; `triggerMissionServer` is
   server-only.** The old `lib/gacha/missions.ts` bundled both in one file — a
   latent client/server boundary hazard. The split is now enforced by
   `server-only` + `"use client"` markers.
5. **Cross-domain seams are imports, not copies.** `draw.ts` calls
   `earnPointsFromGachaReward` from `@/lib/points/service` (points gets its own
   pass later — this seam moves then). Analytics stays in `lib/analytics.ts`
   (`trackGachaPlay`/`trackGachaWin`), image paths in `lib/images.ts`.
6. **UI parts are relative-imported within `machine/`.** The machine parts
   reference each other via `./` (same folder); only `GachaMachine` crosses
   into `machine/` and `drawers/`.

## Data flow

```
/gacha page (Server Component)
  └─ modules/gacha/ui/GachaMachine (client)
       ├─ client/queries.ts ── fetch ──▶ app/api/gacha/** (thin)
       │                                   └─ server/{event,draw,history,winners,missions}.ts
       │                                        ├─ Supabase (SSR + admin clients)
       │                                        ├─ Redis cache (gacha:event:, gacha:winners:, gacha:missions:)
       │                                        └─ points service (earnPointsFromGachaReward)
       └─ ui/machine/* + ui/drawers/* (relative imports)
```

Cross-module callers: `app/api/checkout/submit/route.ts` dynamic-imports
`triggerMissionServer` from `server/missions.ts` to fire order missions.

## API surface map

### Public contract types (`types.ts`) — the only home for gacha types
`GachaEvent`, `GachaRewardMeta`, `GachaEventResponse`, `HistoryReward`,
`HistoryEntry`, `GachaHistoryPage`, `GachaMission`, `Winner`,
`GachaRewardData`, `Phase`, `MissionType`, `TriggerResult`,
`MissionProgressRow`. Formerly `src/types/gacha.ts` (deleted).

### Server (`server/`)
- `event.ts` — `getGachaEvent(supabase, eventId, userId)` → event + rewards
  (percent computed from `percent_display`) + per-user `token_count`.
  Event+rewards cached 60s; token count never cached.
- `draw.ts` — `drawGacha(supabase, admin, userId, eventId)` → atomic draw.
  Refunds the token on every post-decrement failure (config error, no eligible
  rewards, CAS race lost). Triggers `play_count` mission + points earning for
  `point` rewards.
- `history.ts` — `getGachaHistory(supabase, userId, eventId, page)` → 10/page
  with `hasMore`.
- `winners.ts` — `getRecentWinners(supabase, eventId, limit)` → masked
  `displayName` (`First L.`) + reward, cached 30s, invalidated by draw.
- `missions.ts` — `getGachaMissions` (cached 5 min + per-user progress),
  `claimMissionReward` (RPC + status map), `triggerMissionProgress`
  (client-initiated RPC), `triggerMissionServer` (server-initiated,
  error-swallowing).

### Client (`client/`)
- `queries.ts` — `useGachaEvent`, `useGachaHistory` (infinite),
  `useGachaMissions`, `useGachaDraw`, `useClaimMission`, `useRecentWinners`.
- `missions.ts` — `triggerMissionClient(eventId, missionType, context)`.
- `query-keys.ts` — `gachaQueryKeys` (event/history/missions/recentWinners),
  assembled into `appQueryKeys` in `lib/react-query/root.ts`. Keys are the
  only thing this file exports — no type re-exports.

### Route map (`app/api/gacha/**` — thin handlers)
| Route | Handler | Delegates to |
|---|---|---|
| `GET /api/gacha?event_id=` | event + rewards + token count | `server/event.ts` |
| `POST /api/gacha` | atomic draw (auth, body validation) | `server/draw.ts` |
| `GET /api/gacha/history` | paginated history (auth) | `server/history.ts` |
| `GET /api/gacha/recent-winners` | public winner ticker | `server/winners.ts` |
| `GET /api/gacha/mission` | missions + progress | `server/missions.ts` |
| `POST /api/gacha/mission/claim` | claim reward (auth) | `server/missions.ts` |
| `POST /api/gacha/mission/progress` | trigger progress (auth) | `server/missions.ts` |

`app/(main)/gacha/page.tsx` stays at its URL — Server Component that resolves
the active event and mounts `ui/GachaMachine`.

## Domain facts that bite

- **The draw is a multi-round-trip money path.** Token decrement uses an
  optimistic `eq("token_count", current)` compare-and-set (409 on conflict);
  the reward `claimed_count` increment is a CAS too — losing the race refunds
  the token ("Phần thưởng vừa hết lượt"). Never reorder or merge these
  round-trips without re-verifying the refund invariants.
- **Weight-0 rewards are display-only.** Golden/percent-display rows with
  `weight <= 0` are never drawn — the golden ball is blocked via
  `gacha_event_blocked_users` and skipped in the eligible filter.
- **The winner ticker must not leak PII.** `winners.ts` masks to first name +
  last initial; it queries `gacha_history` then maps user ids through
  `public.users` (auth.users is not a public FK).
- **`recent-winners` excludes `reward_id = 5`** — a hard-coded "no prize"
  reward sentinel. Keep in sync with seed data.
- **Missions have two trigger paths.** Client-side (`triggerMissionClient`,
  fire-and-forget, e.g. login from `AuthProvider`) and server-side
  (`triggerMissionServer`, e.g. after checkout/draw). Both call the
  `process_mission_progress` RPC; only the RPC decides `newly_completed`.
- **`getAdminClient()` is resolved per-request in the route**, never at module
  scope, so production builds don't require the service-role key at build time.

## Cookbook (common tasks)

- **Add a new mission type**: extend `MissionType` in `types.ts` and the
  normalization branches in `server/missions.ts`; add a Vietnamese label to
  `constants/gacha.ts` `MISSION_TYPE_LABEL`.
- **Add a new reward type**: extend the `reward_type` unions in `types.ts`
  (`GachaRewardMeta`/`GachaRewardData`) + `REWARD_TYPE_LABEL` in
  `constants/gacha.ts`.
- **Change draw odds**: edit the weight filter/roll in `server/draw.ts` —
  percent shown to users comes from `percent_display`, not computed weight.
- **New drawer on the machine**: create it in `ui/drawers/`, wire the open
  state in `ui/GachaMachine.tsx` (and `MachineActions` if it's a header
  button).

## Tests

No dedicated gacha unit tests exist yet — the module was migrated with its
behavior unchanged, and the API routes are covered by the live preview
verification. When adding tests, the pure-testable seam is `server/draw.ts`
(weighted roll given a rewards snapshot) and the normalization helpers in
`server/missions.ts`.