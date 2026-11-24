# Module: auction

> Bidding and live auction system for NoobStore.

**Purpose:** Manages dedicated single-variant auction products, real-time bidding with anti-snipe time extensions, Buy Now (BIN), cascade winner settlement, and user bid histories.

**Owns the DB tables:** `auction_products`, `auction_bids`.

## Layout

```
modules/auction/
  types.ts               contract types — importable across client & server
  server/                server-only (import "server-only")
    queries.ts           Supabase reads + row shaping (list, detail, bids, user bids)
    ssr.ts               React.cache() loaders for Server Components / pages
    place-bid.ts         Calls place_auction_bid RPC
    buy-now.ts           Calls buy_now_auction RPC
    resolve.ts           Resolves expired auctions & cascades winners + sends notifications
  client/                client-only ("use client")
    query-keys.ts        auctionQueryKeys factory
    queries.ts           react-query hooks for auctions, bids, and user history
    useAuctionRealtime.ts  Real-time Supabase subscription hook for auction updates
  ui/
    AuctionCard.tsx      Card display for listing & homepage featured section
    AuctionTimer.tsx     Real-time countdown with dynamic anti-snipe updates
    AuctionStatusBadge.tsx  Status badge (active, ended, cancelled, upcoming)
    BidForm.tsx          Bid input with live min-increment calculation & validation
    BidHistory.tsx       Masked bidder list (e.g. "H*** T***")
    BuyNowButton.tsx     Buy Now action trigger with confirmation
    AuctionListClient.tsx  Listing page client layout
    AuctionDetailClient.tsx Detail page client with real-time sync
    UserAuctionsClient.tsx Profile bid history client
```

## Rules
1. **API routes are thin.** `app/api/auctions/**/route.ts` parse params, delegate to `server/`, and return JSON.
2. **Server Components never fetch over HTTP.** Call `server/ssr.ts` directly.
3. **Client Components fetch through react-query.**
4. **All bid mutations are atomic.** Executed via PostgreSQL `SECURITY DEFINER` RPCs (`place_auction_bid`, `buy_now_auction`).
