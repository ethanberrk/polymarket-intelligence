# UI/UX Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix bugs, clean up visual issues, and improve editorial clarity discovered via Playwright audit of the live site.

**Architecture:** All changes are CSS or component-level — no API or data model changes. Dark mode is already locked in a pushed commit awaiting Vercel deploy.

**Tech Stack:** Next.js App Router, TypeScript, CSS custom properties, no UI library.

---

## Issues Found (Audit Summary)

**Critical bugs:**
- Trending tab shows NBA games (sports), not politics — all at 100% (resolved) and $0K volume
- Multiple curated markets display "$0K" volume — looks broken

**Layout / editorial:**
- Home page: all 8 sections have equal visual weight — no lead story hierarchy
- Section preview callout block duplicates the sidebar narrative word-for-word
- Category view (Iran, Midterms, etc.): callout quote spans full page width — too wide to read
- KPI mini-cards in category view show ALL CAPS question text — hard to read
- KPI mini-cards have no Yes/No label — "23%" is ambiguous without the question context visible

**Sidebar:**
- "18% YES" / "34% YES" signals without the question are editorially unclear
- The `label` field just says "Yes" — not enough context

---

## Task 1: Fix Trending — filter out sports & resolved markets

**Files:**
- Modify: `lib/polymarket.ts` — `fetchTrending` function

**Problem:** The Gamma API trending endpoint returns all top-volume markets globally, which includes NBA games that finished last night (100% probability, $0K volume). The filter needs to exclude:
1. Markets where any single outcome is ≥ 99% (effectively resolved)
2. Markets that are sports/entertainment (not politics)

**Approach:** Filter on the client side after fetching — exclude markets where the max outcome probability ≥ 0.99, and exclude markets that already have volume = 0 AND max probability ≥ 0.99.

- [ ] **Step 1: Read the current fetchTrending function**

Read `lib/polymarket.ts` — find the `fetchTrending` function and understand the current filter.

- [ ] **Step 2: Add resolved-market filter**

In `fetchTrending`, after `normalizeOutcomes`, add a filter:
```typescript
// Filter out resolved markets (any outcome ≥ 99%) and zero-volume sports
.filter(m => {
  const maxProb = Math.max(...m.outcomes.map(o => o.probability))
  return maxProb < 0.99
})
```

- [ ] **Step 3: Verify locally**

Run `npm run dev`, navigate to Trending tab, confirm no NBA games appear. If trending is now empty, relax the threshold to 0.995.

- [ ] **Step 4: Commit**
```bash
git add lib/polymarket.ts
git commit -m "fix: filter resolved markets from trending (removes NBA games at 100%)"
```

---

## Task 2: Fix "$0K" volume display

**Files:**
- Modify: `components/MarketCard.tsx`

**Problem:** Markets with volume < $500 display as "$0K". This looks like a data bug. Should show "< $1K" when volume is positive but rounds to zero.

- [ ] **Step 1: Read MarketCard volume formatting code**

Read `components/MarketCard.tsx` — find the volume display logic.

- [ ] **Step 2: Fix the formatter**

Replace the volume display:
```typescript
function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`
  if (volume >= 1_000) return `$${Math.round(volume / 1_000)}K`
  if (volume > 0) return '< $1K'
  return '$0'
}
```
Use `formatVolume(market.volume)` in the JSX.

- [ ] **Step 3: Commit**
```bash
git add components/MarketCard.tsx
git commit -m "fix: show '< $1K' instead of '$0K' for low-volume markets"
```

---

## Task 3: Remove callout duplication on home section previews

**Files:**
- Modify: `components/SectionPreview.tsx`

**Problem:** Each section preview on the home page renders a `.callout` block with the section narrative. This is the exact same text shown in the "What the Markets Say" sidebar just to the left. It's redundant and makes the home page feel padded.

**Fix:** Remove the callout block entirely from `SectionPreview`. The editorial framing lives in the sidebar. The section preview should go: header → market cards → "All N markets →".

- [ ] **Step 1: Read SectionPreview**

Read `components/SectionPreview.tsx`.

- [ ] **Step 2: Remove the callout block**

Delete the `{section.narrative && <div className="callout">...</div>}` line.

- [ ] **Step 3: Verify home page looks clean**

Run dev server, check home view — section previews should flow: category label → title → intro text → market cards.

- [ ] **Step 4: Commit**
```bash
git add components/SectionPreview.tsx
git commit -m "fix: remove duplicate callout from section previews (narrative lives in sidebar)"
```

---

## Task 4: Fix category view callout width + KPI card text

**Files:**
- Modify: `styles/globals.css`
- Modify: `components/KPIRow.tsx` (if it exists) or wherever KPI cards render

**Problems:**
1. The italic callout quote in full category view spans the full page width (1200px+) — comfortable reading width is 65–75ch
2. The KPI mini-cards show market questions in ALL CAPS — should be Title Case or sentence case
3. KPI mini-cards show no Yes/No label — just "23%" with no context

**Fix 1 — Callout max-width:**
```css
.callout {
  max-width: 72ch;  /* add this */
}
```

**Fix 2 — KPI card text:**
Read `components/KPIRow.tsx` or `components/Section.tsx` to find where KPI cards render question text. The text is being uppercased via CSS (`text-transform: uppercase`). Change to `text-transform: none` and apply `font-size: var(--text-xs)` with normal case.

**Fix 3 — KPI card Yes/No label:**
In the KPI card, below the percentage, show the outcome label. If the KPI card renders `{ pct, label, question }`, display:
```tsx
<span className="kpi-outcome-label">{label}</span>
```

- [ ] **Step 1: Read Section.tsx and KPIRow.tsx**

Read both files to understand the KPI rendering.

- [ ] **Step 2: Add Yes/No label to KPI card**

In the KPI card JSX, add the outcome label below the percentage (e.g., "Yes" / "No").

- [ ] **Step 3: Fix callout max-width in CSS**

In `globals.css`, add `max-width: 72ch` to `.callout`.

- [ ] **Step 4: Fix KPI text casing**

In globals.css, find `.kpi-question` (or equivalent) and change `text-transform: uppercase` to `text-transform: none`. Adjust font-size if needed.

- [ ] **Step 5: Commit**
```bash
git add styles/globals.css components/KPIRow.tsx components/Section.tsx
git commit -m "fix: callout max-width, KPI card yes/no label, KPI text casing"
```

---

## Task 5: Add lead story treatment to home page

**Files:**
- Modify: `components/HomeContent.tsx`
- Modify: `components/SectionPreview.tsx` (or new `LeadSection.tsx`)
- Modify: `styles/globals.css`

**Problem:** All 8 sections on the home page have the same visual weight. The Iran Conflict has 10x the volume of State Primaries and is the biggest news story — it should look like a lead story.

**Design:** The first section (by volume or by curated order) gets a "lead" treatment:
- Full-width, no sidebar overlap (or sidebar only shows for subsequent sections)
- Section title in larger type
- Shows 4 market cards (2×2) instead of 3
- Has a more prominent category label

**Implementation:**
- In `HomeContent.tsx`, split `activeSections` into `[leadSection, ...restSections]`
- Render `leadSection` with `className="section-preview section-preview--lead"`
- The lead section shows 4 markets in a 2×2 grid
- `restSections` render normally below

```tsx
const [leadSection, ...restSections] = activeSections
// ...
<div className="home-main">
  <SectionPreview section={leadSection} onSeeAll={() => setActive(leadSection.id)} isLead />
  {restSections.map(s => (
    <SectionPreview key={s.id} section={s} onSeeAll={() => setActive(s.id)} />
  ))}
</div>
```

Add `isLead?: boolean` prop to `SectionPreview`. When lead:
- Show first 4 non-spotlight markets instead of 3
- Apply `.section-preview--lead` class

CSS for lead:
```css
.section-preview--lead .section-title {
  font-size: var(--text-2xl);
}
.section-preview--lead .market-grid {
  grid-template-columns: repeat(2, 1fr);
}
```

- [ ] **Step 1: Read HomeContent.tsx and SectionPreview.tsx**

- [ ] **Step 2: Add isLead prop to SectionPreview, show 4 markets when lead**

- [ ] **Step 3: Split lead/rest in HomeContent**

- [ ] **Step 4: Add CSS for lead section treatment**

- [ ] **Step 5: Verify visually — lead section should look distinctly more prominent**

- [ ] **Step 6: Commit**
```bash
git add components/HomeContent.tsx components/SectionPreview.tsx styles/globals.css
git commit -m "feat: lead story treatment for first section on home page"
```

---

## Task 6: Improve sidebar signal clarity

**Files:**
- Modify: `components/WhatMarketsSay.tsx`
- Modify: `lib/insights.ts`
- Modify: `styles/globals.css`

**Problem:** "34% YES" and "18% YES" are ambiguous without the market question. A user seeing the sidebar for the first time has no idea what "18% Yes" means for the Executive Branch.

**Fix options (pick one):**
- **Option A:** Below the pct/label signal, show a short truncated version of the spotlight market question in small muted text
- **Option B:** Change the label from "Yes" to a short phrase extracted from the question: "Will regime fall" → "34% chance"

**Go with Option A** — show the market question in small text under the signal:

In `getSectionInsight`, also return the spotlight market question:
```typescript
return { signal, narrative, question: market.question }
```

In `WhatMarketsSay`, render:
```tsx
<div className="wtms-signal">
  <span className="wtms-pct">{insight!.signal.pct}%</span>
  <span className="wtms-signal-label">{insight!.signal.label}</span>
</div>
<p className="wtms-question">{insight!.question}</p>  {/* NEW */}
<p className="wtms-narrative">{insight!.narrative}</p>
```

CSS:
```css
.wtms-question {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
  margin: 0 0 var(--space-1);
  line-height: 1.3;
}
```

- [ ] **Step 1: Read insights.ts and WhatMarketsSay.tsx**

- [ ] **Step 2: Add `question` field to getSectionInsight return value**

- [ ] **Step 3: Render question in WhatMarketsSay below the signal**

- [ ] **Step 4: Add CSS for .wtms-question**

- [ ] **Step 5: Commit**
```bash
git add lib/insights.ts components/WhatMarketsSay.tsx styles/globals.css
git commit -m "feat: show spotlight market question in sidebar for signal context"
```

---

## Task 7: Push all and verify dark mode on Vercel

**Files:** None (dark mode was already pushed)

- [ ] **Step 1: Wait for Vercel deployment to complete (~2 min after push)**

- [ ] **Step 2: Open https://polymarket-intelligence-nu.vercel.app/ in Playwright and take a screenshot**

- [ ] **Step 3: Confirm dark background, dark market cards, dark category nav**

- [ ] **Step 4: If dark mode isn't applied, check that `data-theme="dark"` is on the `<html>` element**

---

## Execution Order

Run tasks in this order (each is independent except Task 7 which should be last):

1. Task 2 (volume fix) — 5 min, trivial
2. Task 3 (remove callout duplication) — 5 min, trivial
3. Task 1 (trending filter) — 15 min, requires testing
4. Task 4 (callout width + KPI fixes) — 20 min
5. Task 6 (sidebar signal context) — 20 min
6. Task 5 (lead story) — 30 min, most complex
7. Task 7 (verify dark mode) — verification only
