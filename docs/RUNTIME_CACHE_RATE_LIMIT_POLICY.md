# Runtime Policy: Cache & Rate Limit

Stand: 2026-02-18

## Ziel

Einheitliche, nachvollziehbare Regeln für:

- Cache-Key-Aufbau
- TTL pro Anwendungsfall
- Rate-Limit-Key-Aufbau
- Fallback-Verhalten bei Ausfall von Upstash Redis

## Backend-Auswahl

Die Runtime nutzt standardmäßig:

1. Upstash Redis (wenn `UPSTASH_REDIS_REST_URL` und `UPSTASH_REDIS_REST_TOKEN` gesetzt sind)
2. In-Memory Fallback (wenn Upstash nicht konfiguriert oder temporär nicht erreichbar ist)

Betroffene Module:

- `src/lib/cache.ts`
- `src/lib/rate-limit.ts`

## Key-Präfixe

- Rate Limit: `RATE_LIMIT_KEY_PREFIX` (Default: `bonalyze:rl`)
- Cache: `CACHE_KEY_PREFIX` (Default: `bonalyze:cache`)

## TTL-Matrix (verbindlich)

1. Food Search (`off-search:*`)  
TTL: 10 Minuten  
Begründung: Externe API, häufige Wiederholanfragen, moderat volatile Daten.

2. Combined Nutrition Search (`combined-search:*`)  
TTL: 5 Minuten  
Begründung: Suchanfragen sind repetitiv, Ergebnis soll zeitnah aktualisieren.

3. Barcode Lookup (`off-barcode:*`)  
TTL: 60 Minuten  
Begründung: Produktdaten per Barcode ändern sich selten kurzfristig.

4. Rate Limit Fenster Alexa Link-Code  
Fenster: 60 Sekunden, Limit: 5 Requests  
Begründung: Missbrauchsschutz ohne unnötige UX-Blockade.

5. Rate Limit Fenster Nutrition Search  
Fenster: 60 Sekunden, Limit: 30 Requests pro User  
Begründung: Schutz vor RPC-Abuse bei weiterhin normaler Nutzung.

## Fallback-Strategie

1. Primärer Zugriff auf Upstash.
2. Bei Upstash-Fehler: einmalige Warnung im Log.
3. Nahtloser Fallback auf In-Memory Store.
4. Keine harte Betriebsunterbrechung für User-Flows.

Hinweis: In-Memory Fallback ist nicht instanzübergreifend. Für echte horizontale Skalierung muss Upstash verfügbar sein.

## Betriebscheckliste

1. In Produktion immer beide Upstash-Umgebungsvariablen gesetzt.
2. Prefixe je Umgebung eindeutig (z. B. `prod`, `staging`).
3. Logs auf wiederholte Fallback-Warnungen überwachen.
4. TTL-Änderungen nur per PR mit kurzer Last-/Kostenabschätzung.
