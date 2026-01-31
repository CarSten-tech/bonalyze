# PROJ-1: Bonalyze Database Schema

## Status: 🔵 Planned

## Übersicht
Initiales Supabase-Datenbankschema für Bonalyze - eine Haushalts-Shopping-Analytics-App. Ermöglicht Multi-User-Haushalte, Receipt-Tracking, Shopping-Listen und Produkt-Management.

## User Stories

### US-1: Household Management
- Als **User** möchte ich **einen Haushalt erstellen**, um **Einkäufe mit anderen Personen zu teilen**
- Als **User** möchte ich **Mitglieder zu meinem Haushalt einladen**, um **gemeinsame Einkaufsdaten zu verwalten**
- Als **User** möchte ich **mehreren Haushalten angehören** (z.B. Familie + WG), um **verschiedene Einkaufskontexte zu trennen**

### US-2: Receipt Management
- Als **User** möchte ich **Kassenbons hochladen/erfassen**, um **meine Einkäufe zu dokumentieren**
- Als **Household-Member** möchte ich **alle Receipts des Haushalts sehen**, um **gemeinsame Ausgaben zu tracken**
- Als **Receipt-Owner** möchte ich **meine Receipts bearbeiten/löschen**, um **Fehler zu korrigieren**

### US-3: Product & Merchant Master-Data
- Als **User** möchte ich **aus vordefinierten Merchants auswählen** (REWE, LIDL, etc.), um **schnell Receipts zu erfassen**
- Als **User** möchte ich **neue Merchants/Products anlegen**, wenn **mein Store/Produkt noch nicht existiert**
- Als **System** möchte ich **Seed-Data für gängige Merchants/Products bereitstellen**, um **eine gute Start-Experience zu bieten**

### US-4: Shopping Lists
- Als **User** möchte ich **Einkaufslisten erstellen**, um **Einkäufe zu planen**
- Als **Household-Member** möchte ich **gemeinsame Shopping-Lists bearbeiten**, um **kollaborativ einzukaufen**
- Als **User** möchte ich **Produkte von Receipts zu Shopping-Lists hinzufügen**, um **Wiederkäufe zu vereinfachen**

### US-5: Data Security & Privacy
- Als **User** möchte ich **nur meine eigenen Haushalts-Daten sehen**, um **Privatsphäre zu gewährleisten**
- Als **System-Admin** möchte ich **Row-Level-Security (RLS) auf allen Tables**, um **Datenlecks zu verhindern**

## Acceptance Criteria

### AC-1: Core Entities
- [ ] `profiles` Table: User-Profil-Daten (extends Supabase Auth)
- [ ] `households` Table: Haushalts-Entities
- [ ] `household_members` Table: M:N Relation zwischen profiles & households
- [ ] `merchants` Table: Store-Liste (REWE, LIDL, ALDI, etc.)
- [ ] `products` Table: Produkt-Master-Data (Name, Kategorie, Unit)
- [ ] `receipts` Table: Einkaufs-Header (Merchant, Datum, Total)
- [ ] `receipt_items` Table: Line-Items (Produkt, Preis, Menge pro Receipt)
- [ ] `shopping_lists` Table: Einkaufslisten-Header
- [ ] `shopping_list_items` Table: Artikel auf Shopping-Lists

### AC-2: Relationships & Constraints
- [ ] Foreign Keys mit `ON DELETE CASCADE` für abhängige Entities
- [ ] `created_by` in households/receipts/shopping_lists → verweist auf profiles(id)
- [ ] `household_id` in receipts/shopping_lists → verweist auf households(id)
- [ ] NOT NULL Constraints auf kritischen Feldern (z.B. receipt_items.price)
- [ ] Unique Constraints auf sinnvollen Kombinationen (z.B. household_members: user_id + household_id)

### AC-3: Row-Level-Security (RLS)
- [ ] RLS aktiviert auf **allen** Tables
- [ ] Policy: User sieht nur Haushalte, in denen er Member ist
- [ ] Policy: User sieht nur Receipts seiner Haushalte
- [ ] Policy: User sieht nur Shopping-Lists seiner Haushalte
- [ ] Policy: User kann eigene Merchants/Products anlegen (aber sieht alle)
- [ ] Policy: Full Access für Household-Members (alle können bearbeiten)

### AC-4: Performance & Automation
- [ ] Indexes auf Foreign Keys (household_id, user_id, merchant_id, product_id)
- [ ] Indexes auf häufige Query-Felder (receipts.date, receipts.household_id)
- [ ] `updated_at` Trigger auf allen Tables (auto-update bei Änderung)
- [ ] `created_at` Default-Value `now()` auf allen Tables

### AC-5: Seed-Data
- [ ] 5 Standard-Merchants (REWE, LIDL, ALDI, EDEKA, Kaufland)
- [ ] 20 Standard-Products (Brot, Milch, Eier, etc. - typische Einkaufsprodukte)
- [ ] 5 Test-Receipts für Demo-Purposes (optional: mit receipt_items)

### AC-6: Migration Structure
- [ ] `migrations/001_initial_schema.sql` - Core Tables
- [ ] `migrations/002_rls_policies.sql` - RLS Policies
- [ ] `migrations/003_seed_data.sql` - Seed-Data

## Edge Cases

### EC-1: Multi-Household-User
- **Was passiert, wenn** ein User mehreren Haushalten angehört?
  - **Lösung**: `household_members` Table als M:N Relation → User kann beliebig vielen Haushalten angehören
  - **UI-Impact**: User muss beim Receipt-Upload Household auswählen

### EC-2: Receipt-Ownership in Haushalten
- **Was passiert, wenn** ein User ein Receipt hochlädt?
  - **Lösung**: Receipt gehört dem User (`created_by`), ist aber Household-shared (`household_id`)
  - **Permissions**: Alle Household-Members können sehen UND bearbeiten (Full Access)

### EC-3: Duplicate Merchants/Products
- **Was passiert, wenn** ein User einen Merchant/Product anlegt, der bereits existiert?
  - **Lösung**: UI sollte Auto-Complete/Search bieten (Schema-seitig kein UNIQUE Constraint)
  - **Future**: Crowd-sourced Deduplication oder Admin-Review

### EC-4: User verlässt Household
- **Was passiert, wenn** ein User aus einem Household entfernt wird?
  - **Lösung**: Seine Receipts bleiben im Household (weil `household_id` NOT NULL)
  - **Alternative**: CASCADE-Delete aller User-Receipts (NICHT gewählt, weil Datenverlust)

### EC-5: Soft-Delete vs. Hard-Delete
- **Was passiert, wenn** ein User ein Receipt löscht?
  - **Lösung**: Hard-Delete (CASCADE-Delete auf receipt_items)
  - **Future**: Soft-Delete mit `deleted_at` Timestamp (für Undo-Funktion)

### EC-6: Currency & Internationalization
- **Was passiert, wenn** User in verschiedenen Ländern einkaufen?
  - **Lösung (MVP)**: Alle Preise in Cent (Integer), Currency-Field optional
  - **Future**: Multi-Currency Support mit Conversion-Rates

### EC-7: Product-Categories
- **Was passiert, wenn** Products kategorisiert werden sollen (Food, Drinks, Household)?
  - **Lösung**: `products.category` String-Field (oder ENUM)
  - **Future**: Separate `categories` Table mit hierarchischer Struktur

## Technische Anforderungen

### Performance
- Response Time für Queries: `< 200ms` (p95)
- Indexes auf allen Foreign Keys
- Composite Indexes für häufige Queries:
  - `receipts(household_id, date DESC)`
  - `receipt_items(receipt_id, product_id)`

### Security
- RLS auf allen Tables (MANDATORY)
- HTTPS-only für Supabase API Calls
- API Keys niemals in Frontend-Code commiten

### Data Integrity
- Foreign Key Constraints mit CASCADE
- NOT NULL auf kritischen Feldern
- Timestamps (`created_at`, `updated_at`) auf allen Tables

### Scalability (Future)
- Partitioning von `receipts` nach Date (wenn > 1M rows)
- Archivierung alter Receipts (z.B. > 2 Jahre)

## Abhängigkeiten
- **Supabase-Projekt**: Muss existieren (siehe Supabase Dashboard)
- **Supabase CLI**: Für lokale Migration-Ausführung
- **Database Migrations Tool**: Supabase Migrations oder Custom SQL Runner

## Technische Notes für Implementation (Backend Dev)

### Migration 001: Initial Schema
- Reihenfolge beachten: `profiles` → `households` → `household_members` → `merchants` → `products` → `receipts` → `receipt_items` → `shopping_lists` → `shopping_list_items`
- UUIDs verwenden für Primary Keys (Supabase Default)
- `auth.users` Schema für User-Auth nutzen (nicht eigene User-Table)

### Migration 002: RLS Policies
- Policy-Namen: `{table}_{action}_{scope}` (z.B. `receipts_select_household_members`)
- Helper-Function erstellen: `is_household_member(household_id, user_id)` für Wiederverwendung

### Migration 003: Seed Data
- INSERT mit `ON CONFLICT DO NOTHING` für idempotente Migrations
- UUIDs für Seed-Data: Generieren oder feste UUIDs (für Referenzen)

## Checklist vor Abschluss

- [x] **Fragen gestellt**: User hat Household-Modell, Ownership, Master-Data, Permissions geklärt
- [x] **User Stories komplett**: 5 User Stories definiert
- [x] **Acceptance Criteria konkret**: 6 Kategorien mit testbaren Kriterien
- [x] **Edge Cases identifiziert**: 7 Edge Cases dokumentiert
- [x] **Feature-ID vergeben**: PROJ-1
- [x] **File gespeichert**: `/features/PROJ-1-database-schema.md`
- [x] **Status gesetzt**: 🔵 Planned
- [ ] **User Review**: Warte auf User-Approval

## Next Steps
1. **User-Review**: Spec durchlesen und approven
2. **Backend Developer**: SQL-Migrations erstellen (migrations/001_*.sql, 002_*.sql, 003_*.sql)
3. **Solution Architect**: High-Level API-Design (optional, falls Frontend-Integration geplant)
