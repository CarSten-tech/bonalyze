-- Add source column to shopping_list_items
ALTER TABLE shopping_list_items
ADD COLUMN source TEXT DEFAULT 'app';

-- Create notification function
CREATE OR REPLACE FUNCTION public.handle_new_list_item()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  msg TEXT;
BEGIN
  -- Get user name from profiles if exists
  BEGIN
    SELECT first_name INTO user_name FROM profiles WHERE id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    user_name := NULL;
  END;
  
  -- Handle logic for name/source
  IF NEW.source = 'alexa' THEN
    user_name := 'Alexa';
  ELSE
    IF user_name IS NULL OR user_name = '' THEN 
      user_name := 'Jemand'; 
    END IF;
  END IF;

  msg := user_name || ' hat ' || NEW.product_name || ' hinzugefügt.';

  INSERT INTO notifications (household_id, title, message, type, created_at, link)
  VALUES (NEW.household_id, 'Neues Produkt', msg, 'shopping_list_item', now(), '/dashboard/list');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql security definer;

-- Create trigger
DROP TRIGGER IF EXISTS on_item_created ON shopping_list_items;
CREATE TRIGGER on_item_created
  AFTER INSERT ON shopping_list_items
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_list_item();
