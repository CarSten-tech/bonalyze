# PROJ-8: Household Settlement

## Status: 🔵 Planned

## Übersicht
Berechnet wer wem wieviel schuldet basierend auf den Receipts. Ermöglicht fairen Ausgleich der Haushaltsausgaben zwischen Mitgliedern.

## Abhängigkeiten
- Benötigt: PROJ-1 (Database Schema) - für `receipts`, `settlements`
- Benötigt: PROJ-3 (Household Management) - für Mitglieder-Info
- Benötigt: PROJ-6 (Receipt List) - für Receipts mit `paid_by`

## User Stories

### US-1: Settlement berechnen
- Als **User** möchte ich **sehen wer wem wieviel schuldet**, um **Ausgaben fair zu teilen**
- Als **User** möchte ich **den Zeitraum für Settlement wählen**, um **monatlich oder quartalsweise abzurechnen**

### US-2: Übersicht pro Person
- Als **User** möchte ich **sehen wieviel jeder bezahlt hat**, um **die Verteilung zu verstehen**
- Als **User** möchte ich **den "fairen Anteil" sehen**, um **zu wissen was jeder zahlen sollte**

### US-3: Settlement abschließen
- Als **User** möchte ich **einen Settlement als "erledigt" markieren**, um **zu tracken dass der Ausgleich erfolgt ist**
- Als **User** möchte ich **alte Settlements einsehen**, um **Historie zu haben**

### US-4: Settlement-Details
- Als **User** möchte ich **sehen welche Receipts in den Settlement einfließen**, um **Transparenz zu haben**

## Acceptance Criteria

### AC-1: Settlement-Ansicht
- [ ] Zeitraum-Auswahl (Standard: aktueller Monat)
- [ ] Gesamtausgaben des Haushalts
- [ ] Fairer Anteil pro Person (Gesamt / Anzahl Personen)
- [ ] Tatsächlich bezahlt pro Person
- [ ] Differenz (Schulden/Guthaben) pro Person

### AC-2: Ausgleichs-Berechnung
- [ ] Algorithmus: Minimale Anzahl Transaktionen
- [ ] "A → B: €X" Format
- [ ] Bei 2 Personen: Eine Transaktion
- [ ] Bei 3+ Personen: Optimierter Ausgleich

### AC-3: Settlement-Status
- [ ] "Offen" = noch nicht ausgeglichen
- [ ] "Als erledigt markieren" Button
- [ ] Nach Markierung: Settlement wird archiviert
- [ ] Datum der Erledigung gespeichert

### AC-4: Receipt-Drill-Down
- [ ] "Details anzeigen" öffnet Liste der Receipts
- [ ] Gruppiert nach Person (wer hat bezahlt)
- [ ] Summe pro Person sichtbar

### AC-5: Settlement-Historie
- [ ] Liste vergangener Settlements
- [ ] Status: Offen/Erledigt
- [ ] Zeitraum + Betrag

### AC-6: Fair Split Optionen
- [ ] Default: Gleicher Anteil (50/50, 33/33/33, etc.)
- [ ] Future: Custom Split (z.B. 70/30) - nicht im MVP

## Edge Cases

### EC-1: Nur eine Person hat bezahlt
- **Was passiert, wenn** nur ein Member Receipts hat?
- **Lösung**: Andere schulden diesem Member den fairen Anteil

### EC-2: Keine Receipts im Zeitraum
- **Was passiert, wenn** Zeitraum leer ist?
- **Lösung**: "Keine Ausgaben in diesem Zeitraum - nichts auszugleichen"

### EC-3: Ungerade Beträge
- **Was passiert, wenn** €100 / 3 = €33.33...?
- **Lösung**: Runden auf 2 Dezimalstellen, Rest ignorieren (Centbeträge)

### EC-4: Member verlässt Haushalt
- **Was passiert, wenn** jemand den Haushalt verlässt mit offenem Settlement?
- **Lösung**: Settlement bleibt bestehen, kann trotzdem abgeschlossen werden

### EC-5: Neues Member mitten im Monat
- **Was passiert, wenn** jemand am 15. beitritt?
- **Lösung (MVP)**: Wird in Settlement einbezogen (ab Beitrittsdatum)
- **Future**: Anteilige Berechnung

## UI/UX Spezifikation

### Settlement Screen
```
┌─────────────────────────────┐
│  Settlement                 │
├─────────────────────────────┤
│                             │
│  Zeitraum: [Januar 2025 ▼]  │
│                             │
│  ┌───────────────────────┐  │
│  │  Gesamtausgaben       │  │
│  │  €847,32              │  │
│  │                       │  │
│  │  Fair Share pro Person│  │
│  │  €423,66              │  │
│  └───────────────────────┘  │
│                             │
│  ─── Wer hat bezahlt ─────  │
│                             │
│  ┌───────────────────────┐  │
│  │ 👤 Max                │  │
│  │    Bezahlt: €612,00   │  │
│  │    Fair Share: €423,66│  │
│  │    ─────────────────  │  │
│  │    Guthaben: +€188,34 │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ 👤 Anna               │  │
│  │    Bezahlt: €235,32   │  │
│  │    Fair Share: €423,66│  │
│  │    ─────────────────  │  │
│  │    Schulden: -€188,34 │  │
│  └───────────────────────┘  │
│                             │
│  ─── Ausgleich ───────────  │
│                             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │  💰 Anna → Max        │  │
│  │     €188,34           │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  [  Als erledigt markieren ]│
│                             │
│  ─────────────────────────  │
│  [  Receipts anzeigen →  ]  │
│                             │
└─────────────────────────────┘
```

### Settlement History
```
┌─────────────────────────────┐
│  Settlement-Historie        │
├─────────────────────────────┤
│                             │
│  ┌───────────────────────┐  │
│  │ Januar 2025     [OPEN]│  │
│  │ €847,32               │  │
│  │ Anna → Max: €188,34   │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ Dezember 2024   [✓]   │  │
│  │ €756,21               │  │
│  │ Erledigt am 02.01.25  │  │
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘
```

## Implementation Notes

### Settlement-Berechnung
```typescript
interface SettlementResult {
  period: { start: Date; end: Date }
  total_spent: number
  fair_share: number
  per_person: {
    user_id: string
    name: string
    paid: number
    fair_share: number
    balance: number // + = Guthaben, - = Schulden
  }[]
  transfers: {
    from_user_id: string
    to_user_id: string
    amount: number
  }[]
}

function calculateSettlement(receipts: Receipt[], members: Member[]): SettlementResult {
  const total = receipts.reduce((sum, r) => sum + r.total, 0)
  const fairShare = total / members.length

  const perPerson = members.map(m => {
    const paid = receipts
      .filter(r => r.paid_by === m.user_id)
      .reduce((sum, r) => sum + r.total, 0)

    return {
      user_id: m.user_id,
      name: m.display_name,
      paid,
      fair_share: fairShare,
      balance: paid - fairShare
    }
  })

  // Minimize transfers (greedy algorithm)
  const transfers = calculateMinimalTransfers(perPerson)

  return { total_spent: total, fair_share: fairShare, per_person: perPerson, transfers }
}
```

### Database
```sql
-- settlements table (erweitert PROJ-1)
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount INTEGER NOT NULL, -- cents
  settled_at TIMESTAMPTZ, -- NULL = offen
  created_at TIMESTAMPTZ DEFAULT now()
);

-- settlement_transfers
CREATE TABLE settlement_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID REFERENCES settlements(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES profiles(id),
  to_user_id UUID REFERENCES profiles(id),
  amount INTEGER NOT NULL -- cents
);
```

## Tech-Design (Solution Architect)

### Bestehende Architektur (Wiederverwendung)

Folgende Bausteine existieren bereits und werden wiederverwendet:

**Aus PROJ-1 (Database):**
- `receipts` Tabelle mit `paid_by` Feld (wer hat bezahlt)
- `profiles` Tabelle fuer User-Infos
- `households` und `household_members` Tabellen

**Aus PROJ-3 (Household Management):**
- Haushalt-Kontext (welcher Haushalt ist aktiv)
- Mitglieder-Liste des Haushalts

**Aus PROJ-6 (Receipt List):**
- Receipt-Daten mit Datumsfilterung
- Zuordnung wer welchen Receipt bezahlt hat

**UI Components (shadcn/ui bereits installiert):**
- Card, Button, Select, Badge, Dialog, Tabs

---

### Component-Struktur

```
Settlement-Seite (/settlement)
├── Zeitraum-Auswahl (Monats-Dropdown oben)
│
├── Uebersichts-Karte
│   ├── Gesamtausgaben-Anzeige (z.B. "847,32 EUR")
│   └── Fairer Anteil pro Person (z.B. "423,66 EUR")
│
├── Personen-Bereich ("Wer hat bezahlt")
│   └── Personen-Karten (eine pro Haushaltsmitglied)
│       ├── Name + Avatar
│       ├── Bezahlter Betrag
│       ├── Fairer Anteil
│       └── Bilanz (Guthaben oder Schulden, farblich markiert)
│
├── Ausgleichs-Bereich ("Was muss ueberwiesen werden")
│   └── Transfer-Karten
│       └── "Anna ueberweist Max: 188,34 EUR"
│
├── Aktions-Bereich
│   ├── "Als erledigt markieren" Button
│   └── "Receipts anzeigen" Link (Drill-Down)
│
└── Leerer Zustand
    └── "Keine Ausgaben in diesem Zeitraum"

---

Settlement-Historie (/settlement/history)
├── Tab-Navigation (Offen / Erledigt / Alle)
│
└── Historie-Liste
    └── Settlement-Karten
        ├── Zeitraum (z.B. "Januar 2025")
        ├── Status-Badge (Offen/Erledigt)
        ├── Gesamtbetrag
        └── Zusammenfassung der Transfers

---

Receipt-Drill-Down (Sheet/Modal)
├── Gruppiert nach Person
│   └── Person-Abschnitt
│       ├── Name + Summe
│       └── Receipt-Liste (Store, Datum, Betrag)
└── Gesamt-Summe
```

---

### Daten-Model (einfach beschrieben)

**Settlement (Abrechnung):**
- Eindeutige ID
- Haushalt-Zugehoerigkeit
- Zeitraum (Start- und Enddatum, z.B. 1. Jan - 31. Jan)
- Gesamtbetrag aller Receipts im Zeitraum
- Erledigt-Datum (leer = noch offen)
- Erstellungszeitpunkt

**Transfer (wer ueberweist wem):**
- Eindeutige ID
- Gehoert zu welchem Settlement
- Von wem (Person die Schulden hat)
- An wen (Person die Guthaben hat)
- Betrag

**Berechnung passiert live:**
Die Berechnung "wer schuldet wem wieviel" wird aus den bestehenden Receipt-Daten berechnet. Ein Settlement speichert nur das Ergebnis, wenn es als "erledigt" markiert wird.

**Speicherort:** Supabase Datenbank (wie andere Daten auch)

---

### Tech-Entscheidungen (Begruendungen)

**Warum Live-Berechnung statt gespeicherter Werte?**
- Receipts koennen nachtraeglich bearbeitet werden
- Settlement zeigt immer aktuelle Zahlen
- Erst beim "Erledigt markieren" wird der Stand eingefroren

**Warum Monats-basierte Zeitraeume als Standard?**
- Natuerlicher Abrechnungs-Rhythmus fuer Haushalte
- Einfache Auswahl (Dropdown mit Monaten)
- Spaeter erweiterbar auf Custom-Zeitraeume

**Warum "Minimale Transfers" Algorithmus?**
- Bei 2 Personen: Eine Ueberweisung reicht
- Bei 3+ Personen: Weniger Ueberweisungen = einfacher
- Beispiel: Statt A an B und A an C, besser A an B und B an C (wenn moeglich)

**Warum Betraege in Cent speichern?**
- Vermeidet Rundungsfehler bei Berechnungen
- Standard-Praxis fuer Finanz-Daten
- Anzeige wird beim Darstellen formatiert (Cent zu Euro)

**Warum Sheet/Modal fuer Receipt-Details?**
- User bleibt im Settlement-Kontext
- Schnelles Oeffnen/Schliessen
- Kein Seiten-Wechsel noetig

**Warum shadcn/ui Components?**
- Bereits im Projekt installiert (siehe PROJ-1)
- Einheitliches Design mit Rest der App
- Card, Select, Badge, Tabs sind perfekt fuer diese UI

---

### Dependencies

**Bereits vorhanden (keine Installation noetig):**
- shadcn/ui (Card, Button, Select, Badge, Tabs, Sheet)
- Supabase Client (Datenbankzugriff)
- date-fns oder dayjs (Datumsformatierung - pruefen ob installiert)

**Moeglicherweise neu zu installieren:**
- date-fns (falls noch nicht vorhanden, fuer Monats-Berechnungen und Formatierung)

---

### API Endpunkte (High-Level)

Die App benoetigt folgende Backend-Logik:

1. **Settlement berechnen** - Receipts im Zeitraum holen, Summen berechnen, Transfers ermitteln
2. **Settlement als erledigt markieren** - Settlement-Eintrag erstellen mit Transfers
3. **Settlement-Historie laden** - Alle vergangenen Settlements des Haushalts
4. **Receipts im Zeitraum laden** - Fuer Drill-Down Ansicht

---

## Checklist vor Abschluss

- [x] **User Stories komplett**: 4 User Stories definiert
- [x] **Acceptance Criteria konkret**: 6 Kategorien
- [x] **Edge Cases identifiziert**: 5 Edge Cases
- [x] **Feature-ID vergeben**: PROJ-8
- [x] **Status gesetzt**: 🔵 Planned
- [ ] **User Review**: Warte auf User-Approval

## Next Steps
1. **User-Review**: Spec durchlesen und approven
2. **Backend Developer**: Settlement-Berechnung + API
3. **Frontend Developer**: Settlement UI
4. **Danach**: PROJ-9 (Preis-Tracking)
