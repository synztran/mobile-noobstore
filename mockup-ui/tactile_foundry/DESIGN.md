# Design System Document: The Tactile Precision Aesthetic

## 1. Overview & Creative North Star
**Creative North Star: "The Analog Digitalist"**

This design system is engineered to bridge the gap between high-end industrial design and digital fluidity. We are not building a standard e-commerce store; we are creating a digital atelier for the mechanical keyboard enthusiast.

To move beyond the "template" look, we utilize **Asymmetric Precision**. This means leveraging generous white space (or "dark space") and intentional overlapping of high-fidelity photography with technical typography. Elements should feel like they are precision-milled components resting on a dampened surface. We prioritize tonal depth over structural lines, ensuring the interface feels as premium as a weighted aluminum chassis.

---

## 2. Colors: Tonal Architecture
Our palette is a study in "Midnight Neutrals" punctuated by high-energy "Switch Accents."

### The Palette
- **Core Backgrounds:** The system is set to `light` mode. Use a light neutral like `#F5F5F5` (or a more specific shade derived from the current `neutral_color_hex`) for primary canvases, allowing for subtle depth.
- **The Accents:** `primary` (#7C4DFF) and `secondary` (system-derived from `seed_color_hex` and `color_variant` for appropriate light mode usage) represent the "linear" and "tactile" neon tones. These should be used sparingly for high-impact CTAs and key brand moments.
- **Functional States:** Use `error` (#ff6e84) for alerts, ensuring the tone remains sophisticated and not "alarmist."

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning.
Boundaries must be defined solely through background color shifts. The eye should perceive change through value, not outlines.

### The "Glass & Gradient" Rule
To inject "soul" into the tech aesthetic:
- **Glassmorphism:** For floating navigation or mobile menus, use a light-themed `surface-variant` at 60% opacity with a `24px` backdrop-blur.
- **Signature Gradients:** Main CTAs should utilize a subtle linear gradient from `primary` (#7C4DFF) to a suitable `primary_container` (system-derived) equivalent. This mimics the way light hits a matte-finish PBT keycap.

---

## 3. Typography: Editorial Tech
We pair the geometric precision of **Space Grotesk** with the utilitarian clarity of **Inter**.

- **Display & Headlines (Space Grotesk):** These are our "Statement" levels. Use `display-lg` for hero product names. The wide apertures and technical curves of Space Grotesk mirror the aesthetic of custom keycap legends.
- **Titles & Body (Inter):** Inter handles all functional data. It is neutral, legible, and allows the product photography to remain the protagonist.
- **Labels (Inter Mono/Small):** Use `label-md` for technical specs (e.g., "Actuation Force: 45g").

**Hierarchy Strategy:** Always lead with a large `display` heading, but follow with a significantly smaller `body-md`. This high-contrast scale creates an editorial, high-end magazine feel rather than a dense web app.

---

## 4. Elevation & Depth: Tonal Layering
In this design system, height is expressed through light, not lines.

### The Layering Principle
Depth is achieved by "stacking" surface tiers. In light mode, this means progressively lighter shades or subtle tints.
- **Base:** The primary light neutral (e.g., `#F5F5F5`).
- **Section:** A slightly lighter or tinted neutral.
- **Card/Element:** Progressively lighter neutrals, creating a "nested" feel that mimics physical components sitting inside a keyboard tray.

### Ambient Shadows
Shadows must be "Invisible but Felt." Use a `0 20px 40px` spread with a 6% opacity of `on_surface`. The shadow should feel like ambient light being occluded, not a dark smudge.

### The "Ghost Border" Fallback
If accessibility requires a container definition, use the **Ghost Border**: `outline-variant` at 15% opacity. Never use 100% opaque borders.

---

## 5. Components: Precision Primitives

### Buttons
- **Primary:** `primary` background (#7C4DFF) with `on_primary` text. Corners are moderately rounded, aligned with the system's `roundedness` (2) for a balanced feel. Use a subtle `primary_dim` inner shadow for a "pressed" feel.
- **Tertiary:** No background. Use `primary` text (#7C4DFF) with a `label-md` weight.

### Cards & Lists
- **Rule:** Absolute prohibition of divider lines.
- **Layout:** Separate items using `24px` or `32px` of vertical space, adhering to the `normal` spacing (2) for a clear layout. For product cards, use a slightly lighter base for the card against the background to create a soft, natural lift.

### Input Fields
- Use a distinct, slightly darker neutral for the input track.
- The "Active" state is marked not by a thick border, but by the label shifting to `primary` color (#7C4DFF) and a subtle `0.5px` Ghost Border appearing.

### Boutique-Specific Components
- **Switch Toggle:** A custom radio component that mimics the tactile "thock" of a switch.
- **Spec Grid:** A high-contrast grid using appropriate light backgrounds and `inter` mono labels for technical keyboard specifications.

---

## 6. Do's and Don'ts

### Do
- **Use Intentional Asymmetry:** Offset product images so they break the "grid container."
- **Embrace the Light:** Allow large areas of the primary light neutral to exist. Negative space is a luxury.
- **Layer Elements:** Let text partially overlap an image of a keyboard to create depth.

### Don't
- **Don't use 1px Borders:** It breaks the high-end industrial feel.
- **Don't use Standard "Drop Shadows":** Avoid high-opacity, tight-radius shadows. They feel like 2010-era UI.
- **Don't Crowded the Layout:** If you feel the need to add a divider, add 16px of extra padding instead, consistent with the `normal` spacing (2).
- **Don't use Pure Black for Body Text:** Use a softer dark grey (e.g., `on_surface_variant`) for long-form text to reduce eye strain and maintain sophistication in light mode.