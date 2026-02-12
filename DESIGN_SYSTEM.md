# Design System: Technical Precision

A refined brutalist aesthetic for the OpenCode research interface - maximum clarity, zero clutter, instant feedback.

## Philosophy

**No gradients. No glassmorphism. No cruft.**

This design system prioritizes:
- **Legibility** - true black backgrounds, maximum contrast
- **Precision** - sharp 2px corners, 1px borders, grid-aligned spacing
- **Efficiency** - tighter padding, compact components, minimal motion
- **Focus** - single accent color, clear hierarchy

---

## Typography

### Font Stack

```css
--font-sans: "IBM Plex Sans", system-ui, sans-serif
--font-mono: "IBM Plex Mono", "JetBrains Mono", monospace
```

**IBM Plex** provides a cohesive technical aesthetic:
- Sans for UI labels and body text
- Mono for code, data, and technical identifiers

### Type Scale

```css
/* Badges, kickers */
10px · uppercase · tracking-wider · font-mono

/* Secondary text */
12px · regular · leading-relaxed

/* Body, inputs, buttons */
13px · regular · letter-spacing: -0.01em

/* Headings, card titles */
14px · semibold · tracking-tight
```

---

## Color System

### Dark Theme (Default)

```css
/* Backgrounds - True black foundation */
--background:         #000000  /* Base canvas */
--surface-base:       #0a0a0a  /* Default surface */
--surface-raised:     #111111  /* Cards, panels */
--surface-hover:      #1a1a1a  /* Interactive hover */
--surface-inset:      #050505  /* Recessed inputs */

/* Borders - Sharp 1px divisions */
--border-weak:        #1a1a1a  /* Subtle dividers */
--border-base:        #222222  /* Standard borders */
--border-strong:      #2a2a2a  /* Emphasized borders */
--border-selected:    #0066FF  /* Focus state */

/* Text - Maximum contrast */
--text-strong:        #ffffff  /* Headings */
--text-base:          #f5f5f5  /* Body */
--text-weak:          #888888  /* Secondary */
--text-weaker:        #555555  /* Tertiary */

/* Accent - Electric blue focal point */
--accent:             #0066FF  /* Primary actions */
--accent-hover:       #0052CC  /* Hover state */
--accent-soft:        #001133  /* Subtle background */

/* Status - High contrast signals */
--success:            #00FF41  /* Terminal green */
--warning:            #FFD700  /* Gold */
--critical:           #FF0055  /* Hot pink red */
```

---

## Components

### Button

Sharp corners, clear variants, snap interactions:

```tsx
// Primary (inverted)
<Button variant="default">Submit</Button>
// White bg, black text

// Secondary (subtle)
<Button variant="secondary">Cancel</Button>
// Dark bg, white text, border

// Accent (electric)
<Button variant="accent">Connect</Button>
// Blue bg, white text

// Outline (ghost with border)
<Button variant="outline">Filter</Button>

// Ghost (minimal)
<Button variant="ghost">More</Button>
```

**Specs:**
- Height: 36px (default), 32px (sm), 40px (lg)
- Corners: 2px
- Padding: 16px horizontal
- Font: 13px medium
- Border: 1px solid
- Transition: none (instant)
- Active: translateY(1px) - tactile press

### Card

Minimal containers with tighter spacing:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Session Timeline</CardTitle>
    <CardDescription>Recent activity</CardDescription>
  </CardHeader>
  <CardContent>
    {/* content */}
  </CardContent>
</Card>
```

**Specs:**
- Corners: 2px
- Border: 1px solid `--border-base`
- Padding: 16px (down from 24px)
- Header gap: 4px
- Title: 14px semibold
- Description: 12px weak

### Badge

Monospace labels, compact pills:

```tsx
<Badge variant="success">RUNNING</Badge>
<Badge variant="danger">ERROR</Badge>
<Badge variant="accent">NEW</Badge>
```

**Specs:**
- Height: auto (compact)
- Corners: 2px (sharp)
- Padding: 8px horizontal, 2px vertical
- Font: 10px semibold mono uppercase
- Letter-spacing: 0.08em
- Border: 1px solid matching color

### Input / Textarea

Sharp focus states, electric blue rings:

```tsx
<Input placeholder="Search sessions..." />
<Textarea placeholder="Enter query..." />
```

**Specs:**
- Height: 36px (input)
- Corners: 2px
- Border: 1px solid `--border-base`
- Focus: `--border-selected` + 1px ring
- Font: 13px regular
- Textarea: monospace, 80px min-height

---

## Utilities

### Status Indicators

```tsx
<div className="oc-status-dot oc-status-running" />
<div className="oc-status-dot oc-status-error" />
<div className="oc-status-dot oc-status-idle" />
```

Square 6x6px indicators with 2px soft glow.

### Code Blocks

```tsx
<code className="oc-code">sessionId</code>
```

Inline monospace with inset background and border.

### Kickers (Labels)

```tsx
<div className="oc-kicker">Engine Status</div>
```

10px uppercase mono with wide letter-spacing.

### Monospace Text

```tsx
<span className="oc-mono">127.0.0.1:4096</span>
```

Technical data in mono font.

### Interactive Cards

```tsx
<Card className="oc-interactive">
  {/* Hover lift effect */}
</Card>
```

Subtle elevation on hover, 1px press on click.

---

## Spacing Scale

Tighter, more efficient:

```css
xs:  4px   /* Tight gaps */
sm:  8px   /* Component internal */
md:  12px  /* Card padding */
lg:  16px  /* Section spacing */
xl:  24px  /* Page margins */
2xl: 32px  /* Major sections */
```

---

## Shadows

Minimal, hard-edged:

```css
/* Standard cards */
--shadow-hard: 0 0 0 1px var(--border-base)

/* Elevated (hover states) */
--shadow-elevated:
  0 0 0 1px var(--border-base),
  0 2px 0 0 rgba(0,0,0,0.8)
```

---

## Motion

**Transition: none**

Instant state changes feel more technical and responsive:
- No easing curves
- Snap hover states
- Immediate focus rings
- 1px active press for tactile feedback

Exception: Smooth scrolling and page transitions remain for UX.

---

## Scrollbars

Custom square scrollbars matching the sharp aesthetic:

```css
width: 8px
thumb: --border-strong with 1px border
hover: --border-selected
radius: 0 (square)
```

---

## Accessibility

- **Contrast**: WCAG AAA (21:1 on true black)
- **Focus**: Electric blue rings (1px with offset)
- **Target size**: 36px minimum (buttons)
- **Motion**: Respects prefers-reduced-motion
- **Color**: Never color-only status (always paired with icons/labels)

---

## Usage Guidelines

### Do

- Use true black backgrounds
- Keep corners sharp (2px max)
- Single accent color for focus
- Monospace for technical data
- Compact spacing, clear hierarchy
- Instant state changes

### Don't

- Add gradients or glassmorphism
- Round corners beyond 2px
- Use multiple accent colors
- Add transitions/easing (except page-level)
- Bloat padding unnecessarily
- Mix font families

---

## Implementation

All tokens defined in:
```
src/app/globals.css
```

Components use CSS variables:
```tsx
bg-[var(--surface-raised)]
text-[var(--text-base)]
border-[var(--border-base)]
```

Utility classes prefixed with `.oc-`:
```css
.oc-panel      /* Standard panel shell */
.oc-kicker     /* Uppercase labels */
.oc-mono       /* Monospace text */
.oc-code       /* Inline code */
.oc-interactive /* Hover lift */
```

---

## Browser Support

- Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- CSS variables (IE11 not supported)
- CSS Grid and Flexbox
- System fonts fallback for IBM Plex

---

**Last Updated:** 2026-02-12
**Version:** 1.0.0
