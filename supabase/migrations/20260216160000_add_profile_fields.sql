-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update the handle_new_user function to populate these fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_first_name TEXT;
BEGIN
  -- Extract first_name from metadata or default to empty
  extracted_first_name := NEW.raw_user_meta_data->>'first_name';

  INSERT INTO public.profiles (id, display_name, first_name, email)
  VALUES (
    NEW.id,
    -- display_name logic: Use first_name if available, else fallback to email prefix
    COALESCE(
      extracted_first_name, 
      NEW.raw_user_meta_data->>'display_name', 
      split_part(NEW.email, '@', 1)
    ),
    extracted_first_name,
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Backfill email for existing users (optional but good for consistency)
-- We can't easily backfill email from auth.users here without extra permissions/complexity
-- so we'll leave existing rows as NULL for now, they can update in settings.
