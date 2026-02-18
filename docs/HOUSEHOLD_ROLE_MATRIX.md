# Household Role Matrix

## Rollen

- `owner`: Vollzugriff inkl. Ownership-Transfer
- `admin`: Delegierter Haushalts-Admin (wie owner, aber ohne Ownership-Transfer)
- `member`: Standardrolle mit allen Alltagsfunktionen

## Rechte-Matrix

| Permission | owner | admin | member |
|---|---|---|---|
| `household.manage_members` | ✅ | ✅ | ❌ |
| `household.manage_settings` | ✅ | ✅ | ❌ |
| `household.transfer_ownership` | ✅ | ❌ | ❌ |
| `shopping.create_list` | ✅ | ✅ | ✅ |
| `settlements.manage` | ✅ | ✅ | ✅ |
| `notifications.manage` | ✅ | ✅ | ❌ |
| `audit.read` | ✅ | ✅ | ✅ |

## Implementierungsstatus

- Rollen-Constraint in DB: `owner|admin|member` (inkl. Single-Owner-Index je Haushalt)
- Betriebsmodus: **membership-first** für den Alltag, Governance nur owner/admin
- Runtime Permission Checks:
  - Settlement-Erstellung (`/api/settlements` POST) für alle Mitglieder
  - Alexa-Listenanlage für alle Mitglieder
  - Notification-Queue Retry nur `owner/admin`
