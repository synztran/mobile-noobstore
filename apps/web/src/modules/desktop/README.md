# Module: desktop

> Adaptive desktop experience for `www.noobstore.xyz` — phones route to
> `m.noobstore.xyz`, tablets and desktops see the desktop shell.

**Status:** shell, routing, home, shop listing, and product detail are implemented.
Checkout, services, and profile desktop treatments remain future work.

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
│   ├── DesktopShell.tsx      # Main wrapper: topbar + centred content area
│   ├── DesktopSearch.tsx     # Header search with live suggestion dropdown
│   └── DesktopTopBar.tsx     # Horizontal navigation, search, cart, notifications
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
   search FAB on desktop (desktop has inline search in `DesktopSearch`).

## Responsive breakpoints

| Breakpoint | Navigation | Content | Notes |
|---|---|---|---|
| < 1024px | Mobile navigation | Full width | Existing mobile chrome renders |
| 1024–1279px | Horizontal, icons only | Centred, max 1360px | Desktop shell, compact nav |
| ≥ 1280px | Horizontal, labels visible | Centred, max 1360px | Desktop shell, full nav |

## Desktop storefront surfaces

- **Home:** multi-column product sections, static testimonial grid, four-column footer.
- **Shop:** URL-driven filters in a sticky 260px rail; mobile keeps its filter overlay.
- **Product detail:** gallery beside a sticky 420px purchase panel; description and related sections stay below; mobile keeps its single-column flow and fixed purchase bar.

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
