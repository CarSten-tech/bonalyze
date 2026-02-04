# Bonalyze Design & UX Architecture Blueprint

**Version:** 1.0
**Status:** Guiding Standard
**Target Platform:** iPhone-first PWA (Safari, Portrait-only)

---

## 1) Product Feel (Brand + UI Personality)

### Brand Identity

**Bonalyze = "Intelligent Household Finance Companion"**

The app should feel like a **trusted advisor** that makes household finances feel effortless and transparent - not a rigid budgeting tool or a playful spending game.

### Personality Traits

| Trait | Meaning | Visual Expression |
|-------|---------|-------------------|
| **Intelligent** | AI does the heavy lifting | Clean data visualizations, confidence indicators, smart suggestions |
| **Trustworthy** | Finance-grade reliability | Solid typography, ample whitespace, no flashy animations |
| **Effortless** | Minimal friction | One-tap actions, smart defaults, progressive disclosure |
| **Personal** | Household-centric | Warm accents, member avatars, personalized insights |

### Not These Things

- **Not playful/gamified** - No achievement badges, streaks, or leaderboards
- **Not corporate/cold** - No dark blue banker vibes
- **Not flashy/trendy** - No gradients everywhere, no glassmorphism overload
- **Not dense/cramped** - No spreadsheet aesthetics

### The "Apple-Adjacent but Own" Sweet Spot

Think: **The polish of iOS Finance apps (Wallet, Stocks) meets the warmth of family-oriented apps (Photos, Home)**

- Clean geometry like Apple apps
- But with subtle color accents that feel personal
- Professional enough for money, warm enough for family

---

## 2) Global Navigation Model

### Bottom Navigation Bar (5 Tabs)

```
┌─────────────────────────────────────────────┐
│                                             │
│             [Screen Content]                │
│                                             │
├─────────────────────────────────────────────┤
│   🏠      📋      [+]      💰      ⚙️      │
│  Home   Receipts  Scan   Settle  Settings  │
└─────────────────────────────────────────────┘
```

| Position | Icon | Label | Destination | Content |
|----------|------|-------|-------------|---------|
| 1 | 🏠 | Home | `/dashboard` | KPIs, category chart, top stores, insights |
| 2 | 📋 | Receipts | `/receipts` | Receipt list with filters, search |
| 3 | **[+]** | Scan | Opens modal | **Primary Action** - Camera/Gallery picker |
| 4 | 💰 | Settle | `/settlement` | Settlement overview, who owes whom |
| 5 | ⚙️ | Settings | `/settings` | Household, profile, app settings |

### Why This Structure?

**Scan in Center Position (Prominent FAB-Style)**
- Most frequent action (2-5x daily use)
- Visually distinct: larger, elevated, accent-colored
- Immediately accessible from any screen
- Does NOT navigate to a new screen - opens action sheet overlay

**Home as First Tab**
- Dashboard is the "landing pad" after opening app
- Shows the big picture at a glance
- Contains drill-down entry points to other areas

**Receipts vs. Settle Separation**
- Clear mental model: "what did I buy" vs. "who owes whom"
- Receipts = historical data browsing
- Settle = actionable household balancing

### Navigation Patterns

```
Home → Category tap → Receipts (filtered by category)
Home → Store tap → Receipts (filtered by store)
Home → Insight tap → Relevant detail view

Receipts → Receipt tap → Receipt Detail
Receipt Detail → Item tap → Product Detail (future: price history)

Settle → Person tap → Receipts paid by that person
Settle → "Mark as settled" → Confirmation → Success

Scan → Camera/Gallery → Processing → Receipt Editor → Receipts List
```

### Household Switcher Location

**In the Header, not in Bottom Nav**

```
┌─────────────────────────────────────────────┐
│  🏠 Familie Mueller  ▼              [Avatar]│
├─────────────────────────────────────────────┤
```

- Dropdown at top-left (tappable household name)
- Shows current household with house icon
- Tap opens list of all households + "Create new"
- Only visible if user is in 2+ households

---

## 3) Screen Layout Rules

### Safe Areas & Spacing

```
┌─────────────────────────────────────────────┐
│░░░░░░░░░░ Status Bar (44pt iOS) ░░░░░░░░░░│
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │         Header Area (56pt)          │   │
│  │  Household Switcher / Page Title    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ← 16pt padding →                          │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │                                     │   │
│  │         Scrollable Content          │   │
│  │                                     │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│  ← 16pt padding →                          │
│                                             │
├─────────────────────────────────────────────┤
│         Bottom Nav (84pt with safe)         │
└─────────────────────────────────────────────┘
```

### Spacing System (8pt Grid)

| Token | Size | Usage |
|-------|------|-------|
| `space-xs` | 4pt | Icon-to-label gaps |
| `space-sm` | 8pt | Inside compact elements |
| `space-md` | 16pt | Standard padding, between cards |
| `space-lg` | 24pt | Section separators |
| `space-xl` | 32pt | Major section breaks |

### Header Patterns

**Dashboard Header (Home)**
```
┌─────────────────────────────────────────────┐
│  🏠 Familie Mueller  ▼              [Avatar]│
└─────────────────────────────────────────────┘
```

**List Screen Header (Receipts)**
```
┌─────────────────────────────────────────────┐
│  Receipts                           [Filter]│
│  ┌─────────────────────────────────────┐   │
│  │  🔍 Search receipts...              │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Detail Screen Header (Receipt Detail)**
```
┌─────────────────────────────────────────────┐
│  ← Back       REWE                  [Edit]  │
└─────────────────────────────────────────────┘
```

### Card Patterns

**Standard Card (shadcn/ui Card)**
```
┌─────────────────────────────────────────────┐
│  Section Title                              │
│                                             │
│  Card content with 16pt internal padding    │
│                                             │
└─────────────────────────────────────────────┘
  ↑
  12pt corner radius
  No shadow (flat) or subtle shadow (1-2dp elevation)
```

**KPI Card (Prominent Data Display)**
```
┌─────────────────────────────────────────────┐
│                                             │
│            847,32 EUR                       │
│          ─────────────                      │
│      Ausgaben im Januar 2025                │
│                                             │
│           ↑12% vs. Dezember                 │
│            23 Einkaeufe                     │
│                                             │
└─────────────────────────────────────────────┘
```

- Main number: Extra-large, bold, dark
- Label: Small, muted color
- Trend: Color-coded (green = down/good, red = up)
- Secondary stat: Small, muted

**List Row (Receipt, Store, etc.)**
```
┌─────────────────────────────────────────────┐
│  [Icon]  Primary Text              47,32 € │
│          Secondary Text (muted)        →    │
└─────────────────────────────────────────────┘
```

- Minimum touch target: 44pt height
- Chevron indicates drill-down
- Amount right-aligned, monospace for alignment

### Empty States

```
┌─────────────────────────────────────────────┐
│                                             │
│             [ Illustration ]                │
│                                             │
│     Noch keine Kassenbons gescannt          │
│                                             │
│     Scanne deinen ersten Kassenbon          │
│     um loszulegen.                          │
│                                             │
│         [ Kassenbon scannen ]               │
│                                             │
└─────────────────────────────────────────────┘
```

- Centered layout
- Simple illustration or icon (not photo)
- Headline: What's missing
- Subtext: What to do about it
- CTA button if action possible

### Loading States

**Skeleton Pattern (preferred)**
- Show layout structure with animated pulse
- Use shadcn/ui `Skeleton` component
- Match dimensions of real content

**Spinner Pattern (for actions)**
- Button loading: Spinner replaces icon, text stays
- Full-screen: Only for >2s operations (receipt scan)
- Show progress text: "Analysiere Kassenbon..."

### Data Display Conventions

**Money/Currency**
```
47,32 EUR    ← Standard display (comma decimal, EUR suffix)
-3,50 EUR   ← Negative (discount/refund)
+188,34 EUR ← Positive balance (green)
-188,34 EUR ← Negative balance (red)
```
- German locale: comma as decimal separator
- Always show EUR suffix (not EUR symbol alone)
- Use monospace or tabular figures for alignment

**Dates**
```
Heute, 14:32         ← Today
Gestern              ← Yesterday
Mo, 28. Januar       ← This week
28. Januar 2025      ← Older dates
Januar 2025          ← Month headers
```

**Stores/Merchants**
```
REWE                 ← Name as recognized (uppercase if on receipt)
REWE City            ← With sub-brand if detected
```

**Categories**
```
🥦 Lebensmittel      ← Emoji prefix for visual scanning
🧴 Haushalt
🍷 Getraenke
📦 Sonstiges
```

---

## 4) Core UI Building Blocks

### Component Hierarchy

**Primary Actions (High Emphasis)**
- Scan FAB button (center nav)
- Main CTA in flows ("Kassenbon scannen", "Speichern")
- Accent-colored filled buttons

**Secondary Actions (Medium Emphasis)**
- Filter/sort toggles
- "Alle anzeigen" links
- Ghost or outline buttons

**Tertiary Actions (Low Emphasis)**
- Cancel/dismiss
- Edit pencil icons
- Muted text links

### Button Styles

| Type | Appearance | Usage |
|------|------------|-------|
| **Primary** | Filled accent color | Main action per screen |
| **Secondary** | Outline or ghost | Alternative actions |
| **Destructive** | Red filled/outline | Delete, remove, leave |
| **Icon** | Icon only, no fill | Compact toolbar actions |

### Form Elements

**Input Fields**
- Use shadcn/ui `Input` component
- Floating labels or top-aligned labels
- Clear error states with red border + helper text
- 44pt minimum touch target

**Selection**
- Tabs for 2-4 options on same level (period selector)
- Dropdown/Select for 5+ options
- Radio for mutually exclusive with description
- Checkbox for multi-select

### Feedback Components

**Toast (Sonner)**
- Success: Green accent, checkmark icon
- Error: Red accent, X icon
- Info: Neutral, info icon
- Auto-dismiss after 3-5 seconds
- Position: Bottom, above nav bar

**Dialog (Modal)**
- Destructive confirmations
- Complex input forms
- Centered, with backdrop
- Always closeable via X or backdrop tap

**Sheet (Bottom Drawer)**
- Quick actions (scan picker)
- Filters
- Drill-down previews
- Swipe-dismissable

### Charts

**Donut Chart (Category Distribution)**
- Max 4-5 segments + "Sonstiges"
- Interactive: tap segment to highlight
- Legend below with amounts
- Use `recharts` library

**Horizontal Bar Chart (Store Ranking)**
- Simple bars, no 3D effects
- Labels inline or to the left
- Max 5 items visible

### Badges

| Type | Color | Usage |
|------|-------|-------|
| Status (Open) | Yellow/amber | Pending settlement |
| Status (Done) | Green | Completed settlement |
| Count | Muted gray | "14 Einkaeufe" |
| Category | Colored | Category labels |

### Icons

- Use Lucide icons (already in shadcn/ui)
- Consistent stroke width (1.5-2px)
- 20-24px size for most uses
- 16px for inline/tight spaces

---

## 5) Key Flows (UX-Level)

### A) Auth + Onboarding

```
App Start
    ↓
[Logged In?]
    ├── No → Login/Signup Screen
    │         ├── Email + Password
    │         ├── "Account erstellen" / "Einloggen"
    │         └── Password Reset Link
    │              ↓
    │         [Has Household?]
    │              ├── No → Household Onboarding
    │              │         ├── "Haushalt erstellen"
    │              │         │    └── Name eingeben → Dashboard
    │              │         └── "Einladung annehmen"
    │              │              └── Token validieren → Dashboard
    │              └── Yes → Dashboard
    │
    └── Yes → [Has Household?]
               ├── No → Household Onboarding
               └── Yes → Dashboard
```

### B) Receipt Scan → Review → Save

```
[Tap Scan Button (center nav)]
    ↓
Action Sheet appears:
    ├── "📷 Foto aufnehmen"
    └── "🖼️ Aus Galerie waehlen"
    ↓
[Camera or Gallery opens]
    ↓
Image captured/selected
    ↓
Processing Screen:
    ├── Spinner animation
    ├── "Analysiere Kassenbon..."
    └── Progress indicator
    ↓
[AI Processing Complete]
    ├── Success → Receipt Editor Screen
    │              ├── Store (editable)
    │              ├── Date (editable)
    │              ├── Items list (editable)
    │              │    └── Each: Name, Qty, Price
    │              ├── Total (calculated)
    │              ├── Paid by (dropdown: household members)
    │              └── [Speichern] button
    │                   ↓
    │              Toast: "Kassenbon gespeichert"
    │              Navigate to: Receipts list
    │
    └── Error → Error Screen
                 ├── Error message
                 ├── [Neues Foto aufnehmen]
                 └── [Abbrechen]
```

### C) Dashboard → Analytics Drill-Down

```
Dashboard
    │
    ├── Tap KPI Card → (no action, just info)
    │
    ├── Tap Category in Donut Chart
    │    └── Navigate to: Receipts List
    │         └── Pre-filtered by category
    │
    ├── Tap Store in Ranking
    │    └── Navigate to: Receipts List
    │         └── Pre-filtered by store
    │
    └── Tap "Alle Kassenbons"
         └── Navigate to: Receipts List (unfiltered)

Receipts List
    │
    └── Tap Receipt Row
         └── Navigate to: Receipt Detail
              │
              └── Tap Item
                   └── (Future: Product Detail with price history)
```

### D) Household Setup + Settlement

```
Settings → Haushalt
    │
    ├── View Members List
    │    ├── Each member shows: Name, Email, Role
    │    └── Admin actions: Remove, Make Admin
    │
    ├── View Pending Invites
    │    └── Resend or Delete
    │
    ├── [+ Mitglied einladen]
    │    └── Dialog: Email input
    │         └── Send invite → Toast: "Einladung gesendet"
    │
    └── [Haushalt verlassen]
         └── Confirmation Dialog
              └── Confirm → Navigate to: Household Onboarding

---

Settlement Screen
    │
    ├── Month Selector (dropdown)
    │
    ├── Overview Card:
    │    ├── Total spent this period
    │    └── Fair share per person
    │
    ├── Person Cards (one per member):
    │    ├── Paid amount
    │    ├── Fair share
    │    └── Balance (+/- colored)
    │
    ├── Transfer Summary:
    │    └── "Anna → Max: 188,34 EUR"
    │
    ├── [Als erledigt markieren]
    │    └── Confirmation → Toast: "Settlement abgeschlossen"
    │
    └── [Receipts anzeigen]
         └── Sheet: Receipts grouped by who paid
```

### E) Shopping List + AI Suggestions (Future)

```
Shopping List (Tab or Section - TBD)
    │
    ├── Manual Item Add
    │    └── Text input + category picker
    │
    ├── AI Suggestions Section:
    │    └── "Basierend auf deinem Einkaufsrhythmus:"
    │         ├── Milch (letzter Kauf vor 6 Tagen)
    │         ├── Brot (letzter Kauf vor 4 Tagen)
    │         └── [+ Zur Liste] per item
    │
    └── Check off items → (stays or removes from list)
```

---

## 6) Visual Style Guidance

### Color Palette Direction

**Base Colors (Neutral Foundation)**
- Background: Very light gray or pure white
- Card surface: White
- Text primary: Near-black (not pure black)
- Text secondary: Medium gray

**Accent Color (Primary Brand)**
- Direction: Muted teal or calm blue-green
- Purpose: Primary buttons, active nav, links
- Feeling: Modern, trustworthy, not corporate-cold

**Semantic Colors**
- Success/Positive: Muted green (not neon)
- Warning: Warm amber
- Error/Negative: Muted red (not alarm-red)
- Info: Calm blue

**Category Colors (Chart Legend)**
- 4-5 distinct but muted colors
- Should work together without clashing
- Example direction: Sage green, dusty blue, warm terra, soft plum

### Typography Direction

**Font Stack**
- Use system fonts: `-apple-system, BlinkMacSystemFont, system-ui`
- This gives native iOS feel automatically
- Clean, readable, no custom web fonts needed

**Hierarchy**
- XL: KPI numbers, main amounts (28-32pt, bold)
- Large: Section headers (20-22pt, semibold)
- Base: Body text, labels (16-17pt, regular)
- Small: Secondary info, timestamps (13-14pt, regular)
- XS: Badges, captions (11-12pt, medium)

**Money Display**
- Use tabular/monospace figures where available
- Right-align amounts in lists
- Currency suffix, not prefix (German convention)

### Corner Radius

**Consistent Radius Scale**
- Small elements (badges, tags): 4-6pt
- Medium elements (buttons, inputs): 8pt
- Cards and containers: 12pt
- Bottom sheets: 16pt (top corners only)

**No fully-rounded pills except:**
- Avatar circles
- Small status dots

### Shadows & Elevation

**Minimal Shadow Use**
- Mostly flat design with border separation
- Subtle shadow only for:
  - FAB scan button (floating effect)
  - Bottom sheets (lifted from bottom)
  - Modals/dialogs (backdrop separation)

**Shadow Values**
- Level 1: 0 1px 2px rgba(0,0,0,0.05)
- Level 2: 0 4px 12px rgba(0,0,0,0.08)

### What Should Be Colorful vs. Neutral

**Colorful:**
- Chart segments (categories)
- Trend indicators (up/down arrows)
- Balance indicators (+/- amounts)
- Status badges
- Primary action buttons
- Selected/active navigation item

**Neutral:**
- Most body text
- Card backgrounds
- Headers and titles
- Secondary buttons
- Borders and dividers
- Icons (except decorative)

---

## 7) No-Gos / Anti-Patterns

### Visual Don'ts

| Don't | Why | Instead |
|-------|-----|---------|
| ❌ Neon or vibrant colors | Feels cheap, not finance-appropriate | Muted, sophisticated palette |
| ❌ Gradients on UI elements | Dated, distracting | Solid colors, subtle borders |
| ❌ Drop shadows everywhere | Heavy, cluttered | Flat with borders or minimal shadow |
| ❌ Rounded pill buttons for everything | Inconsistent, playful | Consistent corner radius |
| ❌ Emoji overload | Unprofessional | Icons or single emoji for categories |
| ❌ Custom fancy fonts | Slow, inconsistent | System fonts |
| ❌ Animated backgrounds | Distracting, battery drain | Static, clean surfaces |
| ❌ Skeleton screens that don't match layout | Jarring transition | Match real content dimensions |

### UX Don'ts

| Don't | Why | Instead |
|-------|-----|---------|
| ❌ Hide primary action in menu | Too many taps | FAB always visible |
| ❌ Modal for every action | Disruptive flow | Inline editing, sheets for complex |
| ❌ Require scroll to find CTA | Frustrating | Sticky headers/footers |
| ❌ Auto-navigate after async action | Disorienting | Let user confirm, then navigate |
| ❌ Mix German and English UI | Inconsistent | Full German (or full English) |
| ❌ Date picker for simple month selection | Overkill | Dropdown with recent months |
| ❌ Force onboarding tutorial | Annoying | Progressive disclosure, optional tips |
| ❌ Vibrant error/warning colors | Aggressive | Muted reds/ambers with clear text |

### Information Architecture Don'ts

| Don't | Why | Instead |
|-------|-----|---------|
| ❌ More than 5 bottom nav items | Cramped, overwhelming | 5 max (we have exactly 5) |
| ❌ Deep nesting (>3 levels) | Lost in navigation | 2-3 levels max |
| ❌ Different back-button behaviors | Confusing | Always goes to previous screen |
| ❌ Multiple ways to same destination | Confusion | One clear path per destination |
| ❌ Settings scattered everywhere | Hard to find | Centralized settings screen |

### Content Don'ts

| Don't | Why | Instead |
|-------|-----|---------|
| ❌ Technical jargon | Users aren't developers | Plain German |
| ❌ Abbreviations without context | Unclear | Full words or explained abbreviations |
| ❌ Passive voice for actions | Weak | Active: "Kassenbon speichern" |
| ❌ ALL CAPS for emphasis | Shouting | Bold or color for emphasis |
| ❌ Punctuation in buttons | Unnecessary | "Speichern" not "Speichern!" |

---

## 8) Handoff Notes

### What Frontend Developer Should Standardize First

**Priority 1: Design Tokens (Before Any UI Work)**
1. Update `globals.css` with the finalized color palette
2. Define spacing tokens as CSS custom properties
3. Set up typography scale (font sizes, weights, line heights)
4. Configure corner radius tokens

**Priority 2: Layout Components**
1. Create `BottomNav` component with 5-tab structure
2. Create `PageLayout` wrapper with header slot + safe areas
3. Create `PageHeader` variants (dashboard, list, detail)
4. Set up scroll containers with proper padding

**Priority 3: Common Patterns**
1. Standardize Card usage from shadcn/ui
2. Create `EmptyState` component template
3. Create `LoadingState` with Skeleton patterns
4. Set up Toast (Sonner) with app-specific styling

**Priority 4: Data Display**
1. Create `Currency` component for consistent money formatting
2. Create `RelativeDate` component for date display
3. Create `CategoryBadge` for category labels with emoji

### Decisions That Must Be Locked Before UI Work

| Decision | Options | Recommendation |
|----------|---------|----------------|
| **Primary accent color** | Teal, Blue-Green, or Slate-Blue | Muted teal (trustworthy + modern) |
| **Dark mode support** | Yes/No/Later | Later (MVP = light only, dark mode as PROJ-12) |
| **Navigation icon set** | Lucide filled vs. outlined | Outlined (matches iOS) |
| **Button corner radius** | 8pt vs 12pt | 8pt (not too rounded) |
| **German locale** | Strict vs. flexible | Strict (comma decimal, EUR suffix) |

### Component Checklist for Developer

Before building feature screens, these should exist:

```
src/components/
├── layout/
│   ├── BottomNav.tsx           ← 5-tab navigation
│   ├── PageLayout.tsx          ← Safe areas + scroll container
│   ├── PageHeader.tsx          ← Standard header variants
│   └── SafeArea.tsx            ← iOS safe area wrapper
│
├── common/
│   ├── Currency.tsx            ← Money display formatting
│   ├── RelativeDate.tsx        ← Date display formatting
│   ├── EmptyState.tsx          ← Empty state template
│   ├── LoadingState.tsx        ← Skeleton pattern
│   └── CategoryBadge.tsx       ← Category with emoji + color
│
├── navigation/
│   ├── HouseholdSwitcher.tsx   ← Header dropdown
│   └── BackButton.tsx          ← Consistent back navigation
│
└── feedback/
    ├── Toast wrappers          ← Using Sonner with app styles
    └── ConfirmDialog.tsx       ← Destructive action confirmation
```

### Testing Checklist for QA

Every screen should pass:

- [ ] Works in Safari iOS (primary platform)
- [ ] Safe areas respected (notch, home indicator)
- [ ] Touch targets >= 44pt
- [ ] Content readable without horizontal scroll
- [ ] Loading state visible for async operations
- [ ] Empty state shows when no data
- [ ] Error state shows when fetch fails
- [ ] Back navigation returns to correct screen
- [ ] Numbers formatted with German locale (1.234,56 EUR)
- [ ] Dates formatted in German style

---

## Appendix: Screen Inventory

Based on feature specs, these screens need to be built:

| Route | Screen | Priority |
|-------|--------|----------|
| `/` | Redirect to dashboard or auth | MVP |
| `/login` | Login form | MVP |
| `/signup` | Signup form | MVP |
| `/onboarding/household` | Create first household | MVP |
| `/dashboard` | Home - KPIs, charts, insights | MVP |
| `/receipts` | Receipt list with filters | MVP |
| `/receipts/[id]` | Receipt detail | MVP |
| `/receipts/new` | Receipt editor (after scan) | MVP |
| `/settlement` | Settlement overview | MVP |
| `/settlement/history` | Past settlements | MVP |
| `/settings` | Settings hub | MVP |
| `/settings/household` | Household members + invites | MVP |
| `/settings/profile` | User profile | MVP |
| `/invite/[token]` | Accept invitation | MVP |
| `/offline` | PWA offline fallback | MVP |

---

*This blueprint serves as the guiding standard for all UI/UX decisions in Bonalyze. Deviations should be discussed and documented.*
