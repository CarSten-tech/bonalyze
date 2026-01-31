# Bonalyze - MVP Produktplan

> KI-gestützte Kassenbon- und Haushaltsausgaben-Intelligence-App

---

## 1. MVP Feature-Set (Strict Scope)

### Core Features (Must-Have MVP)

| Prio | Feature | Beschreibung | Komplexität |
|------|---------|--------------|-------------|
| P0 | **User Authentication** | Email/Password + Magic Link Login | Mittel |
| P0 | **Haushalt erstellen/beitreten** | Multi-User Household Setup | Mittel |
| P0 | **Receipt Scan & AI-Extraktion** | Foto → Gemini Flash → Strukturierte Daten | Hoch |
| P0 | **Receipt-Korrektur UI** | AI-Vorschlag editieren vor Speichern | Mittel |
| P1 | **Ausgaben-Übersicht** | Monatliche Summen pro Kategorie/Store | Mittel |
| P1 | **Household Settlement** | Wer schuldet wem wieviel | Mittel |
| P2 | **Preis-Tracking** | Produktpreise über Zeit | Niedrig |
| P2 | **Shopping Insights (Basic)** | "Du kaufst X oft bei Y" | Niedrig |

### Explizit NICHT im MVP

- Offline-Modus (später)
- Shopping-Listen (PROJ-1 Schema vorhanden, aber UI später)
- Push-Notifications
- Multi-Currency
- Export-Funktionen (CSV/PDF)
- App Store Deployment (erst Web-PWA)

---

## 2. Haupt-User-Flows

### Flow 1: Onboarding (Neu-User)

```
┌─────────────────────────────────────────────────────────────┐
│  1. Landing Page                                            │
│     ↓                                                       │
│  2. Sign Up (Email/PW oder Magic Link)                      │
│     ↓                                                       │
│  3. Email verifizieren (optional im MVP)                    │
│     ↓                                                       │
│  4. Haushalt erstellen ODER Einladung annehmen              │
│     ↓                                                       │
│  5. Dashboard (leer) mit CTA: "Ersten Kassenbon scannen"    │
└─────────────────────────────────────────────────────────────┘
```

### Flow 2: Receipt Erfassen (Kern-Flow)

```
┌─────────────────────────────────────────────────────────────┐
│  1. FAB-Button "+" antippen                                 │
│     ↓                                                       │
│  2. Kamera öffnet sich (oder Galerie wählen)                │
│     ↓                                                       │
│  3. Foto aufnehmen → Loading State "AI analysiert..."       │
│     ↓                                                       │
│  4. AI-Ergebnis-Review:                                     │
│     - Store erkannt (REWE, LIDL, etc.)                      │
│     - Datum extrahiert                                      │
│     - Line-Items mit Preisen                                │
│     - Summe                                                 │
│     ↓                                                       │
│  5. User korrigiert bei Bedarf (inline editing)             │
│     - Store ändern                                          │
│     - Items hinzufügen/entfernen/editieren                  │
│     - Käufer zuweisen (für Settlement)                      │
│     ↓                                                       │
│  6. "Speichern" → Erfolg-Feedback → Dashboard               │
└─────────────────────────────────────────────────────────────┘
```

### Flow 3: Ausgaben-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard zeigt:                                           │
│                                                             │
│  ┌─────────────────────────────────────┐                    │
│  │  Diesen Monat: €847,32              │                    │
│  │  ▼ vs. letzter Monat: +12%          │                    │
│  └─────────────────────────────────────┘                    │
│                                                             │
│  ┌─────────────────────────────────────┐                    │
│  │  Nach Kategorie:                    │                    │
│  │  🥦 Lebensmittel    €523 (62%)      │                    │
│  │  🧴 Haushalt        €187 (22%)      │                    │
│  │  🍷 Getränke        €137 (16%)      │                    │
│  └─────────────────────────────────────┘                    │
│                                                             │
│  ┌─────────────────────────────────────┐                    │
│  │  Nach Store:                        │                    │
│  │  REWE     €412    (14 Einkäufe)     │                    │
│  │  LIDL     €298    (8 Einkäufe)      │                    │
│  │  ALDI     €137    (5 Einkäufe)      │                    │
│  └─────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Flow 4: Household Settlement

```
┌─────────────────────────────────────────────────────────────┐
│  Settlement-Ansicht:                                        │
│                                                             │
│  Zeitraum: [Januar 2025 ▼]                                  │
│                                                             │
│  ┌─────────────────────────────────────┐                    │
│  │  Gesamtausgaben: €847,32            │                    │
│  │  Fair Share pro Person: €423,66     │                    │
│  └─────────────────────────────────────┘                    │
│                                                             │
│  ┌─────────────────────────────────────┐                    │
│  │  👤 Max hat bezahlt:    €612,00     │                    │
│  │  👤 Anna hat bezahlt:   €235,32     │                    │
│  └─────────────────────────────────────┘                    │
│                                                             │
│  ┌─────────────────────────────────────┐                    │
│  │  💰 Ausgleich:                      │                    │
│  │  Anna → Max: €188,34                │                    │
│  │                                     │                    │
│  │  [Als erledigt markieren]           │                    │
│  └─────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Flow 5: Preis-Tracking (Detail-View)

```
┌─────────────────────────────────────────────────────────────┐
│  Produkt: Hafermilch Oatly 1L                               │
│                                                             │
│  ┌─────────────────────────────────────┐                    │
│  │  Preisverlauf (letzte 6 Monate):    │                    │
│  │                                     │                    │
│  │  €2.49 ─────┐     ┌──── €2.29       │                    │
│  │             └─────┘                 │                    │
│  │  Okt  Nov  Dez  Jan  Feb  März      │                    │
│  └─────────────────────────────────────┘                    │
│                                                             │
│  Günstigster Store: LIDL (€1.99)                            │
│  Letzter Kauf: REWE am 28.01. (€2.29)                       │
│                                                             │
│  Durchschnittspreis: €2.18                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Datenmodell (Erweiterungen zu PROJ-1)

### Bestehend aus PROJ-1
- `profiles` ✅
- `households` ✅
- `household_members` ✅
- `merchants` ✅
- `products` ✅
- `receipts` ✅
- `receipt_items` ✅
- `shopping_lists` ✅
- `shopping_list_items` ✅

### Neue/Erweiterte Felder für MVP

```sql
-- receipts: Erweiterungen
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS
  paid_by UUID REFERENCES profiles(id),           -- Wer hat bezahlt (für Settlement)
  original_image_url TEXT,                        -- Kassenbon-Foto in Supabase Storage
  ai_raw_response JSONB,                          -- Gemini Response für Debugging
  ai_confidence FLOAT,                            -- Konfidenz der AI-Extraktion
  ai_processed_at TIMESTAMPTZ;                    -- Wann AI verarbeitet hat

-- receipt_items: Erweiterungen
ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS
  ai_matched_product_id UUID REFERENCES products(id),  -- AI-vorgeschlagenes Produkt
  user_confirmed BOOLEAN DEFAULT false;                -- User hat Item bestätigt

-- products: Kategorisierung
ALTER TABLE products ADD COLUMN IF NOT EXISTS
  category TEXT;  -- 'food', 'beverages', 'household', 'personal_care', 'other'

-- settlements: Neue Tabelle
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  from_user_id UUID REFERENCES profiles(id),
  to_user_id UUID REFERENCES profiles(id),
  amount INTEGER NOT NULL,  -- in Cents
  settled_at TIMESTAMPTZ,   -- NULL = offen, Timestamp = erledigt
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### ERD-Übersicht (Kern-Entities)

```
┌──────────────┐       ┌─────────────────┐       ┌──────────────┐
│   profiles   │       │   households    │       │   merchants  │
├──────────────┤       ├─────────────────┤       ├──────────────┤
│ id           │◄──────│ created_by      │       │ id           │
│ email        │       │ name            │       │ name         │
│ display_name │       │                 │       │ category     │
└──────────────┘       └─────────────────┘       └──────────────┘
       │                       │                        │
       │                       │                        │
       ▼                       ▼                        │
┌──────────────────────────────────────┐               │
│         household_members            │               │
├──────────────────────────────────────┤               │
│ user_id ────► profiles               │               │
│ household_id ────► households        │               │
│ role (admin/member)                  │               │
└──────────────────────────────────────┘               │
                       │                               │
                       ▼                               │
              ┌─────────────────┐                      │
              │    receipts     │◄─────────────────────┘
              ├─────────────────┤
              │ household_id    │
              │ merchant_id     │────────────────────────►
              │ paid_by         │────► profiles
              │ date            │
              │ total           │
              │ original_image  │
              └─────────────────┘
                       │
                       ▼
              ┌─────────────────┐       ┌──────────────┐
              │  receipt_items  │       │   products   │
              ├─────────────────┤       ├──────────────┤
              │ receipt_id      │       │ id           │
              │ product_id      │──────►│ name         │
              │ price           │       │ category     │
              │ quantity        │       │ unit         │
              └─────────────────┘       └──────────────┘
```

---

## 4. System-Architektur

### High-Level Architektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (PWA)                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Next.js App (App Router)                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │    │
│  │  │  Dashboard  │  │  Receipt    │  │  Settings   │              │    │
│  │  │  (Stats)    │  │  Scanner    │  │  Profile    │              │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │    │
│  │                                                                  │    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │              UI Layer (shadcn/ui + Tailwind)            │    │    │
│  │  └─────────────────────────────────────────────────────────┘    │    │
│  │                                                                  │    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │         State Management (React Context / Zustand)       │    │    │
│  │  └─────────────────────────────────────────────────────────┘    │    │
│  │                                                                  │    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │              Supabase Client (@supabase/ssr)            │    │    │
│  │  └─────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS API ROUTES                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  /api/receipts/scan     POST  → Foto hochladen + AI triggern    │    │
│  │  /api/receipts          CRUD  → Receipt Management              │    │
│  │  /api/analytics/summary GET   → Monatliche Übersichten          │    │
│  │  /api/settlements       GET   → Settlement-Berechnungen          │    │
│  │  /api/products/search   GET   → Produkt-Suche/Autocomplete      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌───────────────────────────────┐   ┌───────────────────────────────────┐
│       SUPABASE BACKEND        │   │         GEMINI FLASH API          │
│  ┌─────────────────────────┐  │   │  ┌─────────────────────────────┐  │
│  │     PostgreSQL DB       │  │   │  │   Receipt OCR + Parsing    │  │
│  │     + Row Level Sec     │  │   │  │                             │  │
│  └─────────────────────────┘  │   │  │   Input: Kassenbon-Foto     │  │
│  ┌─────────────────────────┐  │   │  │   Output: JSON mit:         │  │
│  │    Supabase Auth        │  │   │  │   - merchant_name           │  │
│  │    (Email/Magic Link)   │  │   │  │   - date                    │  │
│  └─────────────────────────┘  │   │  │   - items[]                 │  │
│  ┌─────────────────────────┐  │   │  │   - total                   │  │
│  │    Supabase Storage     │  │   │  └─────────────────────────────┘  │
│  │    (Receipt Images)     │  │   │                                   │
│  └─────────────────────────┘  │   └───────────────────────────────────┘
└───────────────────────────────┘
```

### AI Pipeline (Gemini Flash 1.5)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        RECEIPT PROCESSING PIPELINE                      │
└─────────────────────────────────────────────────────────────────────────┘

Step 1: Upload
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  User Foto  │────►│  Resize/    │────►│  Supabase        │
│  (Mobile)   │     │  Compress   │     │  Storage Upload  │
└─────────────┘     └─────────────┘     └──────────────────┘
                                                │
                                                ▼
Step 2: AI Extraction
┌──────────────────┐     ┌────────────────────────────────────────────┐
│  Supabase        │────►│  Gemini Flash 1.5 API                      │
│  Image URL       │     │                                            │
└──────────────────┘     │  Prompt:                                   │
                         │  "Extrahiere aus diesem Kassenbon:         │
                         │   - Store-Name                             │
                         │   - Datum (ISO 8601)                       │
                         │   - Jedes Produkt mit:                     │
                         │     - Name, Menge, Einzelpreis, Summe      │
                         │   - Gesamtsumme                            │
                         │   Antworte NUR mit validem JSON."          │
                         │                                            │
                         │  Response Format:                          │
                         │  {                                         │
                         │    "merchant": "REWE",                     │
                         │    "date": "2025-01-28",                   │
                         │    "items": [                              │
                         │      {"name": "Bio Milch 1L",              │
                         │       "quantity": 2,                       │
                         │       "unit_price": 1.29,                  │
                         │       "total": 2.58}                       │
                         │    ],                                      │
                         │    "total": 23.47,                         │
                         │    "confidence": 0.92                      │
                         │  }                                         │
                         └────────────────────────────────────────────┘
                                                │
                                                ▼
Step 3: Post-Processing
┌────────────────────────────────────────────────────────────────────────┐
│  Backend Processing:                                                    │
│  1. JSON validieren (Zod Schema)                                       │
│  2. Merchant matchen (Fuzzy Match gegen merchants-Table)               │
│  3. Products matchen (Fuzzy Match gegen products-Table)                │
│  4. Preise in Cents konvertieren                                       │
│  5. Draft-Receipt erstellen (noch nicht final gespeichert)             │
└────────────────────────────────────────────────────────────────────────┘
                                                │
                                                ▼
Step 4: User Review
┌────────────────────────────────────────────────────────────────────────┐
│  UI zeigt:                                                              │
│  - AI-Vorschlag (editierbar)                                           │
│  - Konfidenz-Anzeige (grün/gelb/rot)                                   │
│  - "Speichern" / "Abbrechen"                                           │
└────────────────────────────────────────────────────────────────────────┘
                                                │
                                                ▼
Step 5: Persist
┌────────────────────────────────────────────────────────────────────────┐
│  Nach User-Bestätigung:                                                 │
│  1. Receipt in DB speichern                                            │
│  2. Receipt Items erstellen                                            │
│  3. Neue Products anlegen (wenn nicht existiert)                       │
│  4. Price History aktualisieren                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Frontend-Struktur

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── verify/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Bottom Navigation
│   │   ├── page.tsx                # Dashboard/Home
│   │   ├── receipts/
│   │   │   ├── page.tsx            # Receipt-Liste
│   │   │   ├── [id]/page.tsx       # Receipt-Detail
│   │   │   └── new/page.tsx        # Receipt Scanner
│   │   ├── analytics/
│   │   │   ├── page.tsx            # Ausgaben-Übersicht
│   │   │   └── products/[id]/page.tsx  # Preis-Tracking Detail
│   │   ├── settlement/
│   │   │   └── page.tsx            # Settlement-Ansicht
│   │   └── settings/
│   │       ├── page.tsx            # Settings Overview
│   │       ├── profile/page.tsx    # Profil bearbeiten
│   │       └── household/page.tsx  # Haushalt verwalten
│   ├── api/
│   │   ├── receipts/
│   │   │   ├── route.ts            # GET/POST receipts
│   │   │   ├── [id]/route.ts       # GET/PUT/DELETE receipt
│   │   │   └── scan/route.ts       # POST: AI Processing
│   │   ├── analytics/
│   │   │   ├── summary/route.ts    # Monatliche Summaries
│   │   │   └── prices/route.ts     # Preis-Tracking Daten
│   │   ├── settlements/
│   │   │   └── route.ts            # Settlement-Berechnungen
│   │   └── products/
│   │       └── search/route.ts     # Autocomplete
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                         # shadcn/ui (bereits vorhanden)
│   ├── receipt/
│   │   ├── ReceiptScanner.tsx      # Kamera + Upload
│   │   ├── ReceiptEditor.tsx       # AI-Ergebnis editieren
│   │   ├── ReceiptCard.tsx         # List-Item
│   │   └── ReceiptDetail.tsx       # Vollansicht
│   ├── analytics/
│   │   ├── SpendingSummary.tsx     # Monatliche Übersicht
│   │   ├── CategoryChart.tsx       # Pie/Bar Chart
│   │   └── PriceChart.tsx          # Preisverlauf
│   ├── settlement/
│   │   ├── SettlementSummary.tsx
│   │   └── SettlementCard.tsx
│   ├── household/
│   │   ├── HouseholdSetup.tsx
│   │   └── MemberInvite.tsx
│   └── layout/
│       ├── BottomNav.tsx           # Mobile Navigation
│       ├── Header.tsx
│       └── LoadingState.tsx
├── lib/
│   ├── supabase.ts                 # (bereits vorhanden)
│   ├── supabase-server.ts          # (bereits vorhanden)
│   ├── gemini.ts                   # Gemini API Client
│   ├── receipt-parser.ts           # AI Response Parsing
│   └── utils.ts                    # (bereits vorhanden)
├── hooks/
│   ├── use-mobile.tsx              # (bereits vorhanden)
│   ├── use-toast.ts                # (bereits vorhanden)
│   ├── useReceipts.ts              # Receipt CRUD Hooks
│   ├── useAnalytics.ts             # Analytics Queries
│   └── useHousehold.ts             # Household Management
└── types/
    ├── database.ts                 # Supabase Generated Types
    ├── receipt.ts                  # Receipt Domain Types
    └── analytics.ts                # Analytics Types
```

---

## 5. Phased Roadmap

### Phase 0: Foundation (1-2 Wochen)
**Ziel:** Technisches Fundament

| Task | Details |
|------|---------|
| Auth Setup | Supabase Auth mit Email/PW + Magic Link |
| DB Migration | PROJ-1 Schema auf Supabase deployen |
| Project Setup | TypeScript Types generieren, ENV vars |
| Basic Layout | Mobile-First Shell mit Bottom-Nav |

**Deliverable:** User kann sich registrieren und einloggen

---

### Phase 1: MVP Core (3-4 Wochen)
**Ziel:** Kern-Funktionalität

| Sprint | Features |
|--------|----------|
| **1.1** | Haushalt erstellen/beitreten |
| **1.2** | Receipt Scanner (Kamera-Integration) |
| **1.3** | Gemini AI Integration (OCR + Parsing) |
| **1.4** | Receipt Editor UI (Korrektur-Flow) |
| **1.5** | Receipt-Liste und Detail-Ansicht |

**Deliverable:** User kann Kassenbon fotografieren → AI extrahiert → User korrigiert → Speichern

---

### Phase 2: Analytics & Settlement (2-3 Wochen)
**Ziel:** Mehrwert aus Daten

| Sprint | Features |
|--------|----------|
| **2.1** | Dashboard mit Monats-Übersicht |
| **2.2** | Kategorie-Verteilung (Charts) |
| **2.3** | Settlement-Berechnung |
| **2.4** | Settlement UI + "Erledigt" markieren |

**Deliverable:** User sieht Ausgaben-Analytics + Settlement-Übersicht

---

### Phase 3: Intelligence (2 Wochen)
**Ziel:** Smart Features

| Sprint | Features |
|--------|----------|
| **3.1** | Preis-Tracking pro Produkt |
| **3.2** | "Günstigster Store" Anzeige |
| **3.3** | Basic Shopping Insights ("Du kaufst X oft") |

**Deliverable:** User bekommt proaktive Insights

---

### Phase 4: Polish & PWA (1-2 Wochen)
**Ziel:** Production-Ready

| Task | Details |
|------|---------|
| PWA Manifest | Install-Prompt, Icons, Splash |
| Performance | Lazy Loading, Image Optimization |
| Error Handling | Graceful Degradation, Retry-Logic |
| Onboarding | Welcome-Flow, Tooltips |

**Deliverable:** Installierbare PWA, bereit für Family-Beta

---

### V1 Roadmap (nach MVP)

| Feature | Beschreibung |
|---------|--------------|
| Shopping-Listen | Kollaborative Listen mit Household |
| Offline-Modus | Receipt-Fotos queuen, Background Sync |
| Push Notifications | "Anna hat einen Einkauf hinzugefügt" |
| Recurring Items | "Du kaufst Milch alle 5 Tage" |
| Budget-Alerts | "Du hast 80% des Monatsbudgets erreicht" |

### V2 Roadmap (Zukunft)

| Feature | Beschreibung |
|---------|--------------|
| Apple/Google Pay Export | Automatischer Import von Transaktionen |
| Multi-Currency | Urlaubs-Ausgaben |
| Meal Planning Integration | Rezepte → Shopping Liste |
| Carbon Footprint | CO2-Bilanz der Einkäufe |
| Price Alerts | "Hafermilch ist bei LIDL im Angebot" |

---

## 6. Risiken & Mitigations

### Risiko 1: AI-Extraktion ungenau (HOCH)

| Aspekt | Details |
|--------|---------|
| **Problem** | Gemini erkennt Kassenbons nicht zuverlässig |
| **Impact** | User-Frust, manueller Aufwand |
| **Wahrscheinlichkeit** | Mittel-Hoch (deutsche Kassenbons variieren stark) |
| **Mitigation** | |
| → | Robuste Korrektur-UI als First-Class Feature |
| → | AI-Prompt iterativ verbessern mit echten Bons |
| → | Konfidenz-Score anzeigen (User weiß, wo prüfen) |
| → | Fallback: Manuelle Eingabe immer möglich |
| → | User-Feedback zu AI-Fehlern sammeln |

### Risiko 2: Schlechte Foto-Qualität (MITTEL)

| Aspekt | Details |
|--------|---------|
| **Problem** | Unscharfe/dunkle Fotos führen zu AI-Fehlern |
| **Impact** | Extraktion schlägt fehl |
| **Wahrscheinlichkeit** | Mittel |
| **Mitigation** | |
| → | Kamera-Preview mit Hinweisen ("Mehr Licht", "Schärfer") |
| → | Auto-Crop auf Kassenbon (wenn möglich) |
| → | Retry-Option nach Fehlschlag |
| → | Galerie-Import für bessere Kontrolle |

### Risiko 3: Komplexe Settlement-Logik (MITTEL)

| Aspekt | Details |
|--------|---------|
| **Problem** | Edge Cases bei Ausgleichszahlungen (3+ Personen) |
| **Impact** | Falsche Berechnungen → Vertrauensverlust |
| **Wahrscheinlichkeit** | Niedrig (2-4 Personen meist einfach) |
| **Mitigation** | |
| → | MVP: Nur 50/50 Split (gleiche Anteile) |
| → | Transparente Berechnung anzeigen |
| → | Unit Tests für Settlement-Algorithmus |
| → | V1: Custom Splits (70/30 etc.) |

### Risiko 4: PWA-Limitierungen auf iOS (MITTEL)

| Aspekt | Details |
|--------|---------|
| **Problem** | iOS PWAs haben Einschränkungen (kein Push, Storage Limits) |
| **Impact** | Reduced Experience auf iPhone |
| **Wahrscheinlichkeit** | Hoch (bekannte iOS-Limitation) |
| **Mitigation** | |
| → | MVP: Kein Push, daher kein Problem |
| → | Storage: Bilder in Supabase, nicht lokal |
| → | Langfristig: Native Wrapper (Capacitor) für App Store |

### Risiko 5: Datenschutz / GDPR (NIEDRIG-MITTEL)

| Aspekt | Details |
|--------|---------|
| **Problem** | Kassenbon-Daten sind sensibel |
| **Impact** | Rechtliche Probleme, User-Bedenken |
| **Wahrscheinlichkeit** | Niedrig (Family-Use-Case) |
| **Mitigation** | |
| → | Alle Daten in EU (Supabase EU-Region) |
| → | Daten nur innerhalb Household sichtbar (RLS) |
| → | Bilder nach X Tagen löschbar |
| → | Keine Weitergabe an Dritte |
| → | Bei Public Launch: GDPR-Compliance prüfen |

### Risiko 6: Gemini API Kosten (NIEDRIG)

| Aspekt | Details |
|--------|---------|
| **Problem** | Kosten bei vielen API-Calls |
| **Impact** | Unerwartete Kosten |
| **Wahrscheinlichkeit** | Niedrig (Family-Use niedrig Volume) |
| **Mitigation** | |
| → | Gemini Flash 1.5 ist kostengünstig |
| → | Rate Limiting pro User (z.B. 50 Scans/Monat) |
| → | Monitoring einrichten |
| → | Bei Skalierung: Caching ähnlicher Bons |

---

## 7. Success Metrics (MVP)

| Metrik | Ziel | Messung |
|--------|------|---------|
| **Receipt Scan Success Rate** | >80% korrekte AI-Extraktion | AI-Konfidenz + User-Edits tracken |
| **Time to First Receipt** | <3 Min nach Signup | Analytics Event |
| **Weekly Active Users** | 100% des Haushalts | Login-Frequency |
| **Receipts pro Woche** | 3-5 pro Haushalt | DB Query |
| **Settlement Usage** | 1x pro Monat | Feature Usage |
| **User Satisfaction** | >4/5 Sterne | In-App Feedback |

---

## 8. Feature-Aufteilung für Development

Basierend auf dem MVP-Plan schlage ich folgende Feature-Specs vor:

| Feature-ID | Name | Abhängigkeit |
|------------|------|--------------|
| PROJ-1 | Database Schema | - (bereits vorhanden) |
| PROJ-2 | User Authentication | PROJ-1 |
| PROJ-3 | Household Management | PROJ-1, PROJ-2 |
| PROJ-4 | Receipt Scanner & AI | PROJ-1, PROJ-2, PROJ-3 |
| PROJ-5 | Receipt Editor UI | PROJ-4 |
| PROJ-6 | Receipt List & Detail | PROJ-4 |
| PROJ-7 | Dashboard & Analytics | PROJ-6 |
| PROJ-8 | Household Settlement | PROJ-6 |
| PROJ-9 | Preis-Tracking | PROJ-6 |
| PROJ-10 | Shopping Insights | PROJ-6, PROJ-9 |
| PROJ-11 | PWA Setup | Alle |

---

## Nächste Schritte

1. **User Review** dieses Plans
2. **Feature-Specs erstellen** für PROJ-2 bis PROJ-11
3. **Solution Architect** für detailliertes API-Design
4. **Development starten** mit Phase 0 (Foundation)

---

*Erstellt: Januar 2025*
*Status: Zur Review*
