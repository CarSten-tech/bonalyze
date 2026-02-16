-- Fix the function to use 'data' column instead of non-existent 'link' column
CREATE OR REPLACE FUNCTION public.handle_new_list_item()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  msg TEXT;
BEGIN
  -- Get user name from profiles if user_id is present
  IF NEW.user_id IS NOT NULL THEN
    BEGIN
      SELECT first_name INTO user_name FROM profiles WHERE id = NEW.user_id;
    EXCEPTION WHEN OTHERS THEN
      user_name := NULL;
    END;
  END IF;

  -- Handle logic for name/source
  IF NEW.source = 'alexa' THEN
    user_name := 'Alexa';
  ELSE
    IF user_name IS NULL OR user_name = '' THEN 
      user_name := 'Jemand'; 
    END IF;
  END IF;

  msg := user_name || ' hat ' || NEW.product_name || ' hinzugefügt.';

  -- Insert notification using 'data' jsonb for the link/url
  INSERT INTO notifications (household_id, title, message, type, created_at, data, is_read)
  VALUES (
    NEW.household_id, 
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
