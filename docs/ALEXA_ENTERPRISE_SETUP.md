# Alexa Enterprise Setup (Bonalyze Einkaufsliste)

Diese Anleitung richtet den eigenen Alexa Skill gegen eure App ein.

## 1. Server vorbereiten

1. Migration ausrollen:
- `migrations/018_alexa_shopping_integration.sql`

2. Umgebungsvariablen setzen:
- `ALEXA_SKILL_ID=amzn1.ask.skill.<deine-skill-id>`
- `ALEXA_VERIFY_SIGNATURE=true` (Standard ist Verifikation aktiv; nur fuer lokale Debug-Zwecke auf `false` setzen)
- `ALEXA_LINK_CODE_SALT=<lange-zufaellige-secret-zeichenfolge>`

3. Endpoint deployen:
- `POST /api/alexa`
- `GET/POST /api/alexa/link-code`

## 2. Amazon Developer Console

1. Skill erstellen:
- Typ: `Custom`
- Sprache: `German (DE)`

2. Invocation Name setzen:
- Beispiel: `bonalyze liste`

3. Interaction Model importieren:
- Datei: `docs/alexa/interaction-model.de-DE.json`

4. Endpoint konfigurieren:
- HTTPS Endpoint: `https://<deine-domain>/api/alexa`
- SSL Zertifikat: `My development endpoint has a certificate from a trusted CA`

5. Account Linking:
- Hier **nicht erforderlich**, weil Bonalyze mit One-Time-Link-Code arbeitet.

6. Build Model + Test aktivieren.

## 3. In-App Verknuepfung

1. In Bonalyze: `Einstellungen > Profil > Alexa Verknuepfung`
2. `Neuen Link-Code erstellen`
3. In Alexa sagen:
- `Alexa, oeffne bonalyze liste`
- `verknuepfen mit code 123456`

## 4. Sprachbefehle

1. Produkte hinzufuegen:
- `fuege Milch, 2 Liter Wasser und Eier zur Einkaufsliste hinzu`

2. Produkte entfernen:
- `entferne Milch und Eier`

3. Menge aendern:
- `setze 3 Liter Wasser und 12 Eier`

4. Liste vorlesen:
- `was steht auf meiner Einkaufsliste`

5. Zwischen Listen wechseln:
- `oeffne liste DM`
- `wechsle zu liste Kaufland`

6. Neue Liste anlegen:
- `erstelle liste Wochenmarkt`

7. Vorhandene Listen nennen:
- `welche listen habe ich`

## 5. Security Notes

1. Alexa Request-Signatur wird serverseitig validiert.
2. Skill-ID kann mit `ALEXA_SKILL_ID` erzwungen werden.
3. Link-Codes sind einmalig und laufen nach 10 Minuten ab.
4. Rate-Limit auf Link-Code-Generierung ist aktiv.
