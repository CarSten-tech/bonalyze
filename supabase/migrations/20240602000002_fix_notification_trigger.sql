-- 1. Migration to fix the broken trigger which references non-existent user_id
-- We first need to check if we should ADD user_id or if we should use another way to identify the user.
-- The user said "ich sehe auch noch nichts in der glocke wer was angelegt hat".
-- The `shopping_list_items` table seems to track `product_name`, `quantity`, etc. but NOT `user_id` currently.
-- So we MUST add `user_id` to track who added the item.

-- Add user_id column
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Fix the function to handle NULL user_id gracefully (for existing items or system adds)
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

  -- Insert notification
  INSERT INTO notifications (household_id, title, message, type, created_at, link, is_read)
  VALUES (NEW.household_id, 'Neues Produkt', msg, 'info', now(), '/dashboard/list', false);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql security definer;
