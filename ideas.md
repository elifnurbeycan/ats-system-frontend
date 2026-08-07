# ATS System Frontend - Design Brainstorming

## Three Stylistic Approaches

### 1. Soft Atelier
**Theme Name**: Soft Atelier
**Very Brief Intro**: Light, warm cream/ivory backgrounds with rich charcoal text and a signature coral/terracotta accent. Human-centric and premium, fitting for a talent acquisition platform.
**Probability**: 0.07

### 2. Obsidian Flow
**Theme Name**: Obsidian Flow
**Very Brief Intro**: Dark slate backgrounds with glassmorphic surfaces and an emerald-teal signature accent. A sophisticated, modern dashboard aesthetic that feels like a premium command center.
**Probability**: 0.04

### 3. Nordic Precision
**Theme Name**: Nordic Precision
**Very Brief Intro**: Crisp white surfaces with deep navy, sharp geometric layouts, and a signature electric blue accent. Clean, structured, and efficient.
**Probability**: 0.08

---

## Chosen Approach: Obsidian Flow

**Design Movement**: Dark-mode glassmorphism with editorial typography influences

**Core Principles**:
1. **Depth through layering**: Glassmorphic cards floating over deep slate backgrounds with subtle gradient washes
2. **Emerald-teal as signature**: A distinctive emerald-teal accent (#2dd4bf / oklch(0.85 0.15 165)) that signals action and progress
3. **Data-first elegance**: Numbers and metrics get typographic priority with monospace treatment
4. **Fluid transitions**: Pipeline stages flow visually with connecting lines and smooth stage transitions

**Color Philosophy**:
- Background: Deep slate/charcoal (oklch(0.15 0.01 260)) — provides a premium dark canvas
- Surface: Glassmorphic panels with subtle white overlays (5-8% opacity)
- Primary accent: Emerald-teal (oklch(0.85 0.15 165)) — signals growth, progress, and action
- Secondary accents: Warm amber for warnings/hold, rose for rejected, violet for special states
- Text: High-contrast off-white (oklch(0.92 0.01 260)) for readability

**Layout Paradigm**:
- Persistent left sidebar navigation (icon + label, collapsible)
- Asymmetric content area with dashboard cards in a bento-grid layout
- Pipeline view as a horizontal Kanban board with drag-indicators
- Detail pages use a split-pane layout (info left, timeline right)

**Signature Elements**:
1. **Glassmorphic cards**: Semi-transparent panels with backdrop-blur and subtle borders
2. **Aurora gradient washes**: Subtle teal-to-violet gradient blobs in the background
3. **Stage connector lines**: Visual flow indicators between pipeline stages

**Interaction Philosophy**:
- Hover states reveal additional context (tooltips, quick actions)
- Stage transitions animate with a fluid slide effect
- Data updates pulse subtly to draw attention
- Empty states are inviting, not barren

**Animation**:
- Card entrances: staggered fade-up (30ms intervals, 200ms duration)
- Pipeline stage transitions: slide + fade (250ms, ease-out)
- Sidebar items: subtle background slide on hover (160ms)
- Number changes: subtle scale pulse (180ms)
- Page transitions: crossfade (200ms)

**Typography System**:
- Headings: Space Grotesk (600/700 weight) — geometric, modern, distinctive
- Body: Inter (400/500 weight) — clean, readable
- Data/Metrics: JetBrains Mono (500 weight) — tabular numbers for metrics
- Hierarchy: Display 32px > Title 20px > Body 14px > Caption 12px

**Brand Essence**: A premium talent acquisition command center for modern recruitment teams who demand clarity and control.

**Brand Voice**: Confident, precise, and human. Headlines are short and action-oriented.
- Example headline: "Track every candidate, close every role."
- Example CTA: "Move to Interview Stage"
- Ban: "Welcome to our platform" or "Get started today"

**Wordmark & Logo**: A geometric "A" mark formed by an upward arrow, suggesting growth and advancement. Bold, minimal, emerald-teal on transparent background.

**Signature Brand Color**: Emerald-teal (oklch(0.85 0.15 165)) — #2dd4bf
