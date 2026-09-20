# Module: desktop

> Adaptive desktop experience for `www.noobstore.xyz` — phones route to
> `m.noobstore.xyz`, tablets and desktops see the desktop shell.

**Status:** foundation phase — shell + routing + responsive breakpoints. Page
treatments (home, shop, product, checkout, services, profile) are next.

## Dependency direction (STRICT)

```
layout.tsx ──→ desktop module
layout.tsx ──→ mobile components (BottomNav, TopNavGate, etc.)
```

- Desktop components must **never** import from mobile-only components.
- Mobile components must **never** import from `modules/desktop/`.

## Layout

```
modules/desktop/
├── types.ts              # DeviceClass, DeviceRoutingAction, DeviceResolution
├── device.ts             # Pure UA classifier + domain router (Edge + Vitest)
├── device.test.ts        # 24 unit tests for classifier + routing matrix
├── server.ts             # getDeviceClass() — reads x-device-class header
├── README.md             # This file
└── ui/
    ├── shell/
    │   ├── DesktopShell.tsx      # Main wrapper: sidebar + topbar + content area
    │   ├── DesktopSidebar.tsx    # Fixed left sidebar with primary + secondary nav
    │   └── DesktopTopBar.tsx     # Top bar with search, cart, notifications (Bell badge + drawer)
    ├── cart/
    │   └── DesktopCartDrawer.tsx # Right-side cart panel (32rem, translate-x slide)
    └── notifications/
        └── DesktopNotificationsDrawer.tsx  # 32rem top-drop panel under topbar, slide-down
```

## How it works

1. **Edge middleware** (`middleware.ts`) calls `resolveDeviceRouting()` and
   307-redirects phones to `m.noobstore.xyz` (or serves on `www.` if the
   override cookie says desktop). Forwards the resolved class via
   `x-device-class` header.

2. **`(main)/layout.tsx`** (server component) reads the header and renders
   `DesktopShell` (desktop) or the existing mobile chrome (mobile).

3. **Root layout** (`app/layout.tsx`) skips `MobileViewportGuard` on desktop.

4. **`MainLayoutDynamic`** receives `hideSearch` prop to suppress the floating
   search FAB on desktop (desktop has inline search in `DesktopTopBar`).

## Responsive breakpoints

| Breakpoint | Sidebar | Content | Notes |
|---|---|---|---|
| < 768px | Hidden | Full width | Mobile chrome renders instead |
| 768–1024px | Collapsed (64px, icon-only) | Offset by 64px | Tablet — sidebar auto-collapses |
| > 1024px | Expanded (240px) | Offset by 240px | Desktop — full sidebar with labels |

## Device routing

- `classifyDevice(ua)` → `"mobile"` or `"desktop"` (phones = mobile, tablets/desktops = desktop)
- `resolveDeviceRouting({ hostname, userAgent, overrideCookie })` → redirect or serve action
- Override cookie (`device-override`) lets users force a device class
- `?noredirect=1` escape hatch for email links and testing
- `/api/*` routes never redirect (no HTML)

## Env vars

| Var | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_COOKIE_DOMAIN` | Cookie domain for cross-subdomain auth | unset (host-scoped) |
| `MOBILE_SUBDOMAIN_ENABLED` | Live `m.` subdomain routing (307 to `m.`/`www.`); keep `false` until DNS exists | `false` |

## Testing

```bash
# Device classifier + routing matrix
yarn vitest run src/modules/desktop/device.test.ts
```
