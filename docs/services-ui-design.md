# Services Page — UI Design Brief

**Designer note:** the storefront UI is Vietnamese (`vi`). Keep all visible copy in Vietnamese.

## 1. Overview

Two pages:
- `/services` — **booking flow** (the main surface): pick services, compose one booking order with multiple line items, shared pickup appointment, fixed bottom CTA.
- `/services/[slug]` — single-service detail + configurator.

Target: **mobile-first** (iPhone web), single column, max content width ~`max-w-md` on a warm-cream canvas. Safe areas (notch / home indicator) are baked into the layout.

## 2. Design System (source: `apps/web/tailwind.config.js`)

### Color — Terracotta-on-warm-cream Material-3 light theme

| Role | Token | Hex | Usage |
|---|---|---|---|
| Canvas / page surface | `surface`, `background` | `#fbf9f5` | page background, sheet backdrops |
| Highest card surface | `surface-container-lowest` | `#ffffff` | top-level cards, entries, detail |
| Soft card surface | `surface-container-low` | `#f5f3ef` | subtle containers, collapsed summary |
| Base card surface | `surface-container` | `#f0eeea` | section cards, chips, buttons |
| Raised surface | `surface-container-high` | `#eae8e4` | skeleton blocks, hover fills |
| Brand primary | `primary` | `#9b3f1c` | gradient start, links, prices, selected chips |
| Primary action (bright) | `primary-action` | `#d46a43` | hero eyebrow label |
| Text on primary | `on-primary` | `#ffffff` | text on primary fills |
| Body text | `on-surface` | `#1b1c1a` | headings, strong text |
| Muted text | `on-surface-variant` | `#56423c` | descriptions, secondary info |
| Outline | `outline` / `outline-variant` | `#89726a` / `#ddc1b8` | borders (used at 20–40% opacity) |
| Error | `error` | `#ba1a1a` | validation, delete affordances |
| Success | `success` | `#52652a` | success drawer icon |

**Brand gradient** (`primary-gradient`): `linear-gradient(135deg, #9b3f1c 0%, #bb5732 100%)` — large CTAs, icon tiles.

### Shadows (warm terracotta-tinted)

- `ambient` — `0 40px 40px rgba(155,63,28,0.06)`
- `ambient-sm` — `0 4px 20px rgba(155,63,28,0.04)`
- `ambient-lg` — `0 20px 50px rgba(155,63,28,0.08)`
- CTA glow — `shadow-lg shadow-primary/20`

### Radii
- Cards, sections, inputs, textareas: `rounded-2xl` (16px)
- Buttons/chips/entries: `rounded-xl` (12px), pills/tiles: `rounded-full`
- Success sheet top: `rounded-t-3xl` (24px)

### Typography
- Font: `var(--font-sans)` (sans-serif only — no display/script faces).
- **Micro-label / eyebrow:** 10px, `font-black`, `uppercase`, `tracking-[0.2em]`, color `primary` or `on-surface-variant` — section/field headers.
- **Card titles (service name, section title):** 14px, `font-black`, `uppercase`, `tracking-wide`.
- **Page/service title:** 24px, `font-black`, `uppercase`.
- **Price (hero/CTA):** `font-black`, 14–16px, color `primary`.
- **Body/descriptions:** 12px, `on-surface-variant`.
- **CTA buttons:** 10px, `font-black`, `uppercase`, `tracking-widest`, white text.

## 3. Page Anatomy (from top)

1. **TopNav** — sticky header: back chevron, page title, cart icon.
2. **Hero banner** — full-width; height `55vw` capped `max-h-72`; image fill `object-cover`; gradient overlay `from-black/80 via-black/30 to-transparent`; bottom-left eyebrow `"Noobstore — Keyboard services"` in `primary-action`, one-liner `"Đặt lịch dịch vụ — tất cả trong một đơn booking."` in `text-white/80`.
3. **Middleman promo card** — `rounded-2xl bg-gradient-to-br from-surface-container-lowest to-surface-container-low shadow-ambient-sm p-4`, left icon tile 44px `rounded-2xl bg-primary-gradient text-white shadow-primary/20` (ShieldCheck), title + subtitle, right pill `"Sắp ra mắt"` (`bg-surface-container-high`).
4. **Process explainer** — `rounded-2xl bg-surface-container p-4`: eyebrow "Quy trình dịch vụ" (primary) + small muted paragraph.
5. **Appointment card** — same `bg-surface-container` card: colored icon + eyebrow "Lịch hẹn và ghi chú", hairline `border-outline-variant/20`, then:
   - Datepicker `input type=datetime-local` — `rounded-2xl bg-surface ring-outline-variant ring-1 ring-inset`, focus `ring-primary/40 ring-2`.
   - "Ghi chú nhận hàng" textarea, same style.
6. **Service sections** (`ServiceSectionCard`) — `rounded-2xl bg-surface-container`, optional 160px hero image `rounded-t-2xl`; header: section title (14px black uppercase) + "**N** dịch vụ khả dụng" (count in `font-black text-primary`).
7. **Service row card** (`ServiceCard`) — `rounded-2xl bg-surface-container-lowest border-outline-variant/20 p-4`:
   - Left: title, `{base_price} · N ngày xử lý`, optional description.
   - When empty: dashed `rounded-xl` + "+" badge, hint "Nhấn **Thêm dịch vụ** để bắt đầu…".
   - When selected: pill "**N** mục đã chọn" (`bg-primary/10 text-primary` w/ white count chip), subtotal row "Tạm tính".
8. **Entry card** (`ServiceEntryCard`) — `rounded-xl border-primary/20 bg-primary/5 p-2`, header "Mục N", delete pill `bg-error/10 text-error`; option chips; switch/cleaning/config steppers; per-entry textarea; `Tạm tính:` micro line.
9. **QuantityStepper** — pill `− N +` buttons `bg-surface-container`, `hover:bg-surface-container-high`.
10. **Floating CTA bar** (`ServiceBookingSummaryBar`) — `fixed bottom-0`, `bg-surface/80 backdrop-blur-xl`, `border-t outline-variant/20`: "Đã chọn N mục dịch vụ" + "Tổng tạm tính" big `primary` price + "Chi tiết" expander listing each item (name ×count, handling days, price) + **full-width pill CTA** `bg-primary-gradient` "Đặt lịch dịch vụ", spinner while submitting. Also note pickup (Lịch hẹn) and per-section notes.
11. **Success sheet** (`ServiceBookingSuccessDrawer`) — bottom sheet `bg-surface-container-lowest rounded-t-3xl`, backdrop `bg-on-surface/35 backdrop-blur-sm`, drag handle + Close chip; centered `CheckCircle2` (success olive), "Đặt lịch thành công", order code `text-primary font-black`; two buttons: primary-gradient "Đặt thêm dịch vụ" + outline "Đóng".
12. **Loading skeleton / error states** — skeleton = `rounded-2xl bg-surface-container` frames with `bg-surface-container-high` bars + `animate-pulse`; error = `rounded-2xl border-error/20 bg-error/5 p-5` with "!" icon circle, title, "Thử lại" outline button.

## 4. Motion / Interaction conventions
- Global touch feedback: any pressable scales to `0.97` (or `opacity-70` when disabled).
- Sheets: slide up 300ms ease from `-bottom-full` → `bottom-0`; backdrop fades 300ms.
- "Chi tiết" expand: chevron toggling, `max-h overflow-y-auto`.
- Toast accent color: `#9b3f1c` (brand).

## 5. Accessibility / tech notes
- All prices go through `formatVND` (`vi-VN` locale).
- Icons: lucide-react (no icon font).
- Safe-area aware padding (notch + home indicator).

---

_Compiled from: `apps/web/src/components/services/*`, `apps/web/src/app/(main)/services/page.tsx`, `apps/web/tailwind.config.js`._