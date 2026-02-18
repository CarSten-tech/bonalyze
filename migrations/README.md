# Legacy Migration Folder

Dieser Ordner ist **legacy** und bleibt nur zur Referenz für frühe Bootstrap-Skripte bestehen.

## Offizieller Migrationspfad

- Verwende ausschließlich `supabase/migrations/` für alle neuen und produktiven Migrationen.
- `supabase db push` und `supabase migration up` arbeiten auf diesem Pfad.

## Status dieses Ordners

- `migrations/` wird nicht weitergeführt.
- Keine neuen SQL-Dateien hier anlegen.
- Wenn Inhalte aus diesem Ordner noch benötigt werden, in neue, versionierte Dateien unter `supabase/migrations/` überführen.
