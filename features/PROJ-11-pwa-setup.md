# PROJ-11: PWA Setup

## Status: 🔵 Planned

## Übersicht
Progressive Web App Setup für installierbare, app-ähnliche Experience auf Mobile. Includes Manifest, Service Worker, Icons und Install-Prompt.

## Abhängigkeiten
- Benötigt: Alle vorherigen Features implementiert (MVP-Complete)

## User Stories

### US-1: App installieren
- Als **User** möchte ich **Bonalyze auf dem Homescreen installieren**, um **schnellen Zugriff zu haben**

### US-2: App-ähnliche Experience
- Als **User** möchte ich **die App ohne Browser-UI nutzen**, um **eine native App Experience zu haben**

### US-3: App-Icons
- Als **User** möchte ich **ein schönes App-Icon sehen**, um **die App leicht zu finden**

### US-4: Splash Screen
- Als **User** möchte ich **beim Start einen Splash Screen sehen**, um **zu wissen dass die App lädt**

## Acceptance Criteria

### AC-1: Web App Manifest
- [ ] `manifest.json` mit App-Name, Icons, Theme-Color
- [ ] `display: standalone` für App-ähnlichen Modus
- [ ] `start_url` auf Dashboard
- [ ] `background_color` und `theme_color` definiert

### AC-2: App Icons
- [ ] Icon in verschiedenen Größen (192x192, 512x512)
- [ ] Maskable Icon für Android
- [ ] Apple Touch Icon für iOS

### AC-3: Install Prompt
- [ ] Custom Install-Banner/Button
- [ ] `beforeinstallprompt` Event handling
- [ ] "Zur Homescreen hinzufügen" CTA

### AC-4: iOS Meta Tags
- [ ] `apple-mobile-web-app-capable`
- [ ] `apple-mobile-web-app-status-bar-style`
- [ ] Apple Splash Screens für verschiedene Geräte

### AC-5: Service Worker (Basic)
- [ ] Caching für statische Assets
- [ ] Offline-Fallback Page
- [ ] Update-Notification bei neuer Version

### AC-6: Performance
- [ ] Lighthouse PWA Score > 90
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 3s

## Edge Cases

### EC-1: User lehnt Installation ab
- **Was passiert, wenn** User Install-Prompt dismisst?
- **Lösung**: Banner nicht mehr anzeigen (localStorage flag)
- **UX**: Subtiler "Installieren" Link in Settings

### EC-2: Browser unterstützt kein PWA
- **Was passiert, wenn** alter Browser ohne PWA-Support?
- **Lösung**: Normale Web-App, kein Install-Prompt
- **Graceful Degradation**

### EC-3: iOS Safari Limitierungen
- **Was passiert mit** iOS-spezifischen Einschränkungen?
- **Lösung**: Bekannte Limits dokumentieren (Storage, Push)
- **UX**: "Für beste Experience: Zur Homescreen hinzufügen"

## Technical Specification

### manifest.json
```json
{
  "name": "Bonalyze",
  "short_name": "Bonalyze",
  "description": "Haushaltsausgaben intelligent tracken",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0ea5e9",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### Next.js PWA Setup (next-pwa)
```typescript
// next.config.ts
import withPWA from 'next-pwa'

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})({
  // other next config
})

export default config
```

### iOS Meta Tags
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Bonalyze">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
```

### Install Prompt Component
```typescript
function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="install-banner">
      <p>Bonalyze installieren für schnellen Zugriff</p>
      <Button onClick={handleInstall}>Installieren</Button>
      <Button variant="ghost" onClick={() => setShowPrompt(false)}>
        Später
      </Button>
    </div>
  )
}
```

## UI/UX Spezifikation

### Install Banner
```
┌─────────────────────────────┐
│ 📱 Bonalyze installieren    │
│    für schnellen Zugriff    │
│                             │
│ [Installieren] [Später]     │
└─────────────────────────────┘
```

### Splash Screen (iOS)
```
┌─────────────────────────────┐
│                             │
│                             │
│                             │
│           [LOGO]            │
│                             │
│         Bonalyze            │
│                             │
│                             │
│                             │
└─────────────────────────────┘
```

## Checklist vor Abschluss

- [x] **User Stories komplett**: 4 User Stories definiert
- [x] **Acceptance Criteria konkret**: 6 Kategorien
- [x] **Edge Cases identifiziert**: 3 Edge Cases
- [x] **Feature-ID vergeben**: PROJ-11
- [x] **Status gesetzt**: 🔵 Planned
- [ ] **User Review**: Warte auf User-Approval

## Next Steps
1. **User-Review**: Spec durchlesen und approven
2. **Frontend Developer**: PWA Config + Icons
3. **DevOps**: Lighthouse Audit
4. **Launch**: MVP Ready!
