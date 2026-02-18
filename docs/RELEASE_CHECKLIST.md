# Release Checklist (Bonalyze)

Letzte Aktualisierung: 2026-02-18

## 1. Scope & Risiko

- [ ] Scope des Releases dokumentiert (Features, Fixes, bekannte Einschränkungen)
- [ ] Risiko-Level festgelegt (`low` / `medium` / `high`)
- [ ] Rollback-Strategie für dieses Release benannt

## 2. Code-Qualität

- [ ] Alle geplanten PRs gemerged und reviewt
- [ ] CI ist grün (`lint`, `test`, `build`)
- [ ] Keine offenen `P0`/`P1` Bugs für Release-Scope

## 3. Datenbank & Migrationen

- [ ] Relevante Migrationen identifiziert
- [ ] Migrationen in Staging erfolgreich ausgeführt
- [ ] Backward-Compatibility geprüft (App + DB)
- [ ] Rollback/Hotfix-Plan für Migrationen dokumentiert

## 4. Sicherheit

- [ ] Security-kritische Pfade getestet (Auth, API-Zugriffe, RLS)
- [ ] Keine sensiblen Secrets im Logging
- [ ] Neue Umgebungsvariablen dokumentiert und gesetzt

## 5. Betriebsfähigkeit

- [ ] Monitoring/Alerting für neue Funktionen vorhanden
- [ ] Dashboards/Logs für Incident-Triage geprüft
- [ ] On-call/Verantwortliche für Release-Fenster benannt

## 6. Deploy

- [ ] Release-Zeitfenster bestätigt
- [ ] Deployment erfolgreich
- [ ] Health-Checks direkt nach Deploy ausgeführt

## 7. Post-Deploy Validierung

- [ ] Smoke-Tests auf Produktion/Staging durchgeführt
- [ ] Kritische User-Flows manuell geprüft:
  - [ ] Login/Session
  - [ ] Receipt Scan & Save
  - [ ] Dashboard/Offers
  - [ ] Settlement
- [ ] Fehlerquote/Latenz 30-60 Minuten beobachtet

## 8. Kommunikation

- [ ] Changelog/Release Notes veröffentlicht
- [ ] Stakeholder informiert
- [ ] Follow-up Tasks und bekannte Restpunkte erfasst
