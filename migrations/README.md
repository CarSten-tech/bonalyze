# Bonalyze Database Migrations

This folder contains SQL migrations for the Bonalyze database schema.

## Migration Files

1. **001_initial_schema.sql** - Core database tables
2. **002_rls_policies.sql** - Row-Level Security policies
3. **003_seed_data.sql** - Seed data (merchants, products, demo receipts)

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended for First-Time Setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the contents of `001_initial_schema.sql`
5. Click **Run** (or press Ctrl+Enter)
6. Repeat for `002_rls_policies.sql`
7. Repeat for `003_seed_data.sql`

### Option 2: Supabase CLI (For Local Development)

```bash
# Initialize Supabase locally (if not already done)
supabase init

# Link to your remote Supabase project
supabase link --project-ref YOUR_PROJECT_ID

# Apply migrations
supabase db push

# Or run individual migrations
psql postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres -f migrations/001_initial_schema.sql
```

## Migration Execution Order

**IMPORTANT:** Run migrations in this exact order:

1. `001_initial_schema.sql` - Creates all tables and triggers
2. `002_rls_policies.sql` - Sets up security policies
3. `003_seed_data.sql` - Populates initial data

## What Each Migration Does

### 001_initial_schema.sql

Creates the following tables:

- `profiles` - User profile data (extends Supabase auth.users)
- `households` - Household entities
- `household_members` - M:N relationship between users and households
- `merchants` - Store master data (REWE, LIDL, etc.)
- `products` - Product master data (Brot, Milch, etc.)
- `receipts` - Shopping receipts (header)
- `receipt_items` - Line items on receipts
- `shopping_lists` - Shopping list headers
- `shopping_list_items` - Items on shopping lists

**Key Features:**

- UUIDs for all primary keys
- Foreign keys with `ON DELETE CASCADE`
- Indexes on all foreign keys + composite indexes
- Auto-updating `updated_at` timestamps (via triggers)
- `created_at` defaults to NOW()

### 002_rls_policies.sql

Creates Row-Level Security policies:

- Helper function: `is_household_member(household_id, user_id)`
- Users can only see data from households they belong to
- Full access for household members (all can edit)
- Public read for merchants/products (users can create new ones)
- Secure user profile access (users can only see their own)

**Security Model:**

- All tables have RLS enabled
- Users must be authenticated to access data
- Household-scoped data is automatically filtered
- No SQL injection vulnerabilities

### 003_seed_data.sql

Pre-populates the database with:

- 5 Standard Merchants: REWE, LIDL, ALDI SÜD, EDEKA, Kaufland
- 20 Common Products: Brot, Milch, Eier, Äpfel, etc. (categorized)
- Demo Receipts: Commented out (requires manual household/user setup)

**Idempotency:**

- Uses `ON CONFLICT DO NOTHING` - safe to run multiple times
- Fixed UUIDs for consistent cross-environment references

## Verification

After running migrations, verify success:

```sql
-- Check tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public';

-- Check seed data
SELECT COUNT(*) FROM merchants; -- Should return 5
SELECT COUNT(*) FROM products;  -- Should return 20
```

## Troubleshooting

### Error: "relation auth.users does not exist"

**Solution:** Supabase Auth must be enabled. Check your project settings.

### Error: "function uuid_generate_v4() does not exist"

**Solution:** Run `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` (already in 001_initial_schema.sql)

### Error: "permission denied for schema auth"

**Solution:** Use the Supabase SQL Editor (it has elevated permissions) or contact support.

### Demo Receipts Not Working

**Solution:** The demo receipts in `003_seed_data.sql` are commented out by default. To enable:

1. Create a household via your app (sign up first)
2. Get your `user_id` from `auth.users` table
3. Replace `YOUR_USER_ID_HERE` in `003_seed_data.sql`
4. Uncomment the demo receipt sections
5. Re-run the migration

## Next Steps

After running migrations:

1. Verify tables in Supabase Dashboard > Database > Tables
2. Test RLS policies by querying as a test user
3. Check Supabase Studio for seed data (merchants/products)
4. Set up API routes in your Next.js app
5. Test end-to-end workflows (create household, add receipt, etc.)

## Migration Rollback

If you need to rollback (DESTRUCTIVE - deletes all data):

```sql
-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS shopping_list_items CASCADE;
DROP TABLE IF EXISTS shopping_lists CASCADE;
DROP TABLE IF EXISTS receipt_items CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;
DROP TABLE IF EXISTS household_members CASCADE;
DROP TABLE IF EXISTS households CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop helper function
DROP FUNCTION IF EXISTS is_household_member(UUID, UUID);
DROP FUNCTION IF EXISTS update_updated_at_column();
```

## Schema Diagram (High-Level)

```
auth.users (Supabase Auth)
    ↓
profiles (1:1)
    ↓
household_members (M:N)
    ↓
households (1:N)
    ├─→ receipts (1:N)
    │       ↓
    │   receipt_items (1:N)
    │       ↓
    │   products (M:N)
    │
    └─→ shopping_lists (1:N)
            ↓
        shopping_list_items (1:N)
            ↓
        products (M:N)

merchants (M:N)
    ↓
receipts
```

## Support

For questions or issues:

1. Check Supabase Logs: Dashboard > Logs
2. Review Feature Spec: `/features/PROJ-1-database-schema.md`
3. Contact Backend Developer (that's you!)
