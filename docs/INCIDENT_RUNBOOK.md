# Incident Runbook (Top 5 Failure Modes)

Stand: 2026-02-18

## Ziel

Schnelle Erstreaktion bei Produktionsstörungen mit klarer Reihenfolge:

1. Erkennen
2. Eindämmen
3. Beheben
4. Verifizieren
5. Nachbereitung

## Grundregeln

1. Incident mit Severity einstufen (`SEV-1` kritisch, `SEV-2` hoch, `SEV-3` mittel).
2. `x-correlation-id` aus Fehler/Response sichern.
3. Betroffene Route und Zeitraum dokumentieren.
4. Workaround vor Root-Cause, wenn User Impact akut ist.

## Failure Mode 1: Auth Callback Ausfall

Symptome:

- Login-/Magic-Link-Flow endet auf `/login?error=auth_callback_failed`
- Zunahme von Fehlern auf `auth/callback`

Sofortmaßnahmen:

1. Prüfen, ob Supabase Auth erreichbar ist.
2. Prüfen, ob `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` korrekt gesetzt sind.
3. Logs für `auth/callback` mit `correlation_id` prüfen.

Eindämmung:

- Kommunikationshinweis an User (temporärer Login-Fehler).
- Falls möglich temporär alternatives Login-Verfahren priorisieren.

## Failure Mode 2: Receipt Scan 5xx / Upload-Fehler

Symptome:

- `/api/receipts/scan` liefert 500/`UPLOAD_FAILED`/`URL_FAILED`
- Scan-Flow bricht vor Speichern ab

Sofortmaßnahmen:

1. Supabase Storage Status prüfen.
2. Gemini API Key und Provider-Status prüfen.
3. Fehler mit `correlation_id` in Logs und Alerts nachverfolgen.

Eindämmung:

- User auf manuelle Bon-Erfassung umleiten.
- Falls notwendig Upload-Limits temporär konservativer setzen.

## Failure Mode 3: Settlement API Ausfall

Symptome:

- `/api/settlements` liefert 500
- Historie leer trotz vorhandener Daten

Sofortmaßnahmen:

1. DB-Connectivity und kürzlich deployte Migrationen prüfen.
2. Query-/Policy-Fehler in Logs mit `correlation_id` prüfen.
3. Prüfen, ob RLS/Household Membership korrekt greift.

Eindämmung:

- Settlement-Erstellung temporär deaktivieren (read-only fallback).
- UI-Hinweis ausrollen.

## Failure Mode 4: Redis/Upstash Ausfall (Cache/Rate-Limit)

Symptome:

- Warnungen: Fallback auf In-Memory für Cache/Rate-Limit
- Inkonsistente Limits über mehrere Instanzen

Sofortmaßnahmen:

1. Upstash Erreichbarkeit und Token prüfen.
2. Prüfen, ob `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` gesetzt sind.
3. Fallback-Warnungen im Log auf Häufung prüfen.

Eindämmung:

- Betrieb mit In-Memory Fallback fortsetzen (degradierter Modus).
- Bei hoher Last Limits konservativer konfigurieren.

## Failure Mode 5: Semantic Matching liefert Fehler/unerlaubten Zugriff

Symptome:

- Fehler in `get_semantic_matches`
- Zugriff verweigert trotz gültiger Session oder unerwartete Treffer

Sofortmaßnahmen:

1. Migration-Stand für RPC-Hardening prüfen.
2. Household Membership für betroffenen User prüfen.
3. DB-Logs auf `42501` und Funktionsexceptions prüfen.

Eindämmung:

- Semantic Offers temporär ausblenden.
- Fallback auf klassische Text-/Filter-Suche.

## Verifikation nach Fix

1. Kritischer User-Flow in Produktion manuell testen.
2. Smoke E2E starten (`npm run test:e2e:smoke`).
3. Monitoring/Alerts mindestens 30 Minuten beobachten.

## Postmortem (innerhalb 48h)

1. Ursache, Timeline, Impact und Detection Gap dokumentieren.
2. Konkrete Präventionsmaßnahmen mit Owner + Deadline festlegen.
3. Ticket-Link in `docs/ENTERPRISE_90_DAY_TICKETS.md` ergänzen.
