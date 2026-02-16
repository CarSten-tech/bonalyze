-- Fix: look up household_id from shopping_lists (not on shopping_list_items)
-- Fix: use 'data' jsonb column instead of non-existent 'link' column
CREATE OR REPLACE FUNCTION public.handle_new_list_item()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  msg TEXT;
  hh_id UUID;
BEGIN
  -- Look up household_id from the parent shopping_lists table
  SELECT household_id INTO hh_id FROM shopping_lists WHERE id = NEW.shopping_list_id;
  
  IF hh_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get user name from profiles if user_id is present
  IF NEW.user_id IS NOT NULL THEN
    BEGIN
      SELECT first_name INTO user_name FROM profiles WHERE id = NEW.user_id;
    EXCEPTION WHEN OTHERS THEN
      user_name := NULL;
    END;
  END IF;

  -- Handle Alexa source
  IF NEW.source = 'alexa' THEN
    user_name := 'Alexa';
  ELSE
    IF user_name IS NULL OR user_name = '' THEN 
      user_name := 'Jemand'; 
    END IF;
  END IF;

  msg := user_name || ' hat ' || NEW.product_name || ' hinzugefügt.';

  INSERT INTO notifications (household_id, title, message, type, created_at, data, is_read)
  VALUES (
    hh_id, 
    'Neues Produkt', 
    msg, 
    'info', 
    now(), 
    jsonb_build_object('url', '/dashboard/list'), 
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql security definer;
