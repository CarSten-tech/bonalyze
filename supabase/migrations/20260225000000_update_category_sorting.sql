-- Migration to update the sort_order of categories to mimic a physical supermarket layout

UPDATE categories SET sort_order = 10 WHERE name ILIKE 'Obst & Gemüse';
UPDATE categories SET sort_order = 20 WHERE name ILIKE 'Brot & Backwaren';
UPDATE categories SET sort_order = 30 WHERE name ILIKE 'Milch & Eier';
UPDATE categories SET sort_order = 40 WHERE name ILIKE 'Fleisch & Fisch';
UPDATE categories SET sort_order = 50 WHERE name ILIKE 'Grundnahrungsmittel';
UPDATE categories SET sort_order = 60 WHERE name ILIKE 'Fertiggerichte';
UPDATE categories SET sort_order = 70 WHERE name ILIKE 'Süß & Salzig';
UPDATE categories SET sort_order = 80 WHERE name ILIKE 'Getränke';
UPDATE categories SET sort_order = 90 WHERE name ILIKE 'Alkohol & Tabak';

-- Drogerie & Co (nach den Lebensmitteln)
UPDATE categories SET sort_order = 100 WHERE name ILIKE 'Körperpflege';
UPDATE categories SET sort_order = 110 WHERE name ILIKE 'Haushalt & Putzen';
UPDATE categories SET sort_order = 120 WHERE name ILIKE 'Gesundheit';
UPDATE categories SET sort_order = 130 WHERE name ILIKE 'Baby';
UPDATE categories SET sort_order = 140 WHERE name ILIKE 'Tier';

-- Home, Living, Non-Food (meist in den mittleren/hinteren Gängen)
UPDATE categories SET sort_order = 150 WHERE name ILIKE 'Küche';
UPDATE categories SET sort_order = 160 WHERE name ILIKE 'Wohnen';
UPDATE categories SET sort_order = 170 WHERE name ILIKE 'Garten';
UPDATE categories SET sort_order = 180 WHERE name ILIKE 'Büro';
UPDATE categories SET sort_order = 190 WHERE name ILIKE 'Technik';

-- Fashion
UPDATE categories SET sort_order = 200 WHERE name ILIKE 'Kleidung';
UPDATE categories SET sort_order = 210 WHERE name ILIKE 'Schuhe';

-- Unterwegs / Mobilität
UPDATE categories SET sort_order = 220 WHERE name ILIKE 'Tanken';
UPDATE categories SET sort_order = 230 WHERE name ILIKE 'Ticket';

-- Catch-all ganz am Ende
UPDATE categories SET sort_order = 999 WHERE name ILIKE 'Sonstiges';
