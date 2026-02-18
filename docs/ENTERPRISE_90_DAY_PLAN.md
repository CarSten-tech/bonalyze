# Bonalyze Enterprise 90-Tage-Plan

Zeitraum: 18. Februar 2026 bis 19. Mai 2026

## Zielbild bis 19.05.2026

- `build`, `lint`, `test`, `e2e-smoke` sind in CI verpflichtend grün.
- Sicherheitslücken sind geschlossen (Alexa-Webhook-Hardening, API-Guards, RPC-Hardening).
- Betriebsfähigkeit ist auf Enterprise-Basis aufgebaut (Monitoring, Alerting, Runbook, skalierbares Rate-Limit/Cache).

## 1. Must (Tag 1-30)

1. Build/Release-Stabilität herstellen  
   Aufwand: M  
   Ergebnis: Build-Fehler beheben, CI-Gates aktivieren, Release nur bei grüner Pipeline.

2. Security-Hardening Alexa/API  
   Aufwand: M  
   Ergebnis: Signaturprüfung aktiv, Skill-ID strikt validiert, sensibles Request-Logging reduziert.

3. Verteiltes Rate-Limit + Cache  
   Aufwand: M-L  
   Ergebnis: In-Memory-Mechanismen durch shared Store (z. B. Redis/Upstash) ersetzen.

4. Observability Minimum  
   Aufwand: M  
   Ergebnis: Error-Tracking (Sentry), Basis-Metriken, Alerting auf kritische Fehler.

5. DB-Hardening für semantische RPCs  
   Aufwand: M  
   Ergebnis: `SECURITY DEFINER` sauber abgesichert (Membership-Check, Search-Path-Härtung, Zugriffstests).

## 2. Should (Tag 31-60)

1. Testausbau auf kritische Flows  
   Aufwand: L  
   Ergebnis: E2E für Login, Receipt-Scan, Settlement, Offers; Playwright mit stabilem `webServer` in CI.

2. API-/Action-Standardisierung  
   Aufwand: M  
   Ergebnis: Einheitliche Zod-Validierung, Payload-Limits, konsistente Fehlercodes.

3. Refactor Hotspots  
   Aufwand: L  
   Ergebnis: große Dateien aufsplitten (z. B. Nutrition, Camera, Alexa-Service), klarere Service-Grenzen.

4. Migrations- und Betriebsdoku konsolidieren  
   Aufwand: S-M  
   Ergebnis: einheitlicher Migrationspfad (keine widersprüchlichen Ordnungen), klare Onboarding-Doku.

## 3. Could (Tag 61-90)

1. Audit Log + Rollenfeingranularität  
   Aufwand: L  
   Ergebnis: revisionssichere Änderungen und Enterprise-Admin-Fähigkeiten.

2. Notification-Queue mit Retry/DLQ  
   Aufwand: M-L  
   Ergebnis: robustere Zustellung statt Best-Effort.

3. AI-Qualitätslayer  
   Aufwand: M  
   Ergebnis: Match-/Scan-Confidence-Tracking, erklärbare Vorschläge, Qualitätsmetriken pro Flow.

## Empfohlene Reihenfolge (Sprint-Schnitt)

1. Sprint 1-2 (18.02.-17.03.): Must 1-3
2. Sprint 3-4 (18.03.-14.04.): Must 4-5 + Should 1 Start
3. Sprint 5-6 (15.04.-12.05.): Should 1-4
4. Sprint 7 (13.05.-19.05.): Could 1-3 (so weit Kapazität reicht)

## Abnahmekriterien am Ende

1. Keine offenen P0 Security Findings.
2. Pipeline stabil über mehrere Runs (`lint+test+build+e2e`).
3. Produktionsfehler mit Alerting innerhalb Minuten sichtbar.
4. Kritische User-Flows durch automatisierte Tests abgedeckt.
