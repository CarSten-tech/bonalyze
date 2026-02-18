# Tech Debt: Next.js Middleware zu Proxy migrieren

Status: geplant  
Datum: 2026-02-18  
Owner: Platform/Frontend

## Kontext

Beim Build erscheint aktuell die Warnung:

- `The "middleware" file convention is deprecated. Please use "proxy" instead.`

Aktuell liegt die Auth-Routenlogik in `src/middleware.ts`.

## Ziel

- Migration auf die neue Next.js-Konvention (`proxy`) ohne Verhaltensänderung.
- Session-Handling mit Supabase bleibt vollständig erhalten.
- Keine Regression bei Protected/Auth Routes.

## Scope

1. Neue Proxy-Datei nach aktueller Next.js 16 Konvention einführen.
2. Routing-Matcher und Redirect-Verhalten 1:1 übernehmen.
3. `src/middleware.ts` ablösen.
4. Smoke-Tests für Login/Protected Routes nachziehen.

## Risiken

- Höchstes Risiko: Cookie-/Session-Handling (Supabase SSR) bei Redirects.
- Matcher-Änderungen können API/Static-Routen unbeabsichtigt beeinflussen.

## Abnahmekriterien

1. Build ohne Middleware-Deprecation-Warnung.
2. Unauthenticated Zugriff auf `/dashboard` wird weiterhin auf `/login` umgeleitet.
3. Authenticated Zugriff auf Auth-Routen (`/login`, `/signup`, …) wird weiterhin auf `/dashboard` umgeleitet.
4. Keine neue Session-Instabilität in manuellen und automatisierten Smoke-Tests.

## Aufwandsschätzung

- Implementierung: 0.5-1 PT
- Test/Verifikation: 0.5 PT
- Gesamt: 1-1.5 PT

## Rollback

- Bei Problemen temporär auf bisherigen Zustand zurück und in separatem Branch neu verproben.
