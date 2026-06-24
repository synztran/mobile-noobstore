---
name: Toy-Modern Storefront
colors:
  surface: '#FBF9F5'
  surface-dim: '#dbdad6'
  surface-bright: '#fbf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f0'
  surface-container: '#F0EEEA'
  surface-container-high: '#e9e8e4'
  surface-container-highest: '#e4e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#56423c'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ed'
  outline: '#89726A'
  outline-variant: '#ddc0b8'
  surface-tint: '#9e421e'
  primary: '#7c2805'
  on-primary: '#ffffff'
  primary-container: '#BB5732'
  on-primary-container: '#ffc8b6'
  inverse-primary: '#ffb59c'
  secondary: '#52652a'
  on-secondary: '#ffffff'
  secondary-container: '#D4ECA2'
  on-secondary-container: '#56692e'
  tertiary: '#5210bc'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b37d4'
  on-tertiary-container: '#ddcdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#FFDBCF'
  primary-fixed-dim: '#ffb59c'
  on-primary-fixed: '#390c00'
  on-primary-fixed-variant: '#7f2b08'
  secondary-fixed: '#d4eba2'
  secondary-fixed-dim: '#b9cf88'
  on-secondary-fixed: '#141f00'
  on-secondary-fixed-variant: '#3b4d14'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#fbf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e4e2df'
  primary-action: '#D46A43'
  sale-red: '#EF4444'
  savings-green: '#16A34A'
typography:
  headline-hero:
    fontFamily: manrope
    fontSize: 48px
    fontWeight: '900'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-section:
    fontFamily: manrope
    fontSize: 24px
    fontWeight: '900'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  product-name:
    fontFamily: manrope
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
  price:
    fontFamily: manrope
    fontSize: 16px
    fontWeight: '800'
    lineHeight: 24px
  label-caps:
    fontFamily: manrope
    fontSize: 10px
    fontWeight: '900'
    lineHeight: 12px
    letterSpacing: 0.1em
  button-text:
    fontFamily: manrope
    fontSize: 11px
    fontWeight: '900'
    lineHeight: 16px
    letterSpacing: 0.14em
  body-standard:
    fontFamily: manrope
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  body-small:
    fontFamily: manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  nav-label:
    fontFamily: manrope
    fontSize: 9px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-page: 1.5rem
  gutter-grid: 1rem
  stack-gap: 1rem
  nav-height: 48px
  bottom-nav-bottom: 1.25rem
---

## Brand & Style

The design system follows a **Toy-Modern** aesthetic—a playful yet sophisticated blend of tactile elements and contemporary minimalist layouts. It is specifically optimized for a mobile-first e-commerce experience in the Vietnamese market. 

The visual language is defined by "squishy" high-engagement interactions, heavy use of bold typography, and a warm, earthy color palette. The emotional response should feel accessible, high-energy, and reliable. 

Key stylistic pillars include:
- **Tactile Minimalism:** Clean layouts paired with physical metaphors like deep shadows and heavy rounded corners.
- **Glassmorphism:** Used strategically for navigational layers to maintain context of the underlying content.
- **Micro-interactions:** Every touchpoint provides immediate physical feedback through scale-based animations.

## Colors

The palette is anchored by "Terracotta" and "Olive," providing a grounded, organic feel that differentiates the product from typical blue-centric e-commerce platforms. 

- **Primary (Terracotta):** Used for the most critical actions and brand identity. It often appears as a gradient (`#9B3F1C` to `#BB5732`) on hero elements and main CTAs.
- **Secondary (Olive):** Reserved for secondary actions, success states, and sustainability-related messaging.
- **Surface System:** Uses a warm off-white (`#FBF9F5`) instead of pure white to reduce eye strain and enhance the "toy" tactile feel. Container tiers range from `lowest` (pure white for cards) to `highest` for UI chrome.
- **Semantic Accents:** Red is used aggressively for discounts and sales, while Violet is dedicated to pre-order signaling.

## Typography

This design system uses **Manrope** exclusively to maintain a modern, geometric, and highly legible appearance. 

The typographic hierarchy relies heavily on font weight and casing rather than just size. "Black" (900) weight is used for headings, labels, and buttons to reinforce the bold, toy-like aesthetic. Most interactive labels use wide letter-spacing and uppercase styling for improved scanability on mobile devices.

For mobile-specific adaptations, the `headline-hero` should scale down to `36px` on devices smaller than 375px wide.

## Layout & Spacing

The layout is **mobile-first** and utilizes a fluid 2-column grid for product listings. 

- **Page Margins:** A standard 24px (`px-6`) horizontal margin is applied to all page content.
- **Top Navigation:** A 48px high sticky bar with a glass effect (background blur).
- **Bottom Navigation:** A floating, pill-shaped navigation bar centered at the bottom of the screen. It is constrained to a `max-width: 70vw` on larger mobile screens and floats 20px above the bottom edge.
- **Safe Areas:** Padding must dynamically account for iOS safe areas. Top navigation should include `env(safe-area-inset-top)` plus a 1rem buffer.

## Elevation & Depth

Visual hierarchy is achieved through **ambient shadows** and **glassmorphism** rather than traditional high-contrast borders.

- **Ambient Shadows:** Shadows are tinted with the primary terracotta color at extremely low opacities (4% to 8%). This creates a "glow" effect that makes elements feel like they are floating in the brand's atmosphere.
- **Glass Effects:** Both the TopNav and BottomNav use a semi-transparent surface (`rgba(251, 249, 245, 0.8)`) with a `20px` backdrop blur.
- **Tonal Layering:** Interactive surfaces like cards use a pure white background (`surface-container-lowest`) to pop against the warm off-white page background.

## Shapes

The shape language is generously rounded to support the "toy" aesthetic. 
- **Standard UI Elements:** Use a base 0.5rem (8px) radius.
- **Cards & Inputs:** Use a 1rem (16px) radius to emphasize a friendly, soft feel.
- **Pills & Buttons:** Use a full radius (pill-shaped) or up to 2.5rem (40px) for high-impact CTAs. 
- **Image handling:** Product images should always feature rounded corners (minimum 12px) to prevent them from feeling "sharp" against the soft UI.

## Components

### Buttons
- **Primary:** Features the brand gradient with white text. Roundedness is `2xl` (16px).
- **Action Pills:** Small, high-contrast buttons (Black 900 font weight) used within product cards.
- **Interactions:** Every button must scale to `95%` or `98%` on press to provide tactile feedback.

### Cards
- **Product Card:** Uses a 1:1 aspect ratio for images. It includes a category label in primary-color caps, a bold price, and a full-width action button.
- **Elevation:** Product cards sit on `shadow-ambient-sm`.

### Input Fields
- Inputs use the `surface-container` color with no border by default, but transition to a `2px` primary-colored border on focus. Labels are tiny, bold, and sit above the field.

### Bottom Sheets
- The primary overlay for complex interactions. It features a visible drag handle, a blurred backdrop, and a maximum height of `80dvh`. 

### Navigation
- **Bottom Nav:** A floating glass pill with 5 icons. Active states are highlighted with a tinted background (`primary-fixed/60`) and primary color text.