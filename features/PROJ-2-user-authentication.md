# PROJ-2: User Authentication

## Status: 🔵 Planned

## Übersicht
Implementierung der User-Authentifizierung mit Supabase Auth. Unterstützt Email/Password Login sowie Passwordless Magic Link für mobile-optimierte UX.

## Abhängigkeiten
- Benötigt: PROJ-1 (Database Schema) - für `profiles` Table

## User Stories

### US-1: Registrierung
- Als **neuer User** möchte ich **mich mit Email und Passwort registrieren**, um **Bonalyze nutzen zu können**
- Als **neuer User** möchte ich **mich mit Magic Link registrieren**, um **kein Passwort merken zu müssen**

### US-2: Login
- Als **registrierter User** möchte ich **mich mit Email/Passwort einloggen**, um **auf meine Daten zuzugreifen**
- Als **registrierter User** möchte ich **mich per Magic Link einloggen**, um **ohne Passwort schnell reinzukommen**
- Als **eingeloggter User** möchte ich **eingeloggt bleiben** (Session persistent), um **nicht jedes Mal neu einloggen zu müssen**

### US-3: Passwort-Management
- Als **User** möchte ich **mein Passwort zurücksetzen**, wenn **ich es vergessen habe**
- Als **eingeloggter User** möchte ich **mein Passwort ändern**, um **meine Account-Sicherheit zu erhöhen**

### US-4: Logout
- Als **eingeloggter User** möchte ich **mich ausloggen**, um **meinen Account auf geteilten Geräten zu schützen**

### US-5: Profil-Erstellung
- Als **neu registrierter User** möchte ich **meinen Anzeigenamen setzen**, um **in Haushalten identifizierbar zu sein**

## Acceptance Criteria

### AC-1: Signup Flow
- [ ] Email-Feld mit Validierung (gültiges Email-Format)
- [ ] Passwort-Feld mit Mindestanforderungen (min. 8 Zeichen)
- [ ] Passwort-Bestätigung bei Registrierung
- [ ] "Magic Link" Option als Alternative zum Passwort
- [ ] Loading State während Registrierung
- [ ] Erfolgs-Feedback nach Registrierung
- [ ] Automatische Weiterleitung zu Onboarding (Household Setup)

### AC-2: Login Flow
- [ ] Email/Password Login funktioniert
- [ ] Magic Link Login funktioniert (Email mit Link wird gesendet)
- [ ] "Passwort vergessen" Link vorhanden
- [ ] Fehler-Handling bei falschen Credentials
- [ ] Loading State während Login
- [ ] Session bleibt nach Browser-Refresh erhalten
- [ ] Automatische Weiterleitung zum Dashboard nach Login

### AC-3: Password Reset
- [ ] "Passwort vergessen" sendet Reset-Email
- [ ] Reset-Link führt zu Passwort-Ändern-Seite
- [ ] Neues Passwort muss Mindestanforderungen erfüllen
- [ ] Erfolgs-Feedback nach Passwort-Änderung
- [ ] Automatischer Login nach Passwort-Reset

### AC-4: Session Management
- [ ] Session Token in httpOnly Cookie (Supabase SSR)
- [ ] Session Refresh funktioniert automatisch
- [ ] Logout löscht Session vollständig
- [ ] Protected Routes redirecten zu Login wenn nicht authentifiziert

### AC-5: Profile Creation
- [ ] Nach erstem Login: Anzeigename abfragen
- [ ] Anzeigename in `profiles` Table speichern
- [ ] Avatar (optional): Initials-basierter Fallback

### AC-6: Security
- [ ] Rate Limiting: Max 5 Login-Versuche pro Minute
- [ ] HTTPS-only für alle Auth-Requests
- [ ] Keine Passwörter in Logs oder Error Messages
- [ ] CSRF Protection (Supabase built-in)

## Edge Cases

### EC-1: Doppelte Email-Registrierung
- **Was passiert, wenn** ein User sich mit einer bereits registrierten Email anmeldet?
- **Lösung**: Fehlermeldung "Diese Email ist bereits registriert. Bitte einloggen oder Passwort zurücksetzen."
- **UI**: Link zu Login-Seite und Password-Reset anbieten

### EC-2: Abgelaufener Magic Link
- **Was passiert, wenn** ein Magic Link abgelaufen ist (>1h)?
- **Lösung**: Fehlermeldung "Link abgelaufen. Bitte neuen Link anfordern."
- **UI**: Button "Neuen Link senden" direkt anzeigen

### EC-3: Mehrere Magic Links
- **Was passiert, wenn** ein User mehrere Magic Links anfordert?
- **Lösung**: Nur der neueste Link ist gültig (Supabase Default)
- **UI**: Hinweis "Wir haben dir einen neuen Link gesendet."

### EC-4: Login auf neuem Gerät
- **Was passiert, wenn** ein User sich auf einem neuen Gerät einloggt?
- **Lösung**: Normal einloggen, keine zusätzliche Verifikation (MVP)
- **Future**: 2FA oder Device-Bestätigung

### EC-5: Session Timeout
- **Was passiert, wenn** die Session abläuft (z.B. nach 7 Tagen)?
- **Lösung**: Automatischer Redirect zu Login mit Hinweis "Session abgelaufen"
- **UX**: Sanftes Handling, kein Datenverlust

### EC-6: Ungültiges Passwort-Format
- **Was passiert, wenn** das Passwort zu kurz/unsicher ist?
- **Lösung**: Echtzeit-Validierung mit Feedback
- **UI**: "Passwort muss mindestens 8 Zeichen haben"

## Technische Anforderungen

### Performance
- Login-Response: < 500ms
- Magic Link Email: < 5 Sekunden nach Anforderung

### Security
- Passwort-Hashing: bcrypt (Supabase Default)
- Session Token: JWT mit kurzer Lifetime + Refresh Token
- Rate Limiting auf Auth-Endpoints

### Mobile UX
- Große Touch-Targets (min. 44px)
- Keyboard-optimierte Inputs (email, password types)
- "Show Password" Toggle
- Auto-Focus auf erstes Feld

## UI/UX Spezifikation

### Screens

#### 1. Login Screen (`/login`)
```
┌─────────────────────────────┐
│         Bonalyze            │
│                             │
│  ┌───────────────────────┐  │
│  │ Email                 │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ Passwort         [👁] │  │
│  └───────────────────────┘  │
│                             │
│  [      Einloggen       ]   │
│                             │
│  ─────── oder ───────       │
│                             │
│  [   Magic Link senden  ]   │
│                             │
│  Passwort vergessen?        │
│                             │
│  ─────────────────────      │
│  Noch kein Account?         │
│  Jetzt registrieren         │
└─────────────────────────────┘
```

#### 2. Signup Screen (`/signup`)
```
┌─────────────────────────────┐
│         Bonalyze            │
│     Account erstellen       │
│                             │
│  ┌───────────────────────┐  │
│  │ Email                 │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ Passwort         [👁] │  │
│  └───────────────────────┘  │
│  Min. 8 Zeichen             │
│                             │
│  ┌───────────────────────┐  │
│  │ Passwort bestätigen   │  │
│  └───────────────────────┘  │
│                             │
│  [    Account erstellen  ]  │
│                             │
│  ─────── oder ───────       │
│                             │
│  [   Magic Link senden  ]   │
│                             │
│  ─────────────────────      │
│  Bereits registriert?       │
│  Zum Login                  │
└─────────────────────────────┘
```

#### 3. Magic Link Sent (`/verify`)
```
┌─────────────────────────────┐
│            📧               │
│                             │
│    Check deine Emails!      │
│                             │
│  Wir haben dir einen Link   │
│  an max@example.com         │
│  gesendet.                  │
│                             │
│  Klicke auf den Link um     │
│  dich einzuloggen.          │
│                             │
│  ─────────────────────      │
│  Keine Email erhalten?      │
│  [  Erneut senden  ]        │
│                             │
│  [  Andere Email nutzen  ]  │
└─────────────────────────────┘
```

#### 4. Password Reset (`/reset-password`)
```
┌─────────────────────────────┐
│      Passwort zurücksetzen  │
│                             │
│  ┌───────────────────────┐  │
│  │ Email                 │  │
│  └───────────────────────┘  │
│                             │
│  [   Reset-Link senden   ]  │
│                             │
│  ─────────────────────      │
│  Zurück zum Login           │
└─────────────────────────────┘
```

## Implementation Notes

### Supabase Auth Setup
```typescript
// Signup mit Email/Password
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123'
})

// Login mit Email/Password
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword123'
})

// Magic Link
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com'
})

// Password Reset
const { data, error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com'
)
```

### Protected Routes (Middleware)
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}
```

## Checklist vor Abschluss

- [x] **Fragen gestellt**: Auth-Methoden (Email/PW + Magic Link) geklärt
- [x] **User Stories komplett**: 5 User Stories definiert
- [x] **Acceptance Criteria konkret**: 6 Kategorien mit testbaren Kriterien
- [x] **Edge Cases identifiziert**: 6 Edge Cases dokumentiert
- [x] **Feature-ID vergeben**: PROJ-2
- [x] **File gespeichert**: `/features/PROJ-2-user-authentication.md`
- [x] **Status gesetzt**: 🔵 Planned
- [ ] **User Review**: Warte auf User-Approval

## Tech-Design (Solution Architect)

### Bestehende Infrastruktur (wiederverwendet)

Folgende Bausteine existieren bereits aus PROJ-1:
- **Supabase Client** - Browser und Server-seitig konfiguriert
- **shadcn/ui Komponenten** - Button, Card, Form, Input, Label, etc.
- **Formular-Validierung** - react-hook-form + zod bereits installiert
- **profiles Table** - Existiert bereits in der Datenbank

### Component-Struktur

```
Auth-System
├── Login-Seite (/login)
│   ├── Logo + Titel
│   ├── Login-Formular
│   │   ├── Email-Eingabe
│   │   ├── Passwort-Eingabe (mit Show/Hide Toggle)
│   │   └── "Einloggen" Button
│   ├── Trennlinie ("oder")
│   ├── "Magic Link senden" Button
│   ├── "Passwort vergessen?" Link
│   └── "Jetzt registrieren" Link
│
├── Registrierungs-Seite (/signup)
│   ├── Logo + Titel
│   ├── Signup-Formular
│   │   ├── Email-Eingabe
│   │   ├── Passwort-Eingabe (mit Staerke-Hinweis)
│   │   ├── Passwort-Bestaetigung
│   │   └── "Account erstellen" Button
│   ├── Trennlinie ("oder")
│   ├── "Magic Link senden" Button
│   └── "Zum Login" Link
│
├── Magic-Link-Bestaetigung (/verify)
│   ├── Email-Icon
│   ├── Erfolgsmeldung
│   ├── "Erneut senden" Button
│   └── "Andere Email nutzen" Link
│
├── Passwort-Reset-Seite (/reset-password)
│   ├── Titel
│   ├── Email-Eingabe
│   ├── "Reset-Link senden" Button
│   └── "Zurueck zum Login" Link
│
├── Neues-Passwort-Seite (/update-password)
│   ├── Titel
│   ├── Neues Passwort-Eingabe
│   ├── Passwort-Bestaetigung
│   └── "Passwort speichern" Button
│
├── Profil-Setup (/onboarding/profile)
│   ├── Willkommens-Text
│   ├── Anzeigename-Eingabe
│   ├── Avatar-Vorschau (Initialen-basiert)
│   └── "Weiter" Button
│
└── Gemeinsame Komponenten
    ├── Auth-Layout (zentrierte Karte fuer alle Auth-Seiten)
    ├── Passwort-Eingabe (mit Show/Hide Toggle)
    ├── Auth-Formular-Fehler (Fehleranzeige)
    └── Loading-Spinner (waehrend Auth-Requests)
```

### Daten-Model

**User-Authentifizierung (Supabase Auth - automatisch verwaltet)**
- Email-Adresse
- Verschluesseltes Passwort
- Session-Token (automatisch)
- Letzte Anmeldung

**User-Profil (profiles Table - existiert bereits)**
- Eindeutige ID (verknuepft mit Auth-User)
- Anzeigename (wird bei Onboarding gesetzt)
- Erstellungszeitpunkt

**Speicherung:**
- Auth-Daten: Supabase Auth (vollstaendig gemanagt)
- Profil-Daten: Supabase Postgres (profiles Table)
- Session: httpOnly Cookie (sicher, automatisch refreshed)

### Seiten-Routing

| Route | Zweck | Zugang |
|-------|-------|--------|
| /login | Anmelden | Nur nicht-eingeloggte User |
| /signup | Registrieren | Nur nicht-eingeloggte User |
| /verify | Magic Link Bestaetigung | Alle |
| /reset-password | Passwort zuruecksetzen | Nur nicht-eingeloggte User |
| /update-password | Neues Passwort setzen | Nur mit Reset-Token |
| /onboarding/profile | Profil einrichten | Nur neue User |
| /dashboard/* | App-Bereich | Nur eingeloggte User |

### Schutz der Routen (Middleware)

```
Automatische Weiterleitungen:
- Nicht eingeloggt + /dashboard → Redirect zu /login
- Eingeloggt + /login → Redirect zu /dashboard
- Eingeloggt + kein Profil → Redirect zu /onboarding/profile
```

### Tech-Entscheidungen

**Warum Supabase Auth?**
- Bereits in PROJ-1 eingerichtet
- Passwort-Hashing, Rate-Limiting, Security automatisch
- Magic Links und Email-Versand out-of-the-box
- Keine eigene Auth-Logik noetig

**Warum kein separates Auth-Package?**
- @supabase/ssr ist bereits installiert
- Handhabt Cookies und Session-Refresh automatisch
- Perfekt fuer Next.js App Router integriert

**Warum Middleware fuer Route-Schutz?**
- Schnelle Ueberpruefung vor Seiten-Laden
- Kein "Flash of Unauthenticated Content"
- Next.js Best Practice

**Warum shadcn/ui Komponenten?**
- Bereits im Projekt installiert (35+ Komponenten)
- Button, Card, Form, Input, Label vorhanden
- Konsistentes Design mit dem Rest der App

**Warum react-hook-form + zod?**
- Bereits installiert und konfiguriert
- Echtzeit-Validierung (z.B. "Min. 8 Zeichen")
- Gute Performance auch auf Mobile

### Dependencies

**Bereits installiert (keine neuen Packages noetig):**
- @supabase/ssr (Auth mit Cookies)
- @supabase/supabase-js (Supabase Client)
- react-hook-form (Formular-Handling)
- zod (Schema-Validierung)
- shadcn/ui Komponenten (Button, Card, Form, Input, Label)

**Keine neuen Dependencies erforderlich!**

### Implementierungs-Reihenfolge

1. **Middleware** - Route-Schutz einrichten
2. **Auth-Layout** - Gemeinsames Layout fuer alle Auth-Seiten
3. **Login-Seite** - Email/Password + Magic Link
4. **Signup-Seite** - Registrierung
5. **Verify-Seite** - Magic Link Bestaetigung
6. **Reset-Password** - Passwort zuruecksetzen
7. **Update-Password** - Neues Passwort setzen
8. **Onboarding** - Profil einrichten
9. **Logout** - Button im Dashboard-Header

### Security-Checkliste

- [x] Passwort-Hashing (Supabase bcrypt)
- [x] Session in httpOnly Cookie (nicht JS-zugaenglich)
- [x] CSRF Protection (Supabase built-in)
- [x] Rate Limiting (Supabase built-in: 5 Versuche/Minute)
- [x] HTTPS-only (Supabase Default)
- [ ] Email-Verifizierung aktivieren (Supabase Dashboard)

---

## Next Steps
1. **User-Review**: Spec durchlesen und approven
2. **Backend Developer**: Supabase Auth konfigurieren
3. **Frontend Developer**: Login/Signup UI bauen
4. **Danach**: PROJ-3 (Household Management)
