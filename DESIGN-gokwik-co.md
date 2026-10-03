# Design System Inspired by GoKwik

> Auto-extracted from `https://www.gokwik.co/` on 2026-10-03

## 1. Visual Theme & Atmosphere

Energetic and playful with bold colors and confident hierarchy.

The hero section leads with "Built for D2C. Powered by AI.".

**Key Characteristics:**
- BDO Grotesk as the heading font
- BDO Grotesk as the body font for all running text
- Heading weight 300
- Light/white background (#ffffff) as the primary canvas
- Primary accent `#ff8000` used for CTAs and brand highlights
- 4 shadow level(s) detected — tinted shadows
- Rounded corners (1.5px+) creating a friendly, approachable feel
- Tags: light, rounded, colorful, sans-serif

## 2. Color Palette & Roles

### Primary
- **Primary Accent** (`#ff8000`) · `--color-primary`: Brand color, CTA backgrounds, link text, interactive highlights.
- **Secondary Accent** (`#f79d1d`) · `--color-secondary`: Secondary brand, hover states, complementary highlights.
- **Background** (`#ffffff`) · `--color-bg`: Page background, primary canvas.
- **Background Secondary** (`#f2f1ea`) · `--color-bg-secondary`: Cards, surfaces, alternating sections.

### Text
- **Text Primary** (`#000000`) · `--color-text`: Headings and body text.
- **Text Secondary** (`#666666`) · `--color-text-secondary`: Muted text, captions, placeholders.

### Borders & Surfaces
- **Border** (`#f2f1ea`) · `--color-border`: Dividers, outlines, input borders.

### Full Extracted Palette

| # | Hex | CSS Variable | Role | Area | Contrast |
|---|---|---|---|---|---|
| 1 | `#ffffff` | `--palette-1` | badge | large | text-dark |
| 2 | `#f2f1ea` | `--palette-2` | section | large | text-dark |
| 3 | `#1449b2` | `--palette-3` | block | large | text-light |
| 4 | `#000428` | `--palette-4` | badge | large | text-light |
| 5 | `#f8f7f3` | `--palette-5` | block | large | text-dark |
| 6 | `#10377a` | `--palette-6` | block | large | text-light |
| 7 | `#000000` | `--palette-7` | block | medium | text-light |
| 8 | `#f79d1d` | `--palette-8` | button | medium | text-dark |
| 9 | `#ff8000` | `--palette-9` | text-accent | medium | text-dark |
| 10 | `#081320` | `--palette-10` | button | small | text-light |
| 11 | `#dddcd1` | `--palette-11` | badge | small | text-dark |
| 12 | `#e5e7eb` | `--palette-12` | badge | small | text-dark |
| 13 | `#1c407e` | `--palette-13` | text-accent | small | text-light |

## 3. Typography Rules

- **Heading Font:** `BDO Grotesk`, sans-serif
- **Body Font:** `BDO Grotesk`, sans-serif

### Type Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| H1 | BDO Grotesk | 64px | 300 | 76.8px | normal |
| H2 | BDO Grotesk | 16px | 400 | 25.6px | normal |
| H3 | BDO Grotesk | 14px | 500 | 19.6px | normal |
| H4 | BDO Grotesk | 16px | 400 | 22.4px | normal |
| Body | BDO Grotesk | 10px | 300 | 14px | normal |

### Type Scale

| Token | Size | Suggested Usage |
|---|---|---|
| Display | `64px` | headings |
| H1 | `60px` | headings |
| H2 | `52px` | headings |
| H3 | `48px` | headings |
| H4 | `42px` | headings |
| Body L | `38px` | body / supporting text |
| Body | `36px` | body / supporting text |
| Small | `20px` | body / supporting text |
| XS | `18px` | body / supporting text |
| Caption | `16px` | body / supporting text |

## 4. Component Stylings

### Primary Button

```css
.btn-primary {
  background: transparent;
  color: #000000;
  border-radius: 0px;
  padding: 8px 0px;
  font-size: 14px;
  font-weight: 300;
  border: none;
  cursor: pointer;
}
```

### Pill Button

```css
.btn-pill {
  background: transparent;
  color: #ff8000;
  border-radius: 9999px;
  padding: 0px 0px;
  font-size: 16px;
  font-weight: 400;
  border: 0.8px solid rgba(0, 4, 40, 0.3);
  cursor: pointer;
}
```

### Ghost Button

```css
.btn-ghost {
  background: transparent;
  color: #000428;
  border-radius: 0px;
  padding: 0px 0px;
  font-size: 52px;
  font-weight: 300;
  border: none;
  cursor: pointer;
}
```

### Pill Button 2

```css
.btn-pill-2 {
  background: #081320;
  color: #ffffff;
  border-radius: 9999px;
  padding: 12px 24px;
  font-size: 12px;
  font-weight: 300;
  border: none;
  cursor: pointer;
}
```

### Pill Button 3

```css
.btn-pill-3 {
  background: #f9f9f6;
  color: #000000;
  border-radius: 9999px;
  padding: 12px 24px;
  font-size: 12px;
  font-weight: 300;
  border: none;
  cursor: pointer;
}
```

### Card

```css
.card {
  background: #000000;
  border-radius: 9999px;
  padding: 6px;
}
```

## 5. Layout Principles

- **Base spacing unit:** `8px` — use multiples (16px, 24px, 32px, etc.)

### Spacing Scale (extracted from real elements)

| Token | Value | Role |
|---|---|---|
| spacing-1 | `8px` | element |
| spacing-2 | `12px` | element |
| spacing-3 | `16px` | element |
| spacing-4 | `10px` | element |
| spacing-5 | `6px` | element |
| spacing-6 | `20px` | element |
| spacing-7 | `4px` | element |
| spacing-8 | `36px` | card |

### Border Radius Scale

| Token | Value | Element |
|---|---|---|
| radius-subtle | `1.5px` | subtle |
| radius-button | `8px` | button |
| radius-button | `6px` | button |
| radius-subtle | `4px` | subtle |
| radius-card | `16px` | card |
| radius-card | `30px` | card |

## 6. Depth & Elevation

| Level | Shadow | Usage |
|---|---|---|
| Low | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(240, 15...` | Cards, subtle elevation |
| Low | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(240, 15...` | Cards, subtle elevation |
| Low | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0...` | Cards, subtle elevation |
| Mid | `rgba(0, 0, 0, 0.3) 0px 4px 12px 0px` | Dropdowns, popovers |


## 7. Do's and Don'ts

### Do
- Use `#ffffff` as the primary background color
- Use `BDO Grotesk` for all headings and `BDO Grotesk` for body text
- Use `#ff8000` as the single dominant accent/CTA color
- Maintain `8px` as the base spacing unit — all gaps should be multiples
- Use rounded corners (`1.5px`+) consistently for all interactive elements
- Embrace bold color combinations — playful energy is the point
- Apply the shadow system for elevation — use the extracted shadow values
- Use weight 300 for headings to match the brand's typographic voice

### Don't
- Don't use colors outside the extracted palette without justification
- Don't substitute BDO Grotesk/BDO Grotesk with generic alternatives
- Don't use irregular spacing — stick to 8px grid
- Don't use dark/black backgrounds — this is a light-themed design
- Don't use sharp corners — they feel hostile in this rounded design language
- Don't use pure black (#000000) for text — use `#000000` instead
- Don't add decorative elements not present in the original design — no badges, ribbons, banners, or ornaments unless the source site uses them
- Don't invent UI patterns the source site doesn't have — if the original has no NEW badge, don't add one just because a red is in the palette

## 8. Responsive Behavior

| Breakpoint | Width | Notes |
|---|---|---|
| Mobile | < 640px | Single column, stack sections, reduce font sizes ~80% |
| Tablet | 640–1024px | 2-column where appropriate, maintain spacing ratios |
| Desktop | 1024–1440px | Full layout as designed |
| Wide | > 1440px | Max-width container, center content |

- Touch targets: minimum 44×44px on mobile
- Maintain 8px base unit across breakpoints — only scale multipliers

## 9. Agent Prompt Guide

### Quick Color Reference

```
Background:  #ffffff
Text:        #000000
Accent:      #ff8000
Secondary:   #f79d1d
Border:      #f2f1ea
```

### Example Prompts

1. "Build a hero section with a `#ffffff` background, `BDO Grotesk` heading in `#000000`, and a `#ff8000` CTA button with 9999px radius."
2. "Create a pricing card using background `#f2f1ea`, border `#f2f1ea`, `BDO Grotesk` for text, and 24px padding."
3. "Design a navigation bar — `#ffffff` background, `#000000` links, `#ff8000` for active state."
4. "Build a feature grid with 3 columns, 24px gap, each card using the card component style."
5. "Create a footer with `#000000` background, `#ffffff` text, and 16px padding."

### Iteration Guide

1. Start with layout structure (sections, grid, spacing)
2. Apply colors from the palette — background first, then text, then accents
3. Set typography — font families, sizes from the type scale, weights
4. Add components — buttons, cards, inputs using the specs above
5. Apply border-radius consistently across all elements
6. Add shadows for depth — use the extracted shadow values, not defaults
7. Check responsive behavior — test mobile and tablet layouts
8. Final pass — verify all colors match, spacing is consistent, fonts are correct

## 10. CSS Custom Properties

> 405 custom properties extracted from `:root` / `html` stylesheets.

### Color Variables

| Variable | Value |
|---|---|
| `--footer-bg` | `#f2f1ea` |
| `--footer-text` | `#2f2f2f` |
| `--footer-text-muted` | `rgba(47,47,47,0.7)` |
| `--footer-border` | `rgba(0,4,40,0.2)` |
| `--footer-contact-border` | `#c9c9c9` |
| `--color-store-bg` | `#f79d1d` |
| `--color-store-border` | `rgba(255,255,255,0.58)` |
| `--color-store-border-strong` | `#ffffff` |
| `--color-platform-description` | `rgba(47,47,47,0.7)` |
| `--color-platform-feature-text` | `rgba(0,0,0,0.72)` |
| `--color-faq-item-border` | `rgba(0,4,40,0.1)` |
| `--color-faq-answer-text` | `rgba(105,105,105,0.898)` |
| `--color-faq-toggle-border` | `rgba(136,136,136,0.1)` |
| `--color-faq-item-open-bg` | `#fafafa` |
| `--color-merchant-bg` | `#1449b2` |
| `--color-merchant-border` | `#2e5dba` |
| `--color-merchant-border-light` | `rgba(255,255,255,0.17)` |
| `--color-merchant-border-strong` | `rgba(255,255,255,0.86)` |
| `--color-merchant-border-subtle` | `rgba(255,255,255,0.18)` |
| `--color-merchant-testimonial-bg` | `#10377a` |
| `--color-merchant-testimonial-content` | `#f2f1ea` |
| `--color-merchant-testimonial-text` | `#1c407e` |
| `--color-merchant-testimonial-text-muted` | `rgba(28,64,126,0.8)` |
| `--color-merchant-case-study-border` | `#2256bf` |
| `--color-merchant-nav-border` | `rgba(255,255,255,0.54)` |
| `--color-trusted-primary` | `#000428` |
| `--color-trusted-text` | `#2f2f2f` |
| `--color-trusted-border` | `rgba(221,220,209,0.58)` |
| `--color-trusted-tab-border` | `rgba(0,4,40,0.1)` |
| `--color-trusted-tab-active` | `#f79d1d` |
| ... | *(184 more)* |

### Spacing Variables

| Variable | Value |
|---|---|
| `--footer-padding-mobile` | `1rem` |
| `--footer-padding-desktop` | `3.375rem` |
| `--footer-section-gap` | `1.5rem` |
| `--footer-column-gap` | `2.125rem` |
| `--footer-logo-width-mobile` | `171px` |
| `--footer-logo-width-desktop` | `311px` |
| `--footer-cert-size-mobile` | `2.75rem` |
| `--footer-cert-size-desktop` | `2.8125rem` |
| `--footer-social-size-mobile` | `1.875rem` |
| `--footer-social-size-desktop` | `2.5rem` |
| `--footer-contact-card-max-width` | `44.9375rem` |
| `--platform-divider-width` | `0.5px` |
| `--platform-icon-size` | `2.5rem` |
| `--platform-icon-size-mobile` | `2rem` |
| `--platform-icon-border` | `4px` |
| `--platform-icon-border-mobile` | `3px` |
| `--platform-feature-bar-height` | `0.25rem` |
| `--faq-item-padding-mobile` | `1rem` |
| `--faq-content-gap-mobile` | `0.75rem` |
| `--faq-content-gap-lg` | `1.25rem` |
| ... | *(131 more)* |

### Typography Variables

| Variable | Value |
|---|---|
| `--footer-text-xs` | `0.625rem` |
| `--footer-text-sm` | `0.75rem` |
| `--footer-text-base` | `0.8125rem` |
| `--footer-text-md` | `0.875rem` |
| `--footer-text-lg` | `1rem` |
| `--headingfont` | `BDO Grotesk, sans-serif` |
| `--bodyfont` | `PP Neue Montreal, sans-serif` |
| `--accentfont` | `BDO Grotesk, sans-serif` |
| `--monofont` | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` |
| `--basefontsize` | `16px` |
| `--line-height-tight` | `1.2` |
| `--line-height-base` | `1.4` |
| `--line-height-balanced` | `1.6` |
| `--line-height-relaxed` | `1.68` |
| `--letter-spacing-tight` | `-2%` |
| `--letter-spacing-normal` | `0` |
| `--letter-spacing-wide` | `1%` |
| `--letter-spacing-wider` | `2%` |
| `--font-weight-light` | `300` |
| `--font-weight-normal` | `400` |
| ... | *(4 more)* |

### Other Variables

| Variable | Value |
|---|---|
| `--faq-item-padding-lg` | `1.5rem 2rem` |
| `--faq-item-padding-xl` | `1.5rem 2.75rem` |
| `--faq-header-padding-mobile` | `2.5rem 1.5rem 2.25rem` |
| `--faq-layout-padding-lg` | `3.25rem 2rem` |
| `--faq-layout-padding-xl` | `4.5rem 3.25rem` |
| `--journey-milestone-card-bg-gradient` | `linear-gradient(to right,var(--color-journey-milestone-card-bg-start),var(--color-journey-milestone-card-bg-mid) 25% 75%,var(--color-journey-milestone-card-bg-end))` |
| `--journey-milestone-date-badge-bg` | `linear-gradient(to bottom,var(--color-journey-milestone-date-badge-start),var(--color-journey-milestone-date-badge-mid) 45% 55%,var(--color-journey-milestone-date-badge-end))` |
| `--shadow-none` | `none` |
| `--transition-duration` | `200ms` |
| `--transition-duration-fast` | `100ms` |
| `--transition-duration-slow` | `300ms` |
| `--transition-duration-slower` | `500ms` |
| `--transition-timing-default` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--transition-timing-in` | `cubic-bezier(0.4, 0, 1, 1)` |
| `--transition-timing-out` | `cubic-bezier(0, 0, 0.2, 1)` |
| ... | *(1 more)* |
