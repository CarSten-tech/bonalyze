# Bonalyze

> KI-gestützte Kassenbon- und Haushaltsausgaben-Intelligence-App

## Vision

Bonalyze macht Haushaltsausgaben transparent durch automatische Kassenbon-Erfassung mit KI. Statt manueller Budgetierung scannt der User einfach den Bon - die App erledigt den Rest: Preis-Tracking, Ausgaben-Analytics, faire Haushalts-Settlements und smarte Shopping-Insights.

---

## Aktueller Status

**Phase 2: Analytics & Settlement** - MVP Core komplett, Analytics erweitern als nächstes

### Was funktioniert bereits:

- ✅ User Registration & Login (Email/Password + Magic Link)
- ✅ Passwort-Reset Flow
- ✅ Protected Routes (Middleware)
- ✅ Household erstellen & verwalten
- ✅ Mitglieder einladen (Invite-Links)
- ✅ Household-Switcher (Multi-Haushalt)
- ✅ Kassenbons manuell erfassen (Store, Datum, Produkte, Preise)
- ✅ **KI-Kassenbon-Scanner** (Gemini Flash 1.5)
- ✅ Kassenbon-Liste & Detail-Ansicht
- ✅ Basic Dashboard mit Ausgaben-Statistik

---

## Tech Stack

### Frontend

- **Framework:** Next.js 16 (App Router)
- **Sprache:** TypeScript
- **Styling:** Tailwind CSS
- **UI Library:** shadcn/ui (Mobile-First PWA)

### Backend

- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth (Email/PW + Magic Link)
- **Storage:** Supabase Storage (Receipt Images)
- **AI:** Google Gemini Flash 1.5 (Receipt OCR)

### Deployment

- **Hosting:** Vercel
- **PWA:** next-pwa (später)

---

## Features Roadmap

### Phase 0: Foundation ✅

- [PROJ-1] Database Schema → ✅ Done → [Spec](features/PROJ-1-database-schema.md)
- [PROJ-2] User Authentication → ✅ Done → [Spec](features/PROJ-2-user-authentication.md)
- [PROJ-3] Household Management → ✅ Done → [Spec](features/PROJ-3-household-management.md)

### Phase 1: MVP Core ✅

- [PROJ-4] Receipt Scanner & AI → ✅ Done → [Spec](features/PROJ-4-receipt-scanner-ai.md)
- [PROJ-5] Receipt Editor UI → ✅ Done → [Spec](features/PROJ-5-receipt-editor-ui.md)
- [PROJ-6] Receipt List & Detail → ✅ Done → [Spec](features/PROJ-6-receipt-list-detail.md)

### Phase 2: Analytics & Settlement 🟢

- [PROJ-7] Dashboard & Analytics → 🟡 Partial → [Spec](features/PROJ-7-dashboard-analytics.md) ⭐ **NEXT**
- [PROJ-8] Household Settlement → 🔵 Planned → [Spec](features/PROJ-8-household-settlement.md)

### Phase 3: Intelligence

- [PROJ-9] Preis-Tracking → 🔵 Planned → [Spec](features/PROJ-9-price-tracking.md)
- [PROJ-10] Shopping Insights → 🔵 Planned → [Spec](features/PROJ-10-shopping-insights.md)

### Phase 4: Polish

- [PROJ-11] PWA Setup → 🔵 Planned → [Spec](features/PROJ-11-pwa-setup.md)

---

## Status-Legende

- ⚪ Backlog (noch nicht gestartet)
- 🔵 Planned (Requirements geschrieben)
- 🟡 Partial (Teilweise implementiert)
- 🟢 In Development (Wird gebaut)
- ✅ Done (Implementiert + funktioniert)

---

## Core User Flows

### 1. Receipt Scan Flow

```
Foto aufnehmen → AI analysiert → User korrigiert → Speichern
```

### 2. Analytics Flow

```
Dashboard → Monatliche Übersicht → Kategorie-Details → Preis-Tracking
```

### 3. Settlement Flow

```
Zeitraum wählen → Wer schuldet wem → Als erledigt markieren
```

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Embeddings
# Must use models/gemini-embedding-001 with output_dimensionality: 768

```

---

## Key Documents

- [MVP Plan](docs/BONALYZE-MVP-PLAN.md) - Vollständiger Produktplan
- [DB Schema](features/PROJ-1-database-schema.md) - Datenbank-Design

---

## Design Decisions

### Warum Gemini Flash 1.5?

- Schnell und kostengünstig
- Gute Multimodal-Fähigkeiten für Bild-zu-Text
- Niedrige Latenz für Mobile UX

### Warum Online-only MVP?

- Reduziert Komplexität erheblich
- Offline-Sync später mit Background Sync API
- Family-Use-Case hat meist Internet

### Warum Settlement statt Budget?

- User wollen keine Budgets pflegen
- Settlement löst echtes Problem (wer schuldet wem)
- Weniger Friction = höhere Adoption

---

## Folder Structure

```
bonalyze/
├── .claude/
│   └── agents/              ← AI Agents
├── docs/
│   └── BONALYZE-MVP-PLAN.md ← Produktplan
├── features/                ← Feature Specs
├── migrations/              ← SQL Migrations (Supabase)
├── src/
│   ├── app/
│   │   ├── (auth)/          ← Auth Pages (Login, Signup, etc.)
│   │   ├── dashboard/       ← Dashboard & Receipts
│   │   ├── invite/          ← Invite Token Handler
│   │   └── settings/        ← Settings Pages
│   ├── components/
│   │   ├── ui/              ← shadcn/ui
│   │   ├── layout/          ← Header, Navigation
│   │   └── receipts/        ← Receipt Components
│   ├── contexts/            ← React Context (Household)
│   ├── hooks/               ← Custom Hooks
│   ├── lib/                 ← Utilities (Supabase Client)
│   └── types/               ← TypeScript Types
├── public/                  ← Static Assets
├── middleware.ts            ← Route Protection
└── PROJECT_CONTEXT.md       ← Diese Datei
```

---

## Development Workflow

1. **Requirements Engineer** erstellt Feature Spec → User reviewt
2. **Solution Architect** designed API/Components → User approved
3. **Frontend + Backend Devs** implementieren → User testet
4. **QA Engineer** testet gegen Acceptance Criteria
5. **DevOps** deployed → Status: ✅ Done

---

## Next Steps

1. ✅ MVP-Plan erstellt und approved
2. ✅ Feature-Specs für PROJ-2 bis PROJ-11 erstellt
3. ✅ Phase 0 komplett (Auth + Household)
4. ✅ Manuelle Bon-Erfassung implementiert
5. ✅ PROJ-4: Receipt Scanner & AI - Gemini Integration
6. 🎯 **PROJ-7: Dashboard Analytics erweitern** (Charts, Kategorien, Vergleiche)
7. PROJ-8: Household Settlement

---

**Built with Claude Code + AI Agent Team**
