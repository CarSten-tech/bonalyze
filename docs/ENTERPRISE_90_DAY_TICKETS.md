# Bonalyze Enterprise 90-Tage Ticket-Backlog

Referenz: `docs/ENTERPRISE_90_DAY_PLAN.md`  
Zeitraum: 18.02.2026 bis 19.05.2026  
Schätzung: PT = Personentage

## Rahmen

- Prioritäten: `P0` kritisch, `P1` hoch, `P2` mittel
- Ticket-IDs sind Vorschläge für Jira (können 1:1 übernommen werden)
- DoD gilt immer inkl. Code-Review, grünem CI und aktualisierter Doku

## Sprint 1 (18.02.-03.03.) - Build/Release Stabilität

| ID | Prio | PT | Ticket | DoD |
|---|---|---:|---|---|
| ENT-001 | P0 | 1 | Build-Typefehler Camera/OpenCV fixen | `npm run build` lokal und in CI grün, kein neuer TS-Fehler |
| ENT-002 | P0 | 1 | CI Pipeline Gates definieren (`lint`,`test`,`build`) | Pipeline blockt Merges bei Fehlern, Branch Protection aktiv |
| ENT-003 | P1 | 1 | Release-Checkliste als `docs/RELEASE_CHECKLIST.md` | Checkliste versioniert, bei erstem Release verwendet |
| ENT-004 | P1 | 2 | Next.js Middleware→Proxy Migrations-Task vorbereiten | Tech-Decision dokumentiert, Migrationsaufwand geschätzt |
| ENT-005 | P1 | 2 | E2E Smoke in CI einhängen | Smoke-Job läuft stabil in CI mit reproduzierbarem Setup |

## Sprint 2 (04.03.-17.03.) - Security Hardening (Alexa/API)

| ID | Prio | PT | Ticket | DoD |
|---|---|---:|---|---|
| ENT-006 | P0 | 2 | Alexa Signaturprüfung aktivieren | Unsignierte Requests werden abgelehnt, validierte akzeptiert |
| ENT-007 | P0 | 1 | Skill-ID Mismatch strikt blockieren | Falsche Skill-ID liefert definierte 4xx/200-Alexa-Fallback-Policy |
| ENT-008 | P0 | 2 | Sensible Request-Logs redigieren | Keine Rohpayloads/Secrets mehr in Prod-Logs |
| ENT-009 | P1 | 2 | Einheitliche AuthZ-Guards für API-Routes | Alle sensiblen Routes mit konsistentem Guard-Muster |
| ENT-010 | P1 | 2 | API Payload-Limits + Body-Guards | Zu große/unerwartete Payloads werden sauber abgewiesen |

## Sprint 3 (18.03.-31.03.) - Skalierung Basis (Rate-Limit/Cache)

| ID | Prio | PT | Ticket | DoD |
|---|---|---:|---|---|
| ENT-011 | P0 | 3 | Distributed Rate Limiter einführen (Redis/Upstash) | In-Memory Limiter ersetzt, funktioniert über mehrere Instanzen |
| ENT-012 | P1 | 2 | `isRateLimited` Adapter + Fallback-Strategie | Klarer Provider-Adapter, Fallback dokumentiert |
| ENT-013 | P1 | 3 | Server-Cache auf shared Store umstellen | Food-Search Cache nicht mehr pro Instanz isoliert |
| ENT-014 | P1 | 1 | Cache-Key/TTL Policy definieren | Einheitliche TTL-Matrix dokumentiert und umgesetzt |

## Sprint 4 (01.04.-14.04.) - Observability + DB Hardening

| ID | Prio | PT | Ticket | DoD |
|---|---|---:|---|---|
| ENT-015 | P0 | 2 | Sentry/Error Tracking integrieren | Server/Client Errors sichtbar, Release-Tags gesetzt |
| ENT-016 | P1 | 2 | Strukturierte Logs mit Correlation ID | Request-übergreifende Nachverfolgung im Log möglich |
| ENT-017 | P1 | 2 | Alerting für P0-Pfade (Auth, Scan, Settlement) | Alerts bei Schwellwertverletzung aktiv |
| ENT-018 | P0 | 2 | RPC `get_semantic_matches` hardenen (Membership/Search Path) | Security Review bestanden, Negativtests vorhanden |
| ENT-019 | P1 | 1 | Incident Runbook (Top 5 Failure Modes) | Runbook in `docs/` vorhanden und teamweit abgestimmt |

## Sprint 5 (15.04.-28.04.) - QA Ausbau kritische Flows

| ID | Prio | PT | Ticket | DoD |
|---|---|---:|---|---|
| ENT-020 | P0 | 3 | E2E Auth Flow (Signup/Login/Redirect) | Stabiler Test ohne Flakes über mehrere Runs |
| ENT-021 | P0 | 3 | E2E Receipt Capture + Save | Happy Path inkl. Persistenz validiert |
| ENT-022 | P1 | 2 | E2E Settlement Create + History | Abrechnung und Historie zuverlässig testbar |
| ENT-023 | P1 | 2 | E2E Offers Filter + Semantic Match Smoke | Angebotsfluss inkl. RPC-Response verifiziert |
| ENT-024 | P1 | 1 | Testdaten-Setup/Teardown standardisieren | Deterministische Tests ohne Seiteneffekte |

## Sprint 6 (29.04.-12.05.) - Wartbarkeit/Standardisierung

| ID | Prio | PT | Ticket | DoD |
|---|---|---:|---|---|
| ENT-025 | P1 | 3 | `nutrition.ts` in Domain-Services aufteilen | Datei zerlegt, keine Verhaltensänderung, Tests grün |
| ENT-026 | P1 | 3 | `camera-view.tsx` entkoppeln (Processing/UI Hooks) | Komplexität reduziert, Build/Test grün |
| ENT-027 | P1 | 3 | Alexa Service typisieren (`any` abbauen) | Kein blanket `any`, Typabdeckung für Kernpfade |
| ENT-028 | P1 | 2 | Zod-Validierung für alle Actions/API vereinheitlichen | Standardisierte Fehlerstruktur in allen Endpunkten |
| ENT-029 | P2 | 1 | Migrationsdoku konsolidieren (`migrations` vs `supabase/migrations`) | Ein klarer offizieller Pfad dokumentiert |

## Sprint 7 (13.05.-19.05.) - Enterprise Add-ons (Could)

| ID | Prio | PT | Ticket | DoD |
|---|---|---:|---|---|
| ENT-030 | P2 | 3 | Audit Log MVP (create/update/delete Kernobjekte) | Nachvollziehbare Änderungsereignisse abrufbar |
| ENT-031 | P2 | 3 | Rollenmodell schärfen (Owner/Admin/Member Rechte) | Rechte-Matrix umgesetzt und dokumentiert |
| ENT-032 | P2 | 2 | Notification Retry Queue/DLQ Konzept + MVP | Fehlzustellungen sind sichtbar und retrybar |
| ENT-033 | P2 | 2 | AI Quality Metrics (Confidence/Match-Qualität Dashboard) | Metriken für Scan/Matching abrufbar |

## Gesamtaufwand (Richtwert)

- Sprint 1: 7 PT
- Sprint 2: 9 PT
- Sprint 3: 9 PT
- Sprint 4: 9 PT
- Sprint 5: 11 PT
- Sprint 6: 12 PT
- Sprint 7: 10 PT
- Gesamt: 67 PT

## Abhängigkeiten (kritisch)

1. `ENT-001` vor allen weiteren CI-Härtungen
2. `ENT-006` und `ENT-007` vor Alexa-Produktivbetrieb
3. `ENT-011` vor Lasttests/Skalierungsabnahme
4. `ENT-018` vor Freigabe semantischer Offer-Matches für breite Nutzung
5. `ENT-020` bis `ENT-024` vor finalem Enterprise-Go/No-Go

## Go/No-Go Kriterien zum 19.05.2026

1. Alle `P0` Tickets abgeschlossen
2. CI über mindestens 10 aufeinanderfolgende Runs stabil
3. Keine offenen Security Findings mit hoher Kritikalität
4. Kritische Flows durch E2E abgedeckt und reproduzierbar grün
