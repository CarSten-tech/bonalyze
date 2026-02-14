# Alexa Skill Einrichtung: Schritt-für-Schritt (Für Einsteiger)

Diese Anleitung erklärt ganz einfach, wie du deinen eigenen Amazon Alexa Skill erstellst, um deine Bonalyze Einkaufsliste per Sprache zu steuern.

## Voraussetzungen

1. Ein **Amazon Developer Account** (kostenlos). [Hier registrieren](https://developer.amazon.com/).
2. Deine Bonalyze App muss öffentlich erreichbar sein (also auf Vercel o.ä. deployt), damit Amazon darauf zugreifen kann.

---

## Schritt 1: Skill erstellen

1. Melde dich in der [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask) an.
2. Klicke auf **Create Skill**.
3. **Skill Name**: Gib `Bonalyze` ein.
4. **Primary Locale**: Wähle `German (Germany)` aus.
5. **Choose a model**: Wähle `Custom` (ganz oben).
6. **Choose a method to host**: Wähle `Provision your own` (ganz unten).
7. Klicke oben rechts auf **Create Skill**.
8. **Choose a template**: Wähle `Start from Scratch` und klicke **Import Skill**.

---

## Schritt 2: Das Sprachmodell einrichten

Jetzt bringen wir Alexa bei, was sie verstehen soll.

1. Im linken Menü unter **Interaction Model**, klicke auf **JSON Editor**.
2. Du siehst ein Textfeld mit JSON-Code. Lösche ALLES, was dort steht.
3. Kopiere den kompletten Inhalt aus der Datei `docs/alexa/interaction-model.de-DE.json` (in deinem Projektordner) und füge ihn in das Textfeld ein.
4. Klicke oben auf **Save Model**.
5. Klicke dann auf **Build Model**. Das dauert ca. 1-2 Minuten.

> **Hinweis**: Der "Invocation Name" ist das Wort, mit dem du den Skill startest. Er ist auf `bonalyze` eingestellt. Du sagst also später: _"Alexa, öffne Bonalyze"_.

---

## Schritt 3: Verbindung zu Bonalyze herstellen (Endpoint)

Jetzt sagen wir Alexa, wo sie die Antworten herbekommt.

1. Klicke im linken Menü auf **Endpoint**.
2. Wähle **HTTPS** aus.
3. Unter **Default Region**, gib die URL deiner App ein:
   `https://<DEINE-DOMAIN>/api/alexa`
   _(Ersetze `<DEINE-DOMAIN>` durch deine echte URL, z.B. `bonalyze.vercel.app`)_
4. Im Dropdown darunter ("Select SSL certificate type") wähle:
   `My development endpoint is a sub-domain of a domain that has a wildcard certificate from a CA`
   _(Das ist die richtige Einstellung für Vercel, Netlify & Co.)_
5. Klicke oben auf **Save Endpoints**.

---

## Schritt 4: Testen

1. Klicke oben im Reiter auf **Test**.
2. Stelle "Skill testing is enabled in:" von `Off` auf `Development`.
3. Tippe oder spreche in den Simulator: `öffne bonalyze`.
4. Wenn alles klappt, antwortet Alexa: _"Willkommen bei Bonalyze..."_ oder fragt nach einer Verknüpfung.

---

## Schritt 5: Dein Konto verknüpfen

Damit Alexa weiß, WELCHE Einkaufsliste sie bearbeiten soll, musst du sie einmalig koppeln.

1. Öffne deine **Bonalyze App**.
2. Gehe zu **Einstellungen > Profil**.
3. Scrolle zu "Alexa Verknüpfung" und klicke auf **Code erstellen**.
4. Merke dir den 6-stelligen Code (er ist 10 Minuten gültig).
5. Sage zu Alexa (oder tippe im Simulator):
   _"Alexa, öffne Bonalyze"_
   Alexa fragt was du tun möchtest.
6. Sage: _"Verknüpfen mit Code 123456"_ (dein Code).
7. Alexa sollte bestätigen: _"Gerät erfolgreich mit deiner Bonalyze Einkaufsliste verknüpft."_

---

## Fertig! 🎉 So nutzt du es:

Du kannst jetzt folgende Befehle nutzen. Starte immer mit _"Alexa, öffne Bonalyze"_, oder sage den Befehl direkt: _"Alexa, sage Bonalyze, dass..."_

### 🛒 Produkte hinzufügen (auch mehrere!)

- _"Füge Milch hinzu"_
- _"Packe Milch, Eier und Butter auf die Liste"_
- _"Schreibe 2 Liter Milch und 10 Eier auf die Einkaufsliste"_

### ❌ Produkte entfernen

- _"Entferne Milch"_
- _"Lösche Eier und Butter von der Liste"_

### 🔢 Menge ändern

- _"Setze Milch auf 3 Liter"_
- _"Ändere Eier zu 12 Stück"_

### 📜 Liste vorlesen

- _"Was steht auf meiner Liste?"_
- _"Lies meine Einkaufsliste vor"_

### 📋 Listen verwalten

- _"Erstelle Liste Wochenmarkt"_
- _"Öffne Liste Wochenmarkt"_ (Wechselt die aktive Liste, auf die geschrieben wird)
- _"Welche Listen habe ich?"_
