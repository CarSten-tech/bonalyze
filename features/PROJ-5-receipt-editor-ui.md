# PROJ-5: Receipt Editor UI

## Status: 🔵 Planned

## Übersicht
Nach der AI-Extraktion (PROJ-4) zeigt der Receipt Editor das Ergebnis zur Korrektur an. User kann Store, Datum, Items und Preise anpassen bevor der Receipt gespeichert wird.

## Abhängigkeiten
- Benötigt: PROJ-4 (Receipt Scanner & AI) - liefert AI-Ergebnis als Input
- Benötigt: PROJ-1 (Database Schema) - für Speicherung
- Benötigt: PROJ-3 (Household Management) - für Haushalt-Zuordnung

## User Stories

### US-1: AI-Ergebnis reviewen
- Als **User** möchte ich **das AI-Ergebnis übersichtlich sehen**, um **schnell prüfen zu können ob alles stimmt**
- Als **User** möchte ich **unsichere Erkennungen markiert sehen**, um **zu wissen wo ich genauer hinschauen soll**

### US-2: Store korrigieren
- Als **User** möchte ich **den erkannten Store ändern**, wenn **die AI falsch lag**
- Als **User** möchte ich **aus bekannten Stores wählen** (Autocomplete), um **schnell den richtigen zu finden**
- Als **User** möchte ich **einen neuen Store anlegen**, wenn **er noch nicht existiert**

### US-3: Datum korrigieren
- Als **User** möchte ich **das Datum ändern**, wenn **die AI es falsch erkannt hat**
- Als **User** möchte ich **einen Date-Picker nutzen**, um **das Datum einfach auszuwählen**

### US-4: Items bearbeiten
- Als **User** möchte ich **Produktnamen korrigieren**, wenn **sie falsch erkannt wurden**
- Als **User** möchte ich **Preise korrigieren**, wenn **sie falsch sind**
- Als **User** möchte ich **Items löschen**, wenn **sie nicht zum Einkauf gehören**
- Als **User** möchte ich **Items hinzufügen**, wenn **welche fehlen**
- Als **User** möchte ich **Mengen anpassen**, wenn **die AI falsch gezählt hat**

### US-5: Käufer zuweisen
- Als **User** möchte ich **angeben wer bezahlt hat**, um **das Settlement korrekt zu berechnen**

### US-6: Speichern
- Als **User** möchte ich **den korrigierten Receipt speichern**, um **ihn endgültig zu erfassen**
- Als **User** möchte ich **den Scan abbrechen**, wenn **ich es mir anders überlegt habe**

## Acceptance Criteria

### AC-1: Editor Layout
- [ ] Header mit Store-Name (editierbar)
- [ ] Datum-Anzeige (editierbar via Date-Picker)
- [ ] Item-Liste mit allen Produkten
- [ ] Summen-Anzeige am Ende
- [ ] "Speichern" und "Abbrechen" Buttons

### AC-2: Store-Bearbeitung
- [ ] Tap auf Store öffnet Autocomplete-Search
- [ ] Bekannte Merchants werden vorgeschlagen
- [ ] "Neuen Store anlegen" Option wenn nicht gefunden
- [ ] AI-Vorschlag visuell hervorgehoben

### AC-3: Datum-Bearbeitung
- [ ] Tap auf Datum öffnet Date-Picker
- [ ] Max-Datum: Heute (keine zukünftigen Receipts)
- [ ] Default: AI-erkanntes Datum oder Heute

### AC-4: Item-Bearbeitung
- [ ] Inline-Editing für Produktname
- [ ] Inline-Editing für Preis (Zahlen-Tastatur)
- [ ] Inline-Editing für Menge
- [ ] Swipe-to-Delete oder Delete-Button
- [ ] "Item hinzufügen" Button am Ende der Liste
- [ ] Neues Item: Name, Preis, Menge eingeben

### AC-5: Produkt-Matching
- [ ] Bekannte Produkte werden vorgeschlagen (Autocomplete)
- [ ] Neue Produkte werden automatisch angelegt beim Speichern
- [ ] Kategorie-Zuweisung optional (oder Auto-Detect später)

### AC-6: Käufer-Auswahl
- [ ] Dropdown mit allen Household-Mitgliedern
- [ ] Default: Eingeloggter User
- [ ] "Käufer" Label klar sichtbar

### AC-7: Summen-Validierung
- [ ] Summe wird automatisch aus Items berechnet
- [ ] Warnung wenn berechnete Summe ≠ AI-erkannte Summe
- [ ] User kann Summe manuell überschreiben

### AC-8: Speichern-Flow
- [ ] "Speichern" validiert alle Pflichtfelder
- [ ] Loading-State während Speichern
- [ ] Erfolg: Redirect zu Receipt-Detail oder Dashboard
- [ ] Fehler: Fehlermeldung anzeigen, Daten behalten

### AC-9: Confidence-Anzeige
- [ ] Felder mit niedriger Confidence (< 0.7) markieren
- [ ] Visuelle Markierung: Gelber Rand oder Icon
- [ ] Tooltip: "Bitte prüfen - AI war unsicher"

## Edge Cases

### EC-1: Leere Item-Liste
- **Was passiert, wenn** die AI keine Items erkannt hat?
- **Lösung**: Leere Liste mit "Item hinzufügen" Button anzeigen
- **UI**: Hinweis "Keine Produkte erkannt. Bitte manuell hinzufügen."

### EC-2: Summe stimmt nicht
- **Was passiert, wenn** AI-Summe ≠ Summe der Items?
- **Lösung**: Warnung anzeigen, aber trotzdem speichern erlauben
- **UI**: "Berechnete Summe (€23.47) weicht von erkannter Summe (€24.47) ab"

### EC-3: Negativer Preis (Rabatt)
- **Was passiert, wenn** ein Item negativen Preis hat (Rabatt/Coupon)?
- **Lösung**: Erlauben, als "Rabatt" markieren
- **UI**: Negative Preise in Grün anzeigen

### EC-4: Session-Verlust während Bearbeitung
- **Was passiert, wenn** die Session während der Bearbeitung abläuft?
- **Lösung**: Draft lokal speichern (localStorage), bei Re-Login wiederherstellen
- **MVP**: Daten gehen verloren, Warnung bei langer Inaktivität

### EC-5: Doppeltes Produkt
- **Was passiert, wenn** dasselbe Produkt zweimal in der Liste ist?
- **Lösung**: Erlauben (kann vorkommen, z.B. unterschiedliche Preise)
- **Future**: Zusammenfassen-Option anbieten

### EC-6: Sehr langer Bon (50+ Items)
- **Was passiert, wenn** der Bon sehr viele Items hat?
- **Lösung**: Scrollbare Liste, keine Pagination
- **Performance**: Virtualized List wenn nötig

## UI/UX Spezifikation

### Receipt Editor Screen
```
┌─────────────────────────────┐
│  ← Kassenbon bearbeiten     │
├─────────────────────────────┤
│                             │
│  ┌───────────────────────┐  │
│  │ 🏪 REWE              ▼│  │  ← Tap to edit
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ 📅 28.01.2025        ▼│  │  ← Tap for picker
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ 👤 Bezahlt von: Max  ▼│  │
│  └───────────────────────┘  │
│                             │
│  ─────── Produkte ────────  │
│                             │
│  ┌───────────────────────┐  │
│  │ Bio Vollmilch 1L      │  │
│  │ 2x  €1.29    = €2.58  │  │
│  │                   [🗑] │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ ⚠️ Brötchen (unsicher)│  │  ← Low confidence
│  │ 6x  €0.35    = €2.10  │  │
│  │                   [🗑] │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ Rabatt Coupon         │  │
│  │       -€2.00          │  │  ← Negative = green
│  │                   [🗑] │  │
│  └───────────────────────┘  │
│                             │
│  [   + Produkt hinzufügen  ]│
│                             │
│  ─────────────────────────  │
│                             │
│  Zwischensumme:    €21.47   │
│  ─────────────────────────  │
│  GESAMT:           €21.47   │
│                             │
│  [      Speichern       ]   │
│                             │
└─────────────────────────────┘
```

### Item Edit Modal
```
┌─────────────────────────────┐
│     Produkt bearbeiten      │
│                             │
│  Produktname:               │
│  ┌───────────────────────┐  │
│  │ Bio Vollmilch 1L      │  │
│  └───────────────────────┘  │
│                             │
│  Menge:        Einzelpreis: │
│  ┌─────────┐  ┌───────────┐ │
│  │    2    │  │  € 1.29   │ │
│  └─────────┘  └───────────┘ │
│                             │
│  Gesamt: €2.58              │
│                             │
│  [Abbrechen]  [Speichern]   │
└─────────────────────────────┘
```

## Implementation Notes

### State Management
```typescript
interface ReceiptDraft {
  image_url: string
  merchant_id: string | null
  merchant_name: string
  date: string
  paid_by: string
  items: ReceiptItemDraft[]
  ai_total: number
  ai_confidence: number
}

interface ReceiptItemDraft {
  id: string // temp ID
  name: string
  product_id: string | null
  quantity: number
  unit_price: number
  total_price: number
  confidence: number
}
```

### Speichern-Flow
```typescript
async function saveReceipt(draft: ReceiptDraft) {
  // 1. Merchant anlegen wenn neu
  const merchantId = draft.merchant_id ?? await createMerchant(draft.merchant_name)

  // 2. Receipt erstellen
  const { data: receipt } = await supabase
    .from('receipts')
    .insert({
      household_id: currentHousehold.id,
      merchant_id: merchantId,
      date: draft.date,
      total: calculateTotal(draft.items),
      paid_by: draft.paid_by,
      original_image_url: draft.image_url,
      ai_confidence: draft.ai_confidence
    })
    .select()
    .single()

  // 3. Items erstellen (mit Product-Matching)
  for (const item of draft.items) {
    const productId = item.product_id ?? await findOrCreateProduct(item.name)

    await supabase.from('receipt_items').insert({
      receipt_id: receipt.id,
      product_id: productId,
      quantity: item.quantity,
      price: Math.round(item.total_price * 100) // in Cents
    })
  }

  return receipt
}
```

## Checklist vor Abschluss

- [x] **User Stories komplett**: 6 User Stories definiert
- [x] **Acceptance Criteria konkret**: 9 Kategorien mit testbaren Kriterien
- [x] **Edge Cases identifiziert**: 6 Edge Cases dokumentiert
- [x] **Feature-ID vergeben**: PROJ-5
- [x] **File gespeichert**: `/features/PROJ-5-receipt-editor-ui.md`
- [x] **Status gesetzt**: 🔵 Planned
- [ ] **User Review**: Warte auf User-Approval

## Tech-Design (Solution Architect)

### Bestehende Architektur (wiederverwendbar)

**Bereits vorhanden:**
- shadcn/ui Components: Button, Input, Dialog, Select, Popover, Form, Card, Toast, etc.
- Supabase Client Setup (Server + Browser)
- Database-Schema mit allen benoetigten Tabellen (receipts, receipt_items, merchants, products, profiles, households)
- React Hook Form + Zod fuer Formular-Validierung
- Lucide Icons
- Sonner fuer Toast-Benachrichtigungen

**Keine neuen API-Endpoints noetig** - Supabase wird direkt vom Frontend angesprochen.

---

### Component-Struktur

```
Receipt Editor Seite (/receipts/new)
│
├── Header-Bereich
│   ├── Zurueck-Button (Abbrechen)
│   └── Seitentitel "Kassenbon bearbeiten"
│
├── Store-Auswahl (Tap oeffnet Suche)
│   ├── Aktueller Store-Name anzeigen
│   ├── Autocomplete-Suche fuer bekannte Stores
│   ├── "Neuen Store anlegen" Option
│   └── AI-Vorschlag hervorgehoben (falls vorhanden)
│
├── Datum-Auswahl (Tap oeffnet Kalender)
│   ├── Date-Picker Komponente
│   └── Max-Datum: Heute
│
├── Kaeufer-Auswahl (Dropdown)
│   ├── Liste aller Haushalt-Mitglieder
│   └── Default: Eingeloggter User
│
├── Produkt-Liste (scrollbar)
│   │
│   ├── Produkt-Karte (wiederholend fuer jedes Item)
│   │   ├── Produktname (editierbar, mit Autocomplete)
│   │   ├── Menge-Eingabe (Zahleneingabe)
│   │   ├── Preis-Eingabe (Waehrungs-Eingabe)
│   │   ├── Berechnete Summe (automatisch)
│   │   ├── Confidence-Warnung (gelb bei < 0.7)
│   │   └── Loeschen-Button
│   │
│   ├── Leerer-Zustand (wenn keine Items)
│   │   └── Hinweis "Keine Produkte erkannt"
│   │
│   └── "Produkt hinzufuegen" Button
│
├── Summen-Bereich
│   ├── Zwischensumme (automatisch berechnet)
│   ├── Abweichungs-Warnung (wenn Summe nicht stimmt)
│   └── Gesamt-Betrag
│
└── Aktions-Buttons (sticky am unteren Rand)
    ├── "Abbrechen" Button
    └── "Speichern" Button (mit Loading-State)
```

**Modal-Komponenten (bei Bedarf eingeblendet):**
```
Produkt-Bearbeiten-Modal
├── Produktname-Eingabe
├── Menge-Eingabe
├── Einzelpreis-Eingabe
├── Berechnete Summe (Vorschau)
└── Speichern/Abbrechen Buttons

Store-Anlegen-Modal
├── Store-Name-Eingabe
└── Speichern/Abbrechen Buttons
```

---

### Daten-Model (einfach erklaert)

**Was kommt vom AI-Scanner (Input):**
- Bild-URL des gescannten Bons
- Erkannter Store-Name
- Erkanntes Datum
- Liste der erkannten Produkte (Name, Menge, Preis)
- Erkannte Gesamtsumme
- Confidence-Wert pro Feld (wie sicher die AI war)

**Was wird im Editor bearbeitet:**
- Store: Name oder Auswahl aus bekannten Stores
- Datum: Datum des Einkaufs
- Kaeufer: Welches Haushalt-Mitglied bezahlt hat
- Produkte: Name, Menge, Einzelpreis (pro Zeile)
- Summe: Automatisch berechnet aus Produkten

**Was wird in der Datenbank gespeichert:**
- Receipt (Kassenbon): Datum, Store, Kaeufer, Gesamtsumme, Bild-URL
- Receipt Items (Positionen): Pro Produkt eine Zeile mit Name, Menge, Preis
- Merchants (Stores): Falls neuer Store angelegt wird
- Products (Produkte): Falls neues Produkt angelegt wird

**Speicher-Strategie:**
- Datenbank (Supabase) fuer persistente Speicherung
- Lokaler State waehrend der Bearbeitung (React State)
- Kein localStorage-Draft im MVP (Daten gehen bei Session-Verlust verloren)

---

### Tech-Entscheidungen

**Warum shadcn/ui Dialog fuer Store-Suche?**
- Bereits im Projekt vorhanden (keine neue Abhaengigkeit)
- Kombinierbar mit cmdk (Command) fuer Autocomplete-Suche
- Zugaenglich (Tastatur-Navigation, Screenreader)

**Warum Popover mit Calendar fuer Datums-Auswahl?**
- shadcn/ui Popover bereits vorhanden
- Benoetigt nur react-day-picker als neue Abhaengigkeit
- Bewaehrtes Pattern, mobilfreundlich

**Warum React Hook Form fuer Formular-Management?**
- Bereits im Projekt installiert
- Performant (keine Re-Renders bei jeder Eingabe)
- Zod-Integration fuer Validierung bereits eingerichtet

**Warum keine Virtualisierung fuer lange Listen?**
- MVP-Entscheidung: Einfachheit > Optimierung
- Typische Bons haben 5-20 Items (performant ohne Virtualisierung)
- Kann spaeter bei Bedarf ergaenzt werden

**Warum Inline-Editing statt Modal fuer jedes Item?**
- Schneller fuer User (weniger Klicks)
- Bessere Uebersicht beim Bearbeiten
- Modal nur fuer komplexe Edits (neues Produkt anlegen)

**Warum keine API-Route?**
- Supabase erlaubt direkten Datenbankzugriff vom Client
- Row Level Security (RLS) schuetzt Daten
- Weniger Komplexitaet, schnellere Entwicklung

---

### Dependencies

**Bereits vorhanden (keine Installation noetig):**
- @radix-ui/react-popover (fuer Date-Picker Container)
- @radix-ui/react-dialog (fuer Modals)
- @radix-ui/react-select (fuer Kaeufer-Dropdown)
- cmdk (fuer Store-Autocomplete)
- react-hook-form + zod (fuer Formular)
- lucide-react (Icons)
- sonner (Toast-Benachrichtigungen)

**Neu zu installieren:**
- react-day-picker (Kalender fuer Date-Picker)
  - Warum: Standard-Library fuer Date-Picker, gut mit shadcn/ui integrierbar
  - Groesse: ca. 40KB, keine weiteren Abhaengigkeiten

**Keine neuen Dependencies noetig fuer:**
- Store-Autocomplete (cmdk vorhanden)
- Produkt-Autocomplete (cmdk vorhanden)
- Formular-Handling (react-hook-form vorhanden)
- Styling (Tailwind vorhanden)

---

### Seiten-Struktur (File-System)

```
src/app/
├── receipts/
│   └── new/
│       └── page.tsx    <-- Receipt Editor Seite

src/components/
├── receipts/
│   ├── receipt-editor.tsx           <-- Haupt-Editor Komponente
│   ├── receipt-item-card.tsx        <-- Einzelne Produkt-Zeile
│   ├── store-selector.tsx           <-- Store-Autocomplete
│   ├── date-picker.tsx              <-- Datum-Auswahl
│   ├── payer-selector.tsx           <-- Kaeufer-Dropdown
│   └── receipt-totals.tsx           <-- Summen-Anzeige
```

---

### Checklist (Solution Architect)

- [x] Bestehende Architektur geprueft (Components, DB-Schema, Packages)
- [x] Feature Spec gelesen und verstanden
- [x] Component-Struktur dokumentiert (Visual Tree)
- [x] Daten-Model beschrieben (ohne Code)
- [x] Backend-Bedarf geklaert (Supabase direkt, keine API-Route)
- [x] Tech-Entscheidungen begruendet
- [x] Dependencies aufgelistet (nur react-day-picker neu)
- [x] Design in Feature Spec eingetragen

---

## Next Steps
1. **User-Review**: Spec durchlesen und approven
2. **Frontend Developer**: Editor UI bauen
3. **Danach**: PROJ-6 (Receipt List & Detail)
