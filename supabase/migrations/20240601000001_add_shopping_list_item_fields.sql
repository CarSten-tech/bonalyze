-- Add note and category_id to shopping_list_items
ALTER TABLE shopping_list_items
ADD COLUMN note TEXT,
ADD COLUMN category_id UUID REFERENCES categories(id);
