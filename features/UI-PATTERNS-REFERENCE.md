# Bonalyze UI Patterns Reference

**Abgeleitet aus:** Design-Mockups (Home, Smart Insights, Ausgaben, Menü)
**Basis:** [DESIGN-UX-BLUEPRINT.md](./DESIGN-UX-BLUEPRINT.md)

---

## 1) Global Layout Patterns

### App Header
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Bonalyze                           [🔍]  [Avatar]   │
└─────────────────────────────────────────────────────────────┘
```
- Logo (Quadrat mit abgerundeten Ecken) + App-Name links
- Suche-Icon (optional)
- User-Avatar rechts (runder Avatar mit Rahmen)
- Hintergrund: weiß
- Höhe: 56px

### Sub-Page Header (mit Zurück)
```
┌─────────────────────────────────────────────────────────────┐
│  [<]  Smart Insights                                        │
└─────────────────────────────────────────────────────────────┘
```
- Zurück-Pfeil links
- Page-Titel zentriert oder links
- Kein Avatar auf Sub-Pages

### Bottom Navigation
```
┌─────────────────────────────────────────────────────────────┐
│   🏠        📋        [📷]        📊        ☰             │
│  HOME    AUSGABEN    (FAB)     ANALYSE    MENÜ            │
└─────────────────────────────────────────────────────────────┘
```
- 5 Tabs, mittig die Kamera als FAB (floating, accent-colored)
- Aktiver Tab: Primary Color (Teal)
- Inaktive Tabs: Muted Gray
- Labels: Uppercase, klein

---

## 2) Month Navigation Component

```
┌─────────────────────────────────────────────────────────────┐
│   [<]      📅  Januar 2024                      [>]         │
└─────────────────────────────────────────────────────────────┘
```
- Zentrierter Text mit Kalender-Icon
- Pfeil-Buttons links/rechts
- Abgerundeter Container (rounded-xl)
- Hintergrund: card (weiß)
- Border: subtle gray

**Verwendung:**
- Dashboard (Home)
- Smart Insights
- Ausgaben
- Settlement

---

## 3) KPI Cards

### Hero KPI Card (groß)
```
┌─────────────────────────────────────────────────────────────┐
│  GESAMTAUSGABEN MONAT                              [🏦]     │
│                                                             │
│  590,05 €                                                   │
│  ↓ -44% vs. Vormonat                                        │
└─────────────────────────────────────────────────────────────┘
```
- Label: text-xs, muted, uppercase, tracking-wide
- Betrag: text-2xl, font-bold
- Trend: text-sm, success/destructive color
- Icon: rechts oben, muted
- Padding: p-6
- Border-radius: rounded-xl

### Mini KPI Cards (nebeneinander)
```
┌──────────────────────┐  ┌──────────────────────┐
│  Ø PRO TAG           │  │  ANZAHL BONS         │
│  45,39 €             │  │  18 Stk.             │
│  ████████░░          │  │  ●●●○                │
└──────────────────────┘  └──────────────────────┘
```
- 2 Karten nebeneinander (grid-cols-2)
- Label: text-xs, muted, uppercase
- Wert: text-xl, font-bold
- Optional: Progress-Bar oder Dot-Indikatoren
- Padding: p-4

### Insight Stat Cards (Smart Insights)
```
┌──────────────────────┐  ┌──────────────────────┐
│  SPARPOTENTIAL       │  │  EFFIZIENZ           │
│  42,00 €             │  │  +12 %               │
│  ✨ OPTIMIERBAR      │  │  📈 TOP PERFORMANCE  │
└──────────────────────┘  └──────────────────────┘
```
- Ähnlich wie Mini KPI
- Badge unten mit Status (accent color)
- Badge hat Icon + Label

---

## 4) Section Headers

```
🧠 Smart Insights                         ALLE ANSEHEN >
```
- Emoji + Titel links (text-lg, font-semibold)
- Action-Link rechts (text-xs, primary color, uppercase)
- Margin-bottom zum Content: space-md

---

## 5) Insight Cards

### Standard Insight Card
```
┌─────────────────────────────────────────────────────────────┐
│ ▎ Großeinkauf am Sonntag                            [🛒]   │
│ ▎ Bei Kaufland hast du ordentlich zugelangt - 67€          │
│ ▎ auf einmal. Wasser, Kaffee und Fleisch - sieht           │
│ ▎ nach Wocheneinkauf aus.                                  │
│ ▎                                                          │
│ ▎ KAUFLAND                                                 │
└─────────────────────────────────────────────────────────────┘
```
- Blaue/Teal vertikale Linie links (border-l-4 border-primary)
- Titel: font-semibold
- Beschreibung: text-muted-foreground
- Store-Label: text-xs, uppercase, primary color
- Optional: Icon rechts oben

### Insight Card mit Chart
```
┌─────────────────────────────────────────────────────────────┐
│ ▎ Günstigste Einkaufstage                           [📅]   │
│ ▎ Dienstags sparst du im Schnitt 14%.                      │
│ ▎                                                          │
│ ▎  ░█░░░░░                                                 │
│ ▎  MO DI MI DO FR SA SO                                    │
└─────────────────────────────────────────────────────────────┘
```
- Gleiche Struktur wie oben
- Integriertes Mini-Balkendiagramm
- Highlight für besten Tag (gefüllter Balken)

### Tip Card
```
┌─────────────────────────────────────────────────────────────┐
│  [📋] Eigenmarken nutzen                              [>]  │
│       Potenzial: 12% Ersparnis                             │
└─────────────────────────────────────────────────────────────┘
```
- Icon links (in muted box)
- Titel + Untertitel
- Chevron rechts
- Keine farbige Linie, aber hover-effekt

---

## 6) List Items

### Receipt List Item
```
┌─────────────────────────────────────────────────────────────┐
│  [🛒]  LIDL                                      28,48 €   │
│        26.01.24 • 5 Artikel                                │
└─────────────────────────────────────────────────────────────┘
```
- Store-Icon/Logo links (in gradem/rundem Container)
- Store-Name: font-semibold
- Meta: text-sm, muted (Datum • Artikel-Anzahl)
- Betrag: rechts ausgerichtet, font-semibold
- Minimum Touch Target: 56px Höhe

### Category List Item (mit Subcategories)
```
┌─────────────────────────────────────────────────────────────┐
│  🍎 Lebensmittel                                 542,06 €  │
│     ├── Milchprodukte                             83,28 €  │
│     ├── Süßigkeiten                               82,56 €  │
│     ├── Fleisch                                   59,75 €  │
│     └── ...                                                │
└─────────────────────────────────────────────────────────────┘
```
- Hauptkategorie: Emoji + Name + Betrag
- Subcategories: eingerückt (pl-8)
- Text-muted für Subcategories

---

## 7) Filter Components

### Filter Pills (horizontal scrollable)
```
┌────────────────────────────────────────────────────────────┐
│  [Alle]  [Eigen]  [Auslage]  [Zweck]                       │
└────────────────────────────────────────────────────────────┘
```
- Aktiver Pill: bg-primary, text-white
- Inaktive Pills: bg-muted, text-muted-foreground
- Border-radius: rounded-full
- Padding: px-4 py-2
- Gap zwischen Pills: gap-2

### Dropdown Selector
```
┌──────────────────┐
│  2024         ▼  │
└──────────────────┘
```
- Jahr/Monat-Auswahl
- Chevron-Down Icon
- Subtle border oder unterstrichen

---

## 8) Accordion/Expandable Sections

### Month Accordion (Ausgaben)
```
┌─────────────────────────────────────────────────────────────┐
│  ▼  Januar 2024                                  590,05 €  │
│     25 EINKÄUFE                                            │
├─────────────────────────────────────────────────────────────┤
│  [Übersicht]  [Einkäufe (25)]                              │
├─────────────────────────────────────────────────────────────┤
│  Content...                                                 │
└─────────────────────────────────────────────────────────────┘
```
- Header klickbar zum Expand/Collapse
- Chevron rotiert bei Expand
- Tabs innerhalb des Accordion-Contents
- Counter in Tab-Label

---

## 9) Tabs Component

```
┌─────────────────────────────────────────────────────────────┐
│  [Übersicht]         [Einkäufe (25)]                       │
│  ─────────                                                 │
└─────────────────────────────────────────────────────────────┘
```
- Aktiver Tab: primary color, Unterstrich
- Inaktiver Tab: muted
- Counter in Klammern optional

---

## 10) Menu/Settings Drawer

### Profile Header
```
┌─────────────────────────────────────────────────────────────┐
│           [Avatar]                                         │
│       Maximilian M.                                        │
│     Enterprise Account                                     │
└─────────────────────────────────────────────────────────────┘
```
- Großer Avatar (80px)
- Name darunter
- Account-Typ/Role muted

### Menu Items
```
┌─────────────────────────────────────────────────────────────┐
│  [##] Kategorien verwalten                          (aktiv)│
│  [⊙]  Budget-Ziele                                         │
│  [↑]  Export (PDF/Excel)                                   │
│  [▢]  Zahlungsmethoden                                     │
│  ─────────────────────────────────────────                 │
│  [?]  Hilfe & Support                                      │
│  [⚙]  App-Einstellungen                                    │
└─────────────────────────────────────────────────────────────┘
```
- Icon + Label pro Item
- Aktiver Item: bg-accent, mit Highlight
- Separator zwischen Gruppen
- Touch Target: 56px

### Footer
```
┌─────────────────────────────────────────────────────────────┐
│  BONALYZE V2.4.0                                       ●   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              [→ Abmelden                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```
- Version: text-xs, muted, centered
- Online-Indikator (grüner Punkt)
- Abmelden-Button: destructive/red, full width

---

## 11) Charts

### Mini Bar Chart (Wochentage)
```
  ░ █ ░ ░ ░ ░ ░
  MO DI MI DO FR SA SO
```
- Vertikale Balken
- Highlight für besten/schlechtesten Tag
- Labels darunter
- Kompakte Größe für Insight Cards

### Progress Bar
```
████████░░░░░░░░  45%
```
- Gefüllter Teil: primary/accent color
- Hintergrund: muted
- Optional: Prozent-Label

---

## 12) Color Semantics (aus Mockups)

| Farbe | Verwendung |
|-------|------------|
| **Teal/Primary** | Aktive Nav-Items, Links, Primary Buttons, vertikale Insight-Linien |
| **Grün** | Positiver Trend (↓ bei Ausgaben = gut), Savings |
| **Rot** | Negativer Trend, Abmelden-Button |
| **Grau/Muted** | Inaktive Items, Secondary Text, Borders |
| **Weiß** | Card-Backgrounds, Clean surfaces |
| **Near-Black** | Primary Text |

---

## 13) Typografie Hierarchy (aus Mockups)

| Element | Stil | Beispiel |
|---------|------|----------|
| **KPI Zahl** | text-2xl/3xl, font-bold | 590,05 € |
| **Section Title** | text-lg, font-semibold | Smart Insights |
| **Card Title** | text-base, font-semibold | Großeinkauf am Sonntag |
| **Body Text** | text-sm, normal | Beschreibungen |
| **Label/Meta** | text-xs, muted, uppercase | GESAMTAUSGABEN MONAT |
| **Small Meta** | text-xs, muted | 26.01.24 • 5 Artikel |

---

## 14) Spacing Patterns

| Context | Spacing |
|---------|---------|
| Page Padding (horizontal) | px-4 (16px) |
| Between Cards | gap-4 (16px) |
| Section Gap | mt-6 (24px) |
| Card Internal Padding | p-4 oder p-6 |
| List Item Padding | py-3 px-4 |
| Between List Items | gap-2 oder Divider |

---

## 15) Component Mapping zu shadcn/ui

| UI Pattern | shadcn/ui Component |
|------------|---------------------|
| KPI Cards | `Card` + custom content |
| Filter Pills | `ToggleGroup` oder custom |
| Tabs | `Tabs` |
| Accordion | `Accordion` oder `Collapsible` |
| Month Navigation | Custom mit `Button` |
| Menu Items | `Button variant="ghost"` |
| Drawer | `Sheet` |
| Insight Cards | `Card` mit border-left styling |
| List Items | Custom mit hover states |
| Bottom Nav | Custom mit `Link` |

---

## Verwendung für neue Screens

Bei jedem neuen Screen diese Patterns anwenden:

1. **Layout wählen:** Header-Typ (App vs. Sub-Page)
2. **Navigation prüfen:** Bottom-Nav sichtbar? Welcher Tab aktiv?
3. **Content-Struktur:** KPIs → Sections → Lists
4. **Patterns wiederverwenden:** Insight Cards, List Items, Filter Pills
5. **Farben konsistent:** Primary für Actions, Muted für Secondary

---

*Diese Patterns sind verbindlich für alle neuen UI-Entwicklungen.*
