-- Fix user tracking in shopping_list_items and update notification trigger
-- 1. Ensure user_id defaults to auth.uid() so we don't need to pass it from frontend
ALTER TABLE shopping_list_items 
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. Update trigger function to use correct profile column (display_name instead of first_name)
CREATE OR REPLACE FUNCTION public.handle_new_list_item()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  msg TEXT;
  hh_id UUID;
  creator_id UUID;
BEGIN
  -- Look up household_id from the parent shopping_lists table
  SELECT household_id INTO hh_id FROM shopping_lists WHERE id = NEW.shopping_list_id;
  
  -- If we can't find a household, we can't notify anyone
  IF hh_id IS NULL THEN
    RETURN NEW;
  END IF;

  creator_id := NEW.user_id;

  -- Get user name from profiles if user_id is present
  -- Use display_name because first_name might not exist (based on types)
  IF creator_id IS NOT NULL THEN
    BEGIN
      SELECT display_name INTO user_name FROM profiles WHERE id = creator_id;
    EXCEPTION WHEN OTHERS THEN
      user_name := NULL;
    END;
  END IF;

  -- Handle Alexa source or Fallback
  IF NEW.source = 'alexa' THEN
    user_name := 'Alexa';
  ELSE
    IF user_name IS NULL OR user_name = '' THEN 
      user_name := 'Jemand'; 
    END IF;
  END IF;

  msg := user_name || ' hat ' || NEW.product_name || ' hinzugefügt.';

  -- Insert notifications for ALL household members (except the creator)
  INSERT INTO notifications (user_id, household_id, title, message, type, created_at, data, is_read)
  SELECT 
    hm.user_id,
    hh_id, 
    'Neues Produkt', 
    msg, 
    'info', 
    now(), 
    jsonb_build_object('url', '/dashboard/list'), 
    false
  FROM household_members hm
  WHERE hm.household_id = hh_id
    -- Don't notify the person who created the item (if known)
    AND (creator_id IS NULL OR hm.user_id != creator_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql security definer;
