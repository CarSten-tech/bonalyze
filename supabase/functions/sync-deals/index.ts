import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const REWE_CSV_BASE = "https://rewe.nicoo.org";
const DEFAULT_REGION = "bavaria";

interface Deal {
  store: string;
  product_name: string;
  brand: string | null;
  ean: string | null;
  price: number;
  grammage: string | null;
  category: string | null;
  image_url: string | null;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/** Find the latest available CSV by scraping the directory index. */
async function findLatestCSV(region: string): Promise<string | null> {
  const res = await fetch(REWE_CSV_BASE);
  if (!res.ok) return null;
  const html = await res.text();
  
  // Extract all CSV hrefs matching the region
  const pattern = new RegExp(`(\\d{4}-\\d{2}-\\d{2})_${region}\\.csv`, 'g');
  const dates: string[] = [];
  let match;
  while ((match = pattern.exec(html)) !== null) {
    dates.push(match[1]);
  }
  
  if (dates.length === 0) return null;
  
  // Sort descending and pick the latest
  dates.sort().reverse();
  const latestDate = dates[0];
  return `${REWE_CSV_BASE}/${latestDate}_${region}.csv`;
}

function parseDeals(csvText: string): Deal[] {
  const lines = csvText.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const deals: Deal[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 8) continue;

    const [name, brand, ean, priceStr, grammage, category, sale, image] = fields;
    
    // Only include items on sale
    if (sale.trim().toLowerCase() !== 'true') continue;

    const price = parseFloat(priceStr);
    if (isNaN(price)) continue;

    deals.push({
      store: 'rewe',
      product_name: name.trim(),
      brand: brand && brand.trim() !== 'NA' ? brand.trim() : null,
      ean: ean?.trim() || null,
      price,
      grammage: grammage?.trim() || null,
      category: category?.trim() || null,
      image_url: image?.trim() || null,
    });
  }
  return deals;
}

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const region = url.searchParams.get('region') || DEFAULT_REGION;

    // Find the latest available CSV
    const csvUrl = await findLatestCSV(region);
    if (!csvUrl) {
      return new Response(
        JSON.stringify({ error: 'Could not find any CSV files' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching latest CSV: ${csvUrl}`);
    const csvRes = await fetch(csvUrl);
    if (!csvRes.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch CSV: ${csvRes.status}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const csvText = await csvRes.text();
    const deals = parseDeals(csvText);
    console.log(`Parsed ${deals.length} deals on sale from ${csvUrl}`);

    if (deals.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No deals on sale found', count: 0, source: csvUrl }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Clear old deals for this store
    const { error: deleteError } = await supabase
      .from('deals')
      .delete()
      .eq('store', 'rewe');

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to clear old deals', details: deleteError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert in batches of 500
    const BATCH_SIZE = 500;
    let inserted = 0;
    for (let i = 0; i < deals.length; i += BATCH_SIZE) {
      const batch = deals.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from('deals')
        .insert(batch);

      if (insertError) {
        console.error(`Insert batch error at offset ${i}:`, insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to insert deals', offset: i, details: insertError }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      inserted += batch.length;
    }

    console.log(`Successfully synced ${inserted} deals`);

    return new Response(
      JSON.stringify({
        message: `Synced ${inserted} REWE deals`,
        count: inserted,
        region,
        source: csvUrl,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
