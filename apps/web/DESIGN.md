---
name: NoobStore Web
description: Mobile-first e-commerce for premium mechanical keyboards — warm terracotta precision on a cream workbench.
colors:
  terracotta: "#9b3f1c"
  terracotta-container: "#bb5732"
  terracotta-action: "#D46A43"
  terracotta-soft: "#ffdbcf"
  terracotta-pale: "#ffb59c"
  olive: "#52652a"
  olive-mist: "#d4eca2"
  paper: "#fbf9f5"
  paper-bright: "#ffffff"
  paper-low: "#f5f3ef"
  paper-mid: "#f0eeea"
  paper-high: "#eae8e4"
  paper-highest: "#e4e2de"
  ink: "#1b1c1a"
  ink-soft: "#56423c"
  ink-faint: "#89726a"
  outline-warm: "#ddc1b8"
  error: "#ba1a1a"
  error-wash: "#ffdad6"
  inverse-surface: "#30312e"
typography:
  display:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 5vw, 2.75rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.08em"
    textTransform: "uppercase"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.paper-bright}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
    typography: "12px / 700 / 0.1em uppercase"
  button-primary-hover:
    backgroundColor: "{colors.terracotta-container}"
    textColor: "{colors.paper-bright}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
    typography: "12px / 700 / 0.1em uppercase"
  button-secondary:
    backgroundColor: "{colors.paper-mid}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
    typography: "14px / 700"
  input:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
  chip:
    backgroundColor: "{colors.paper-mid}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "6px 14px"
  chip-active:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.paper-bright}"
    rounded: "{rounded.full}"
    padding: "6px 14px"
  card:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
---

# Design System: NoobStore Web

## Overview

**Creative North Star: "The Build Bench — a warm, precisely-tooled workbench for keyboard builds."**

NoobStore is where Vietnamese keyboard hobbyists gather: they are not browsing a catalog so much as standing at a workbench of parts — switches, keycaps, kits — each with its own spec, tolerance, and price. The visual system treats every product like a component on that bench: warm paper surfaces, terracotta as the tool you reach for (the action color), and a single precise typeface that reads like spec-sheet print. It is playful enough for a gacha spinner, precise enough for a 0.01mm plate spec.

The system is MD3-flavored in structure (full surface-container tonal stack, role tokens) but unmistakably warm in temperature: every neutral carries a cream undertone (`#fbf9f5` at ~98% lightness, hue 85°), every shadow is tinted terracotta rather than black, and the one gradient in the system runs terracotta-to-lighter-terracotta (`#9b3f1c → #bb5732`) — never a violet or blue. This is the deliberate answer to the anti-references: generic SaaS cream gets beaten by *warmth that is precise*, corporate e-commerce templates get beaten by *playful craft*, and gradient-everywhere glassmorphism gets beaten by *restraint — one sanctioned glass surface (the nav), one gradient, terracotta used sparingly*.

Density is mobile-first: thumb-reach bottom sheets, pill-shaped CTAs, touch targets that scale down to 97% on tap for tactile feedback, iOS safe-area padding everywhere. Desktop is the same system at a comfortable column width — it is never redesigned, only widened. Vietnamese-first copy, VND pricing, and skeleton loaders for every async surface keep the bench feeling alive and local.

**Key Characteristics:**
- Single typeface (Manrope 200–800) doing all hierarchy through weight, size, and case — no second display font.
- Terracotta (`#9b3f1c`) is the sole action color; it appears on CTAs, prices, focus rings, and selected states only.
- Structure comes from tonal paper layering (white → `#f0eeea` → `#e4e2de`), not from borders or shadows.
- Every shadow is terracotta-tinted; depth reads warm, never cold black.
- Fully-rounded pills for every button and chip; squared corners are reserved for media and badges.
- Micro-interactions with intent: tap-scale (0.97), pulse-glow sale badges, slide-up bottom sheets on a strong ease-out curve.

## Colors

A warm, low-chroma palette: terracotta as the fire, olive as the garden, and a cream paper stack with warm brown-gray ink. Saturation is concentrated in terracotta; everything else stays quiet so the action color pops.

### Primary
- **Fired Terracotta** (#9b3f1c): The action color. Primary buttons, links, sale prices, focus rings, selected chips, `themeColor`. Never used as a page background or for decoration.
- **Glazed Terracotta** (#bb5732): The gradient partner and container tone — hover states of primary, the lighter end of `primary-gradient`, guide-tour "next" button.
- **Amber Terracotta** (#D46A43): The bright accent — promotional CTAs, warning-tinted accents, cart badge highlights. One step brighter, used to draw the eye without screaming.
- **Blush Terracotta** (#ffdbcf): The soft container — selected-state backgrounds, tinted fills, `primary-fixed`.
- **Pale Ember** (#ffb59c): Inverse-primary and fixed-dim — used on dark or inverse surfaces where terracotta must glow softly.

### Secondary
- **Olive Grove** (#52652a): The quiet second voice — success states, "in stock" cues, secondary accents, eco/shipping details. It whispers where terracotta shouts.
- **Olive Mist** (#d4eca2): Olive container — success banners, stock-available fills, badge backgrounds.

### Neutral
- **Cream Paper** (#fbf9f5): The page background. This is the warm base everything sits on; never replace with pure gray.
- **Bright Paper** (#ffffff): Raised surfaces — cards, popovers, inputs, modal sheets. White, but read as warm next to Cream Paper.
- **Low Paper** (#f5f3ef) / **Mid Paper** (#f0eeea) / **High Paper** (#eae8e4) / **Highest Paper** (#e4e2de): The tonal layering stack — skeletons, disabled fills, secondary buttons, drawer separators, hover fills. Structure without borders.
- **Warm Ink** (#1b1c1a): Primary text. A near-black with a barely-green warmth; never pure `#000`.
- **Soft Ink** (#56423c): Secondary text — descriptions, muted labels, blockquote color. A warm brown-gray.
- **Faint Ink** (#89726a): Tertiary text, placeholders, outlines — guidance that recedes.
- **Warm Outline** (#ddc1b8): The `outline-variant` — soft separators and understated borders on tinted surfaces.
- **Charcoal Surface** (#30312e): Inverse surface — dark chips and inverse contexts (toast emphasis, inverse surfaces).

### Error
- **Error Red** (#ba1a1a): Destructive actions and validation errors.
- **Error Wash** (#ffdad6): Error container backgrounds.
- **Price-Break Red** (#ef4444): *Out-of-palette exception.* The discount badge (`-25%`) on product cards uses vivid red-500. This is a deliberate price-anchor shout against the quiet palette — keep it exclusive to discount badges.

### Named Rules
**The Terracotta Discipline.** Terracotta is for action only: CTAs, links, prices, focus, selection. It covers at most ~10% of any screen. If a design reaches for terracotta as decoration, it's overreach — use the paper stack instead.
**The Warm Paper Rule.** Every surface carries warmth — no cool grays (`#f4f4f5`, `#e5e7eb`), no pure black text. When in doubt, warm it one step toward cream or brown-gray.

## Typography

**Display Font:** Manrope (local variable font, weights 200–800)
**Body Font:** Manrope (same family)
**Label/Mono Font:** Manrope — no mono face in the system; technical specs use weight contrast, not a mono font.

**Character:** One geometric grotesque with a humanist warmth, set tight and bold. The pairing is really a single voice doing all the talking: heavy weights (700–800) with tight tracking for headlines, medium (500) for body, and small-caps micro-labels for anything actionable. It reads like precision print — spec-sheet honest, never decorative.

### Hierarchy
- **Display** (800, clamp(1.875rem → 2.75rem), line-height 1.15, -0.02em): Hero moments — sale section headers, empty-state headlines. Rare by design.
- **Headline** (800, 1.25rem, 1.3, -0.01em): Section titles, drawer headers, product names on detail pages.
- **Title** (700, 1rem, 1.4): Product card names, list titles, navigation labels.
- **Body** (500, 0.875rem, 1.5): Descriptions, prices, secondary detail. Max line length ~65ch on desktop reading surfaces.
- **Label** (700, 0.75rem, 0.08em, uppercase): Buttons, chips, section eyebrows, table headers. The signature micro-label.

### Named Rules
**The One Voice Rule.** Manrope everywhere, always. Hierarchy is weight + size + case only — never a second font family, never a serif accent.
**The Caps Micro-Label Rule.** Uppercase + wide tracking is reserved for labels and buttons (12px/700+). Body copy and headlines never render uppercase — caps are an action signal, not a style.

## Layout

Mobile-first, single column, 16px gutters (`p-4` on content, `gap-3` inside cards). The app shell is safe-area-aware: `.top-nav-pad` and `.bottom-nav-pad` add `env(safe-area-inset-*)` padding for notch and home-indicator clearance, and content offsets (`main-top-offset`, `main-bottom-offset`) keep scrollable content clear of the fixed glass nav and bottom nav. Modals and sheets: bottom sheets cap at 85dvh with rounded top corners (16px); centered modals appear from `sm` breakpoint up (`modal-bottom sm:modal-middle`). Desktop widens the same single column to a comfortable reading width — layout is never redesigned, only unconstrained. Standard Tailwind breakpoints (sm 640 / md 768 / lg 1024) with `max-w-*` containers.

## Elevation & Depth

The system is **tonal-layered, not shadow-driven**: structure comes from the paper stack (white card on cream page, `#f0eeea` fills for secondary), and shadows are a supporting actor for elevation and state. The only sanctioned glass is the top navigation (`rgba(251,249,245,0.8)` + 20px blur) — glassmorphism elsewhere is an anti-reference.

### Shadow Vocabulary
- **Ambient** (`0 40px 40px rgba(155,63,28,0.06)`): Resting card elevation on light backgrounds — the default card shadow.
- **Ambient-sm** (`0 4px 20px rgba(155,63,28,0.04)`): Buttons and small raised elements.
- **Ambient-lg** (`0 20px 50px rgba(155,63,28,0.08)`): Prominent cards and featured surfaces.
- **Float** (`0 -4px 20px rgba(155,63,28,0.06)`): Bottom sheets and floating bars — upward shadow for bottom-anchored surfaces.
- **Popover** (`0 8px 24px rgb(0 0 0 / 0.15)`): Dropdowns and wheel-scroller popups; the one neutral shadow, for float-over-everything surfaces.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest — no resting borders or shadows on cards inside the tonal stack. Shadows appear as a response to state (hover, elevation, focus) or on float-over surfaces (sheets, popovers).
**The Tinted Shadow Rule.** All structural shadows are terracotta-tinted (`rgba(155,63,28,…)`), never pure black. Depth reads warm.

## Shapes

Generous, friendly corners: the form language is **pill for action, rounded-square for media**. Buttons and chips are fully rounded (9999px); product imagery and cards use 12px (`rounded-xl`); product images hold a 4:5 aspect ratio; bottom sheets round 16px at the top corners only; badges use small squared corners (6px). Focus is a 2px terracotta ring with 4px radius and 2px offset — always visible, never a glow-only affordance. The one gradient silhouette (`135deg, #9b3f1c → #bb5732`) is reserved for primary CTAs and the guide-tour next button.

## Components

### Buttons
- **Shape:** Fully rounded pills (9999px) — all of them, at every size.
- **Primary:** Fired Terracotta background, white text, 12px/700/0.1em uppercase, `shadow-ambient-sm`, 12px×24px padding.
- **Hover / Focus:** Background steps to Glazed Terracotta with a brightness lift (filter 1.06); focus shows the 2px terracotta ring; `:active` scales to 0.98.
- **Secondary:** Mid Paper background, Warm Ink text, no border — the quiet sibling for non-primary actions.
- **Disabled:** 70% opacity, no scale transform — still tappable-feeling but clearly inert.

### Chips
- **Style:** Pill (9999px), Mid Paper background, Warm Ink text, 700 weight.
- **State:** Selected/active flips to Fired Terracotta with white text; hover warms to High Paper. Used for category filters and option pills.

### Cards / Containers
- **Corner Style:** 12px radius.
- **Background:** Bright Paper (`#ffffff`) on the Cream Paper page.
- **Shadow Strategy:** `shadow-ambient` at rest (the tonal-layered exception for cards — see Elevation).
- **Border:** None at rest (Flat-By-Default); separators inside use Highest Paper lines.
- **Internal Padding:** 12–16px rhythm (`p-3`/`p-4`), 12px gap between rows.

### Inputs / Fields
- **Style:** Bright Paper background, 1px Highest Paper stroke (`#e4e2de`), 12px radius, 10px×14px padding, 16px font size on touch devices (anti-zoom rule).
- **Focus:** Stroke shifts to Fired Terracotta with a 3px terracotta ring at 35% alpha — never a glow, always a crisp ring.
- **Placeholder:** Faint Ink (#89726a).

### Navigation
- **Style:** The sanctioned glass — `rgba(251,249,245,0.8)` + 20px backdrop blur, sticky top, safe-area padded. Warm Ink icons and labels, 700 weight, active states in Fired Terracotta.
- **Mobile treatment:** Fixed bottom nav (bottom-nav-pad) with the same paper-on-glass treatment; thumb-reach is the constraint.

### Signature Component — Bottom Sheet / Drawer
- **Style:** `fixed left-0 right-0 bottom-0`, 85dvh height, Bright Paper/Cream Paper surface, 16px top corners, Float shadow, `slide-up` on `cubic-bezier(0.22, 1, 0.36, 1)` at 250–300ms. The primary container for cart, filters, and configuration — the mobile-native answer to dialogs.

## Do's and Don'ts

### Do:
- **Do** reserve Fired Terracotta for action: CTAs, links, prices, selection. Keep its screen coverage under ~10%.
- **Do** build structure with the paper tonal stack (white → `#f0eeea` → `#e4e2de`) before reaching for borders or shadows.
- **Do** use the pill shape for every button and chip, and 12px radius for cards and media.
- **Do** use the caps micro-label (12px/700/0.08em uppercase) for all buttons and labels.
- **Do** tint every structural shadow with terracotta (`rgba(155,63,28,…)`).
- **Do** keep Manrope the only font, doing hierarchy with weight and size.
- **Do** respect mobile-first: thumb-reach actions, safe-area insets, 16px input text on touch.
- **Do** use the 4:5 product image ratio and `shadow-ambient` card elevation.

### Don't:
- **Don't** use cool neutral grays or pure black — every surface and text carries warmth (Warm Paper Rule).
- **Don't** add a second font family or a serif accent (One Voice Rule).
- **Don't** use gradient text on headings, violet/blue gradients, or glassmorphism as a default — the one gradient is terracotta CTA, the one glass is the nav.
- **Don't** put terracotta on backgrounds or decoration — it's the action color, not a theme color.
- **Don't** set body or headline copy in uppercase — caps are an action signal only.
- **Don't** ship buttons with squared corners, and don't ship shadows in pure black.
- **Don't** duplicate the DiscountBadge red (`#ef4444`) anywhere except discount badges.