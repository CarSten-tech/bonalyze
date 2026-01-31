# PROJ-3: Household Management

## Status: 🔵 Planned

## Übersicht
Ermöglicht Usern, Haushalte zu erstellen und andere Personen einzuladen. Ein Haushalt ist die zentrale Einheit für geteilte Receipts, Ausgaben-Tracking und Settlements.

## Abhängigkeiten
- Benötigt: PROJ-1 (Database Schema) - für `households`, `household_members` Tables
- Benötigt: PROJ-2 (User Authentication) - User muss eingeloggt sein

## User Stories

### US-1: Haushalt erstellen
- Als **neu registrierter User** möchte ich **meinen ersten Haushalt erstellen**, um **mit Bonalyze starten zu können**
- Als **User** möchte ich **meinem Haushalt einen Namen geben** (z.B. "Familie Müller", "WG Hauptstraße"), um **mehrere Haushalte unterscheiden zu können**

### US-2: Mitglieder einladen
- Als **Haushalt-Admin** möchte ich **andere Personen per Email einladen**, um **gemeinsam Ausgaben zu tracken**
- Als **eingeladene Person** möchte ich **die Einladung per Link annehmen**, um **dem Haushalt beizutreten**
- Als **Haushalt-Admin** möchte ich **sehen, wer eingeladen wurde** (pending invites), um **den Status zu tracken**

### US-3: Haushalt wechseln
- Als **User in mehreren Haushalten** möchte ich **zwischen Haushalten wechseln**, um **verschiedene Kontexte zu trennen** (z.B. Familie vs. WG)

### US-4: Haushalt verlassen
- Als **Haushalt-Member** möchte ich **einen Haushalt verlassen können**, um **nicht mehr Teil davon zu sein**
- Als **letztes Mitglied** möchte ich **den Haushalt löschen**, wenn **ich ihn verlasse**

### US-5: Mitglieder verwalten
- Als **Haushalt-Admin** möchte ich **Mitglieder entfernen können**, um **den Haushalt zu verwalten**
- Als **Haushalt-Admin** möchte ich **andere zum Admin machen**, um **Verantwortung zu teilen**

## Acceptance Criteria

### AC-1: Haushalt erstellen
- [ ] Nach erstem Login: Onboarding-Flow "Haushalt erstellen"
- [ ] Haushalt-Name Eingabefeld (required, min. 2 Zeichen)
- [ ] User wird automatisch Admin des neuen Haushalts
- [ ] Weiterleitung zum Dashboard nach Erstellung
- [ ] Haushalt erscheint sofort in der Haushalt-Auswahl

### AC-2: Einladungs-Flow
- [ ] "Mitglied einladen" Button im Haushalt-Settings
- [ ] Email-Eingabe mit Validierung
- [ ] Einladungs-Email wird gesendet (via Supabase Edge Function oder Next.js API)
- [ ] Einladung enthält einzigartigen Link
- [ ] Link-Klick führt zu Signup (wenn nicht registriert) oder direktem Beitritt (wenn eingeloggt)
- [ ] Einladung läuft nach 7 Tagen ab
- [ ] "Erneut einladen" Funktion für abgelaufene Einladungen

### AC-3: Haushalt-Wechsel
- [ ] Haushalt-Switcher im Header (wenn User in >1 Haushalt)
- [ ] Dropdown mit allen Haushalten des Users
- [ ] Aktiver Haushalt visuell markiert
- [ ] Wechsel ändert Kontext für alle Daten (Receipts, Analytics, etc.)
- [ ] Letzter aktiver Haushalt wird gespeichert (localStorage)

### AC-4: Mitglieder-Übersicht
- [ ] Liste aller Mitglieder im Haushalt-Settings
- [ ] Anzeige: Name, Email, Rolle (Admin/Member), Beitrittsdatum
- [ ] Pending Invites als separate Sektion
- [ ] Admin-Actions: Entfernen, Rolle ändern

### AC-5: Haushalt verlassen
- [ ] "Haushalt verlassen" Button für Members
- [ ] Bestätigungs-Dialog ("Bist du sicher?")
- [ ] Daten bleiben im Haushalt (Receipts werden nicht gelöscht)
- [ ] Letzter User: Haushalt wird komplett gelöscht
- [ ] Admin kann sich nur selbst entfernen, wenn anderer Admin existiert

### AC-6: Security & Permissions
- [ ] Nur Admins können einladen/entfernen
- [ ] Einladungs-Links sind einmalig verwendbar
- [ ] RLS verhindert Zugriff auf fremde Haushalte
- [ ] Einladungs-Tokens werden sicher generiert (UUID)

## Edge Cases

### EC-1: User ohne Haushalt
- **Was passiert, wenn** ein User keinem Haushalt angehört?
- **Lösung**: Onboarding erzwingt Haushalt-Erstellung oder Einladungs-Annahme
- **UI**: "Du bist noch in keinem Haushalt. Erstelle einen oder nimm eine Einladung an."

### EC-2: Einladung an bereits registrierten User
- **Was passiert, wenn** die eingeladene Email bereits einen Account hat?
- **Lösung**: Direkter Beitritt nach Login (kein Signup nötig)
- **UX**: "Du wurdest zu 'Familie Müller' eingeladen. [Beitreten]"

### EC-3: Einladung an sich selbst
- **Was passiert, wenn** ein Admin seine eigene Email eingibt?
- **Lösung**: Fehlermeldung "Du bist bereits Mitglied dieses Haushalts"

### EC-4: Doppelte Einladung
- **Was passiert, wenn** dieselbe Person zweimal eingeladen wird?
- **Lösung**: Alte Einladung wird ersetzt, neue Email gesendet
- **UI**: "Einladung wurde erneut gesendet"

### EC-5: Letzter Admin verlässt
- **Was passiert, wenn** der einzige Admin den Haushalt verlassen will?
- **Lösung**: Erst anderen zum Admin machen, dann verlassen
- **UI**: "Du bist der einzige Admin. Bitte ernenne erst jemand anderen zum Admin."

### EC-6: Einladung abgelaufen
- **Was passiert, wenn** ein Einladungs-Link nach 7 Tagen angeklickt wird?
- **Lösung**: Fehlermeldung "Diese Einladung ist abgelaufen"
- **UI**: "Bitte den Haushalt-Admin um eine neue Einladung bitten"

### EC-7: Multi-Haushalt User wechselt während Aktion
- **Was passiert, wenn** User während Receipt-Upload den Haushalt wechselt?
- **Lösung**: Receipt wird im aktuell ausgewählten Haushalt gespeichert
- **UI**: Haushalt-Auswahl im Receipt-Flow anzeigen

## Technische Anforderungen

### Performance
- Haushalt-Wechsel: Sofort (lokaler State)
- Einladungs-Email: < 5 Sekunden
- Mitglieder-Liste laden: < 200ms

### Security
- Einladungs-Tokens: UUID v4, einmalig verwendbar
- Token-Validierung server-side
- RLS auf `household_members` für Zugriffskontrolle

### Data Model (aus PROJ-1)
```sql
-- households
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- household_members
CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'admin' oder 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, user_id)
);

-- household_invites (NEU)
CREATE TABLE household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES profiles(id),
  token UUID DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## UI/UX Spezifikation

### Screens

#### 1. Onboarding: Haushalt erstellen (`/onboarding/household`)
```
┌─────────────────────────────┐
│     Willkommen bei          │
│        Bonalyze!            │
│                             │
│  Erstelle deinen Haushalt   │
│  um loszulegen.             │
│                             │
│  ┌───────────────────────┐  │
│  │ Haushalt-Name         │  │
│  │ z.B. "Familie Müller" │  │
│  └───────────────────────┘  │
│                             │
│  [   Haushalt erstellen  ]  │
│                             │
│  ─────── oder ───────       │
│                             │
│  Hast du eine Einladung?    │
│  [  Einladungs-Link nutzen ]│
└─────────────────────────────┘
```

#### 2. Haushalt-Switcher (Header)
```
┌─────────────────────────────┐
│  🏠 Familie Müller  ▼       │
│  ├─ Familie Müller  ✓       │
│  ├─ WG Hauptstraße          │
│  └─ + Neuen Haushalt        │
└─────────────────────────────┘
```

#### 3. Haushalt-Settings (`/settings/household`)
```
┌─────────────────────────────┐
│     Haushalt-Einstellungen  │
│                             │
│  Name: Familie Müller       │
│  [Bearbeiten]               │
│                             │
│  ─────── Mitglieder ──────  │
│                             │
│  👤 Max Müller (Admin)      │
│     max@example.com         │
│                             │
│  👤 Anna Müller             │
│     anna@example.com        │
│     [Entfernen] [Zum Admin] │
│                             │
│  ─── Ausstehende Einladungen│
│                             │
│  📧 peter@example.com       │
│     Eingeladen vor 2 Tagen  │
│     [Erneut senden] [Löschen│
│                             │
│  [  + Mitglied einladen  ]  │
│                             │
│  ─────────────────────      │
│  [  Haushalt verlassen  ]   │
└─────────────────────────────┘
```

#### 4. Einladung annehmen (`/invite/[token]`)
```
┌─────────────────────────────┐
│        🏠                   │
│                             │
│  Du wurdest eingeladen zu   │
│                             │
│    "Familie Müller"         │
│                             │
│  Eingeladen von Max Müller  │
│                             │
│  [    Beitreten    ]        │
│                             │
│  [    Ablehnen     ]        │
└─────────────────────────────┘
```

## Implementation Notes

### Einladungs-Flow
```typescript
// 1. Einladung erstellen (API Route)
POST /api/households/[id]/invite
Body: { email: "anna@example.com" }

// 2. Email senden (Supabase Edge Function oder Resend)
// Subject: "Du wurdest zu 'Familie Müller' eingeladen"
// Body: Link zu /invite/[token]

// 3. Einladung annehmen
POST /api/invite/[token]/accept
// → household_members INSERT
// → household_invites UPDATE (accepted_at)
```

### Haushalt-Context (React)
```typescript
const HouseholdContext = createContext<{
  currentHousehold: Household | null;
  households: Household[];
  switchHousehold: (id: string) => void;
}>()

// Usage in Components
const { currentHousehold } = useHousehold()
```

## Checklist vor Abschluss

- [x] **Fragen gestellt**: Household-Modell aus PROJ-1 übernommen
- [x] **User Stories komplett**: 5 User Stories definiert
- [x] **Acceptance Criteria konkret**: 6 Kategorien mit testbaren Kriterien
- [x] **Edge Cases identifiziert**: 7 Edge Cases dokumentiert
- [x] **Feature-ID vergeben**: PROJ-3
- [x] **File gespeichert**: `/features/PROJ-3-household-management.md`
- [x] **Status gesetzt**: 🔵 Planned
- [ ] **User Review**: Warte auf User-Approval

## Tech-Design (Solution Architect)

### Bestehende Infrastruktur (wiederverwendbar)

Folgende Bausteine existieren bereits und werden wiederverwendet:

| Was existiert | Wo | Nutzung |
|---------------|-----|---------|
| Supabase Client | `src/lib/supabase.ts` | Datenbankzugriff |
| households Table | Datenbank | Speichert Haushalte |
| household_members Table | Datenbank | Mitgliedschaften |
| profiles Table | Datenbank | User-Profile |
| shadcn/ui Components | `src/components/ui/` | Button, Card, Dialog, Dropdown, Form, Input |

**Neu zu erstellen:** `household_invites` Table (fuer Einladungen)

---

### Component-Struktur (Visual Tree)

```
App-Layout
├── Header
│   └── Haushalt-Switcher (Dropdown)
│       ├── Aktiver Haushalt (markiert)
│       ├── Weitere Haushalte (klickbar)
│       └── "Neuen Haushalt erstellen" Link
│
├── Onboarding-Seite (/onboarding/household)
│   ├── Willkommens-Text
│   ├── Haushalt-Name Eingabefeld
│   ├── "Haushalt erstellen" Button
│   └── "Einladung annehmen" Link
│
├── Haushalt-Einstellungen (/settings/household)
│   ├── Haushalt-Name (bearbeitbar)
│   ├── Mitglieder-Liste
│   │   └── Mitglieder-Karte (pro Person)
│   │       ├── Avatar + Name
│   │       ├── Email
│   │       ├── Rolle (Admin/Member)
│   │       └── Admin-Aktionen (Entfernen, Rolle aendern)
│   ├── Ausstehende Einladungen
│   │   └── Einladungs-Karte (pro Email)
│   │       ├── Email-Adresse
│   │       ├── Eingeladen vor X Tagen
│   │       └── Aktionen (Erneut senden, Loeschen)
│   ├── "Mitglied einladen" Button
│   └── "Haushalt verlassen" Button
│
├── Einladungs-Dialog (Modal)
│   ├── Email-Eingabefeld
│   ├── Validierungs-Hinweise
│   └── "Einladung senden" Button
│
├── Einladung-Annehmen-Seite (/invite/[token])
│   ├── Haushalt-Name Anzeige
│   ├── Eingeladen von (Name)
│   ├── "Beitreten" Button
│   └── "Ablehnen" Button
│
└── Bestaetigungs-Dialoge
    ├── "Haushalt verlassen?" Dialog
    ├── "Mitglied entfernen?" Dialog
    └── "Einladung loeschen?" Dialog
```

---

### Daten-Model (einfach beschrieben)

#### Haushalt
Speichert grundlegende Infos ueber jeden Haushalt:
- Eindeutige ID
- Name (z.B. "Familie Mueller", "WG Hauptstrasse")
- Wer hat den Haushalt erstellt
- Erstellungszeitpunkt

**Bereits vorhanden in Datenbank**

#### Mitgliedschaft
Verknuepft User mit Haushalten:
- Welcher User
- Welcher Haushalt
- Rolle: "admin" oder "member"
- Beitrittszeitpunkt

**Bereits vorhanden in Datenbank**

#### Einladung (NEU)
Speichert offene Einladungen:
- Welcher Haushalt
- Eingeladene Email-Adresse
- Wer hat eingeladen
- Einzigartiger Einladungs-Token (fuer den Link)
- Ablaufdatum (7 Tage nach Erstellung)
- Wurde angenommen? (Zeitpunkt)

**Muss noch erstellt werden (Backend Developer)**

#### Lokale Speicherung (Browser)
- Zuletzt aktiver Haushalt (fuer schnellen Wechsel)

**Gespeichert in: localStorage**

---

### Tech-Entscheidungen (Begruendungen)

| Entscheidung | Begruendung |
|--------------|-------------|
| **Supabase fuer Datenbank** | Bereits im Projekt eingerichtet, bietet Row-Level-Security fuer Datenschutz |
| **shadcn/ui Components** | Bereits installiert (Button, Card, Dialog, Dropdown-Menu, Form, Input), konsistentes Design |
| **React Context fuer Haushalt-State** | Ermoeglicht einfachen Zugriff auf aktuellen Haushalt in der ganzen App |
| **localStorage fuer aktiven Haushalt** | Schneller Wechsel ohne Server-Anfrage, funktioniert offline |
| **Next.js API Routes fuer Einladungen** | Server-seitige Email-Validierung und Token-Pruefung (sicherer) |
| **Resend fuer Email-Versand** | Einfache Integration, zuverlaessige Zustellung, kostenloser Starter-Plan |
| **UUID fuer Einladungs-Tokens** | Sicher (nicht erratbar), Standard in Supabase |

---

### Backend-Anforderungen (fuer Backend Developer)

1. **Neue Datenbank-Tabelle:** `household_invites` (siehe Data Model oben)

2. **API Endpoints:**
   - Einladung erstellen (nur Admins)
   - Einladung annehmen (mit Token)
   - Einladung loeschen
   - Einladung erneut senden

3. **Email-Service:**
   - Integration mit Resend oder Supabase Edge Function
   - Email-Template fuer Einladungen

---

### Dependencies (Packages)

| Package | Zweck | Status |
|---------|-------|--------|
| `@supabase/ssr` | Datenbank-Zugriff | Bereits installiert |
| `react-hook-form` | Formular-Handling | Bereits installiert |
| `resend` | Email-Versand | Neu installieren |
| `zod` | Eingabe-Validierung | Bereits installiert |

**Nur 1 neues Package noetig: resend**

---

### Screens und Routen

| Route | Beschreibung | Zugaenglich fuer |
|-------|--------------|------------------|
| `/onboarding/household` | Ersten Haushalt erstellen | User ohne Haushalt |
| `/settings/household` | Haushalt verwalten | Alle Mitglieder |
| `/invite/[token]` | Einladung annehmen | Jeder mit gueltigem Link |

---

### Reihenfolge der Implementierung

1. **Backend zuerst:** `household_invites` Table + API Routes
2. **Frontend danach:** UI-Komponenten bauen
3. **Integration:** Email-Service anbinden

---

## Next Steps
1. **User-Review**: Tech-Design durchlesen und approven
2. **Backend Developer**: `household_invites` Table + API Routes + Email-Service
3. **Frontend Developer**: Onboarding UI + Haushalt-Settings + Einladungs-Flow
4. **Danach**: PROJ-4 (Receipt Scanner & AI)
