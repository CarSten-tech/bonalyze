# Bonalyze Scraper – Setup-Anleitung

Schritt-für-Schritt-Anleitung, um den Scraper einzurichten, zu testen und in deine Bonalyze-App zu integrieren.

---

## Schritt 1: Repo vorbereiten

Der `scraper/`-Ordner kann entweder ins Bonalyze-Repo als Unterordner oder als eigenes Repo angelegt werden. Eigenes Repo ist sauberer, weil der Scraper unabhängig deployed wird.

```bash
# Option A: Eigenes Repo
mkdir bonalyze-scraper && cd bonalyze-scraper
# Inhalt der ZIP hier entpacken (alles aus scraper/)

# Option B: Als Unterordner im Bonalyze-Repo
cd ~/bonalyze
mkdir scraper
# Inhalt der ZIP hier entpacken
```

---

## Schritt 2: Dependencies installieren

```bash
cd scraper    # (bzw. bonalyze-scraper)
npm install
```

Dann Playwright-Browser installieren. Das braucht ~300MB, da Chromium und Firefox heruntergeladen werden:

```bash
npx playwright install chromium firefox --with-deps
```

> `--with-deps` installiert auch System-Libraries (libglib, libnss, etc.). Auf macOS brauchst du das Flag nicht.

---

## Schritt 3: Supabase-Tabellen anlegen

Die Migration gibt dir das komplette SQL aus. Kopiere es und füge es im Supabase Dashboard ein:

```bash
npm run migrate
```

Das zeigt dir das SQL an. Dann:

1. Öffne dein **Supabase Dashboard** → **SQL Editor**
2. Füge das gesamte SQL ein
3. Klicke **Run**

Das erstellt 5 Tabellen:

| Tabelle | Zweck |
|---------|-------|
| `offers` | Alle gescrapten Angebote mit deutschem Volltext-Index |
| `scrape_events` | Audit-Log (wann wurde was gescrapt, Fehler, AI-Fallback) |
| `circuit_breaker_state` | Persistenter Circuit-Breaker-Status pro Store |
| `html_snapshots` | HTML-Struktur-Fingerprints für Change Detection |
| `scraper_config` | User-Einstellungen (PLZ, Store-Auswahl pro Household) |

---

## Schritt 4: .env konfigurieren

```bash
cp .env.example .env
```

Öffne `.env` und trage mindestens diese Werte ein:

```env
# PFLICHT – gleiche Werte wie in deiner Bonalyze-App
SUPABASE_URL=https://dein-projekt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Deine PLZ
SCRAPE_POSTAL_CODE=41460

# Nur die Stores die du brauchst (schnellerer Test)
SCRAPE_STORES=aldi-sued,lidl,rewe,edeka,penny,kaufland
```

Optional, aber empfohlen:

```env
# AI Self-Healing – Claude springt ein wenn sich die Website ändert
ANTHROPIC_API_KEY=sk-ant-...

# Slack-Benachrichtigungen bei Fehlern
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# API-Key für den Admin-Server (leer = kein Auth)
SCRAPER_API_KEY=ein-geheimes-passwort
```

---

## Schritt 5: Erster Test (Dry-Run)

Ein Dry-Run scrapt die Daten, schreibt aber nichts in die Datenbank. Perfekt zum Testen:

```bash
# Schnelltest: nur 2 Stores, kein DB-Write
npm run scrape -- --dry-run --store aldi-sued,lidl
```

Das dauert ca. 1-2 Minuten (wegen der menschlichen Pausen zwischen den Stores). Du solltest so etwas sehen:

```
[15:30:01] INFO  Scraper gestartet { stores: ['Aldi Süd', 'Lidl'], dryRun: true }
[15:30:15] INFO  Store fertig { store: 'Aldi Süd', count: 47, strategy: 'cheerio' }
[15:30:28] INFO  Store fertig { store: 'Lidl', count: 63, strategy: 'cheerio' }
[15:30:28] INFO  Scraping erfolgreich { stores: 2, offers: 110 }
```

Wenn das funktioniert, kannst du den echten Run machen:

```bash
# Echter Run – schreibt in Supabase
npm run scrape -- --store aldi-sued,lidl
```

---

## Schritt 6: Admin-Dashboard mit Test-Button

Für bequemeres Testen gibt es ein Admin-Dashboard mit grafischer Oberfläche. Starte den Server:

```bash
npm run server
```

Dann öffne im Browser:

```
http://localhost:3100
```

Du siehst ein Dashboard mit:

- **System-Status**: Server, Supabase-Verbindung, Uptime
- **Store-Auswahl**: Klicke die Stores an die du testen willst
- **PLZ-Feld**: Deine PLZ eingeben
- **▶ Jetzt Scrapen**: Startet einen echten Scrape-Lauf
- **Dry-Run**: Scrapt ohne in die DB zu schreiben
- **Live-Fortschritt**: Progressbar + Log zeigt dir in Echtzeit was passiert
- **Ergebnisse**: Tabelle mit Angeboten pro Store, Strategie, Dauer

> **Tipp für schnelle Tests**: Klicke "Schnelltest (2 Stores)" – das wählt nur Aldi Süd und Lidl aus. Dauert ~1-2 Minuten statt 15+ für alle.

---

## Schritt 7: Bonalyze-Integration

Zwei Dateien aus dem Scraper in deine Bonalyze-App kopieren:

```bash
# API Route (Server-Side)
cp scraper/bonalyze-integration/api-offers-route.ts \
   bonalyze/src/app/api/offers/route.ts

# React Query Hooks (Client-Side)
cp scraper/bonalyze-integration/use-offers.ts \
   bonalyze/src/hooks/use-offers.ts
```

Dann kannst du in deinen Komponenten die Hooks nutzen:

```tsx
import { useProductOffers, useTopOffers, useStoreOffers } from "@/hooks/use-offers";

// Einkaufsliste: bestes Angebot für ein Produkt finden
function ShoppingItem({ name }: { name: string }) {
  const { data } = useProductOffers(name, "41460");
  const best = data?.offers[0];

  return (
    <div className="flex justify-between">
      <span>{name}</span>
      {best && (
        <span className="text-green-600 text-sm">
          {best.price}€ bei {best.store}
          {best.discount_percent && ` (-${best.discount_percent}%)`}
        </span>
      )}
    </div>
  );
}

// Dashboard: Top-Angebote der Woche
function TopDeals() {
  const { data } = useTopOffers("41460", 10);

  return (
    <div>
      <h2>Top Angebote</h2>
      {data?.offers.map(o => (
        <div key={o.id}>
          <strong>{o.product_name}</strong> – {o.price}€
          {o.discount_percent && <span> (-{o.discount_percent}%)</span>}
          <span className="text-muted"> bei {o.store}</span>
        </div>
      ))}
    </div>
  );
}

// Store-Seite: alle Angebote eines Stores
function StoreOffers({ store }: { store: string }) {
  const { data, isLoading } = useStoreOffers(store, "41460");

  if (isLoading) return <div>Laden...</div>;
  return <div>{data?.total} Angebote bei {store}</div>;
}
```

---

## Schritt 8: Automatisierung einrichten

### Option A: GitHub Actions (empfohlen – zero maintenance)

1. Pushe den `scraper/`-Ordner (oder das eigene Repo) zu GitHub

2. Gehe zu **Settings → Secrets and variables → Actions → New repository secret** und lege an:

   | Secret | Wert |
   |--------|------|
   | `SUPABASE_URL` | `https://dein-projekt.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Dein Service Role Key |
   | `SCRAPE_POSTAL_CODE` | `41460` |
   | `ANTHROPIC_API_KEY` | Dein Anthropic Key (optional) |
   | `SLACK_WEBHOOK_URL` | Dein Slack Webhook (optional) |

3. Die Action läuft automatisch jeden **Montag und Donnerstag um 06:00 UTC** (= 07:00 MEZ).

4. **Sofort testen**: Gehe zu **Actions → Scrape Supermarkt-Angebote → Run workflow**. Dort kannst du Stores auswählen und Dry-Run ankreuzen.

### Option B: Docker (eigener Server mit API)

Falls du einen VPS hast (Hetzner, DigitalOcean, etc.):

```bash
cd scraper
cp .env.example .env   # bearbeiten
docker compose up -d
```

Der Container startet den Express-Server mit eingebautem Cron. Das Admin-Dashboard ist dann unter `http://deine-ip:3100` erreichbar.

---

## Zusammenfassung: Was muss ich tun?

| # | Was | Wo | Dauer |
|---|-----|----|-------|
| 1 | ZIP entpacken, `npm install` | Terminal | 2 Min |
| 2 | Playwright installieren | Terminal | 3 Min |
| 3 | SQL im Supabase Dashboard ausführen | Browser | 2 Min |
| 4 | `.env` mit Supabase-Credentials füllen | Editor | 1 Min |
| 5 | Dry-Run testen | Terminal oder Dashboard | 2 Min |
| 6 | Echten Run testen | Dashboard (`localhost:3100`) | 2 Min |
| 7 | 2 Dateien in Bonalyze kopieren | Terminal | 1 Min |
| 8 | GitHub Secrets setzen | GitHub | 3 Min |

**Total: ~15 Minuten** bis alles läuft.

---

## Troubleshooting

**"Supabase nicht erreichbar"**
→ Prüfe `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` in der `.env`. Der Service Role Key ist nicht der Anon Key.

**"0 Angebote gescrapt"**
→ aktionspreis.de könnte dich blockieren. Versuche einen anderen `SCRAPE_POSTAL_CODE` oder aktiviere den Proxy (`PROXY_URL` in `.env`). Oder warte 1 Stunde (Circuit Breaker Reset).

**"Playwright-Browser nicht gefunden"**
→ `npx playwright install chromium firefox --with-deps` nochmal ausführen.

**"AI Fallback aktiv"**
→ Das ist kein Fehler! Es bedeutet, dass sich die HTML-Struktur geändert hat und Claude die Daten extrahiert. Funktioniert automatisch, braucht aber einen `ANTHROPIC_API_KEY`. Kostet ca. 0.01-0.03€ pro Aufruf.

**Admin-Dashboard zeigt "Offline"**
→ Server läuft nicht. Starte ihn mit `npm run server`.

**GitHub Action schlägt fehl**
→ Prüfe unter Actions → den fehlgeschlagenen Run → Logs. Meistens fehlt ein Secret oder Playwright konnte nicht installiert werden.
