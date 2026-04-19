# Design System Document: Precision & Tactility

## 1. Overview & Creative North Star: "The Machined Monolith"
This design system is a digital translation of high-end industrial design. Inspired by the precision of CNC-milled aluminum and the tactile satisfaction of a custom mechanical keyboard, the system moves away from "web-standard" patterns toward a **High-End Editorial** experience.

**The Creative North Star: The Digital Curator.** 
The UI should not feel like a store; it should feel like a gallery. We achieve this through "The Machined Monolith" approach: utilizing expansive white space, intentional asymmetry that mimics architectural blueprints, and a "tonal-first" hierarchy that eliminates the clutter of traditional borders. We are building a high-fidelity environment where the product—the hardware—is the only thing allowed to be colorful, while the interface provides a surgically clean, premium backdrop.

---

## 2. Colors: Tonal Precision
Our palette avoids the "stark white" of generic SaaS. Instead, we use a sophisticated range of off-whites and cool grays to mimic the matte finish of anodized metal.

### The Palette (Material Design Tokens)
*   **Primary (#451ebb):** Our "Anodized Purple." Used sparingly for high-intent actions.
*   **Primary Container (#5d3fd3):** The brand’s signature highlight. Use this for moments of brand impact.
*   **Surface/Background (#f9f9fe):** A clinical, cool off-white that prevents eye fatigue and feels "custom."
*   **Surface Tiers:** 
    *   `surface-container-lowest`: #ffffff (Pure white for elevated cards)
    *   `surface-container-low`: #f3f3f8
    *   `surface-container-high`: #e8e8ed (For recessed areas)

### The "No-Line" Rule
**Standard 1px borders are strictly prohibited.** To define sections, use background color shifts. A `surface-container-low` section should sit directly against a `surface` background. The transition between these subtle tonal shifts creates a sophisticated, "milled" look that feels integrated rather than outlined.

### The "Glass & Gradient" Rule
Floating elements (modals, dropdowns) must use **Glassmorphism**. 
*   **Token:** `surface-container-lowest` at 80% opacity.
*   **Effect:** `backdrop-blur: 12px`.
*   **Gradients:** CTAs should utilize a subtle linear gradient from `primary` to `primary-container` at a 135° angle to give buttons a 3D, metallic depth.

---

## 3. Typography: The Engineered Word
We pair the technical, geometric personality of **Space Grotesk** with the utilitarian readability of **Inter**.

*   **Display & Headlines (Space Grotesk):** These are our "engravings." Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to mimic the precision of a keyboard’s legend.
*   **Body (Inter):** Used for all long-form specs and descriptions. It provides a neutral, functional contrast to the technical headers.
*   **Labels (Space Grotesk):** Use `label-md` (0.75rem) in ALL CAPS with wide letter-spacing (0.1em) for technical specifications (e.g., "WEIGHT: 1.2KG").

---

## 4. Elevation & Depth: Tonal Layering
In this system, depth is not "raised"; it is "stacked."

### The Layering Principle
Hierarchy is achieved by nesting surface tokens.
1.  **Level 0 (Base):** `surface`
2.  **Level 1 (Sections):** `surface-container-low`
3.  **Level 2 (Interactive Elements):** `surface-container-lowest` (pure white)

### Ambient Shadows
Avoid black shadows. Use a "Tinted Ambient" shadow:
*   **Shadow Color:** `on-surface` (#1a1c1f) at 6% opacity.
*   **Blur:** 24px - 48px.
*   **Spread:** -4px (to keep it tight and clean).

### The "Ghost Border" Fallback
If contrast is required for accessibility, use a **Ghost Border**:
*   **Token:** `outline-variant` at 15% opacity. This mimics a subtle "etching" on a metal surface rather than a drawn line.

---

## 5. Components: Tactile Primitives

### Buttons: The "Keycap" Feel
*   **Primary:** Gradient of `primary` to `primary-container`. Border-radius: `md` (0.375rem). Use a subtle inner-shadow (white, 20% opacity) on the top edge to simulate a beveled edge.
*   **Secondary:** No background. Use a `surface-container-highest` tonal fill on hover.
*   **Tertiary:** `label-md` typography with a subtle underline in `surface-tint`.

### Input Fields: The "Milled" Slot
*   **Style:** No borders. Background: `surface-container-high`.
*   **Focus State:** A 2px solid `primary` bottom-border only. This keeps the layout "flat" and architectural.

### Cards & Lists: Editorial Layouts
*   **Forbidden:** Dividers and lines.
*   **Spacing:** Use vertical white space (32px or 48px) to separate items.
*   **Alignment:** Use intentional asymmetry. Place the product image off-center, overlapping a `surface-container-low` background block to create visual tension and interest.

### Specialized Component: The Spec Grid
Since this is for a keyboard boutique, technical specs are paramount. Use a 2-column grid of `label-sm` (Space Grotesk) text, where the label is `on-surface-variant` and the value is `on-surface` (Bold).

---

## 6. Do's and Don'ts

### Do:
*   **Do** use extreme vertical spacing. Give the hardware room to "breathe" like a gallery piece.
*   **Do** use `primary` sparingly. It should feel like a rare, precious metal accent.
*   **Do** lean into the "Machined" look—sharp corners on large containers (0px) paired with soft corners on interactive buttons (`md`).

### Don't:
*   **Don't** use 100% opaque borders. They break the "monolithic" illusion.
*   **Don't** use generic drop shadows. If it looks like a standard "Material Design" shadow, it’s too heavy.
*   **Don't** center-align everything. Use left-aligned editorial layouts to maintain a sophisticated, technical feel.
*   **Don't** use "pure black" (#000) for text. Use `on-surface` (#1a1c1f) for a softer, more premium contrast against the off-whites.