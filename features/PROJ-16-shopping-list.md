# PROJ-16: Einkaufsliste (Shopping List)

## Status: 🟢 Implemented

**Created:** 2026-02-04
**Inspiration:** Bring! App

---

## Vision

Eine **intelligente Einkaufsliste**, die sich nahtlos in den Bonalyze-Workflow integriert. Nach dem Scannen von Kassenbons "lernt" die App, was regelmäßig gekauft wird, und schlägt Produkte vor, die bald wieder benötigt werden.

**USP vs. Bring!:** Bei Bonalyze ergibt sich die Einkaufsliste automatisch aus den gescannten Kassenbons - keine manuelle Produktpflege nötig.

---

## User Stories

### Core

| ID   | Als...            | möchte ich...                                     | um...                                           |
| ---- | ----------------- | ------------------------------------------------- | ----------------------------------------------- |
| US-1 | Haushaltsmitglied | Produkte zur Einkaufsliste hinzufügen             | beim nächsten Einkauf nichts zu vergessen       |
| US-2 | Haushaltsmitglied | Produkte abhaken während ich einkaufe             | zu sehen was noch fehlt                         |
| US-3 | Haushaltsmitglied | Listen in Echtzeit mit dem Haushalt teilen        | dass jeder die aktuelle Liste sieht             |
| US-4 | Haushaltsmitglied | AI-Vorschläge basierend auf Kaufrhythmus erhalten | proaktiv an fehlende Artikel erinnert zu werden |

### Extended

| ID   | Als...            | möchte ich...                         | um...                                        |
| ---- | ----------------- | ------------------------------------- | -------------------------------------------- |
| US-5 | Haushaltsmitglied | mehrere Listen erstellen              | für verschiedene Geschäfte/Anlässe zu planen |
| US-6 | Haushaltsmitglied | Mengen/Notizen zu Artikeln hinzufügen | spezifische Wünsche festzuhalten             |
| US-7 | Haushaltsmitglied | offline Zugriff auf die Liste haben   | auch ohne Internet einkaufen zu können       |

---

## Acceptance Criteria

### Phase 1: MVP

- [ ] **AC-1:** Einkaufsliste ist über Bottom Navigation oder Dashboard erreichbar
- [ ] **AC-2:** Produkte per Textfeld schnell hinzufügbar (Autocomplete aus Kaufhistorie)
- [ ] **AC-3:** Produkte als Tiles/Kacheln dargestellt (wie Bring!)
- [ ] **AC-4:** Tap = Abhaken (visuell durchgestrichen, ans Ende verschoben)
- [ ] **AC-5:** Long-Press = Löschen oder Bearbeiten
- [ ] **AC-6:** Liste wird in Echtzeit mit allen Haushaltsmitgliedern synchronisiert
- [ ] **AC-7:** Badge auf Navigation zeigt Anzahl offener Artikel

### Phase 2: AI-Vorschläge

- [ ] **AC-8:** "Vorschläge"-Sektion zeigt Produkte basierend auf Kaufrhythmus
- [ ] **AC-9:** Jeder Vorschlag zeigt: Produktname + "Letzter Kauf vor X Tagen"
- [ ] **AC-10:** Tap auf Vorschlag fügt direkt zur Liste hinzu

### Phase 3: Multi-Listen

- [ ] **AC-11:** Mehrere Listen erstellbar (z.B. "REWE", "dm", "Wochenmarkt")
- [ ] **AC-12:** Listen können archiviert/gelöscht werden
- [ ] **AC-13:** Standard-Liste wählbar

---

## UI/UX Design (Bonalyze-konform)

### Navigation Integration

```
┌─────────────────────────────────────────────┐
│   🏠      📋      [+]      🛒      ⚙️      │
│  Home   Receipts  Scan    List   Settings  │
└─────────────────────────────────────────────┘
                              ↑
                    ✅ ENTSCHIEDEN: Ersetzt "Settle" in Nav
                    Settlement wird über Dashboard/Settings erreichbar
```

### Hauptansicht: Einkaufsliste

```
┌─────────────────────────────────────────────┐
│  Einkaufsliste                    [●] 12    │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐    │
│  │  🔍 Produkt hinzufügen...           │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Noch zu kaufen (8)                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │  🥛     │ │  🍞     │ │  🧀     │        │
│  │  Milch  │ │  Brot   │ │  Käse   │        │
│  │  1L     │ │         │ │  200g   │        │
│  └─────────┘ └─────────┘ └─────────┘        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │  🥚     │ │  🍎     │ │  🥬     │        │
│  │  Eier   │ │  Äpfel  │ │  Salat  │        │
│  │  10 Stk │ │  1kg    │ │         │        │
│  └─────────┘ └─────────┘ └─────────┘        │
│                                             │
│  ────────────────────────────────────────   │
│                                             │
│  Erledigt (4)                      Leeren ↗ │
│  ┌─────────┐ ┌─────────┐                    │
│  │  ──🧈── │ │  ──🍳── │                    │
│  │  Butter │ │  Öl     │       (muted)      │
│  └─────────┘ └─────────┘                    │
│                                             │
├─────────────────────────────────────────────┤
│   🏠      📋      [+]      🛒      ⚙️      │
└─────────────────────────────────────────────┘
```

### AI-Vorschläge Sektion

```
┌─────────────────────────────────────────────┐
│  💡 Vorschläge                              │
│                                             │
│  Basierend auf deinem Einkaufsrhythmus:     │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  🥛 Milch                        [+]│    │
│  │     Letzter Kauf vor 5 Tagen        │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │  🍞 Brot                         [+]│    │
│  │     Letzter Kauf vor 3 Tagen        │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### Tile Design (Bring!-inspiriert, Bonalyze-Stil)

```
┌─────────────┐
│             │
│     📦      │  ← Generisches Icon (Kategorie-Icons später)
│             │
│   Milch     │  ← Produktname (1 Zeile, truncated)
│   1L        │  ← Menge/Notiz (optional, muted)
│             │
└─────────────┘
   ↑
   Rahmen: border statt shadow
   Radius: 12pt
   Größe: ~100x100pt
   Tap: Check-Animation → "Erledigt"
```

---

## Datenmodell

### Neue Tabellen

```sql
-- Einkaufslisten (mehrere pro Haushalt)
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Einkaufsliste',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Listeneinträge
CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT, -- "1L", "500g", "2 Stück"
  note TEXT,
  is_checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES users(id),
  added_by UUID REFERENCES users(id),
  -- Link zu Produkt aus Kaufhistorie (optional)
  product_id UUID REFERENCES products(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  position INTEGER DEFAULT 0 -- Für Sortierung
);

-- Index für Realtime
CREATE INDEX idx_shopping_items_list ON shopping_list_items(list_id);
```

### AI-Vorschläge (View, nicht Tabelle)

```sql
-- Produkte die regelmäßig gekauft werden + letzte Kaufdatum
CREATE VIEW suggested_products AS
SELECT
  p.id,
  p.name,
  p.category_id,
  MAX(r.date) as last_purchased,
  COUNT(*) as purchase_count,
  AVG(EXTRACT(DAY FROM r.date - LAG(r.date) OVER (ORDER BY r.date))) as avg_days_between
FROM products p
JOIN receipt_items ri ON ri.product_id = p.id
JOIN receipts r ON r.id = ri.receipt_id
WHERE r.household_id = current_household_id()
GROUP BY p.id, p.name, p.category_id
HAVING COUNT(*) >= 3 -- Mindestens 3x gekauft
ORDER BY last_purchased DESC;
```

---

## Technische Architektur

### Komponenten-Struktur

```
src/components/shopping/
├── index.ts
├── shopping-list.tsx          # Hauptansicht
├── shopping-item-tile.tsx     # Einzelne Kachel
├── add-item-input.tsx         # Suchfeld mit Autocomplete
├── suggestions-section.tsx    # AI-Vorschläge
├── checked-items-section.tsx  # Erledigte Artikel
└── list-switcher.tsx          # Multi-Listen (Phase 3)
```

### Realtime Sync (Supabase)

```typescript
// Echtzeit-Synchronisation mit anderen Haushaltsmitgliedern
const { data, error } = supabase
  .channel("shopping-list")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "shopping_list_items",
      filter: `list_id=eq.${listId}`,
    },
    handleRealtimeUpdate,
  )
  .subscribe();
```

---

## Edge Cases

| Szenario                            | Erwartetes Verhalten                      |
| ----------------------------------- | ----------------------------------------- |
| Offline-Modus                       | Liste lokal verfügbar, Sync bei Reconnect |
| Gleichzeitiges Abhaken              | Letzter Schreiber gewinnt (optimistic UI) |
| Produkt existiert nicht in Historie | Neues Produkt wird erstellt               |
| Leere Liste                         | Empty State mit "Los geht's"-Hinweis      |
| Sehr lange Produktnamen             | Truncate mit ... nach ~20 Zeichen         |

---

## Entschiedene Design-Fragen

> [!NOTE]
> **Entscheidungen (2026-02-04):**
>
> 1. ✅ **Navigation:** "Settle" wird durch "List" 🛒 ersetzt. Settlement via Dashboard/Settings.
> 2. ✅ **Produkt-Icons:** Generische Icons im MVP, Kategorie-Emojis später.
> 3. ✅ **Multi-Listen:** Von Anfang an implementieren.

---

## Abhängigkeiten

- ✅ PROJ-1: Database Schema (existiert)
- ✅ PROJ-4: Receipt Scanner (Produkte werden erfasst)
- ⚠️ Produkte-Tabelle muss ggf. erweitert werden

---

_Spec erstellt: 2026-02-04_
