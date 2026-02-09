import pandas as pd
import os
import sys
import json
import urllib.request
import urllib.error

# KONFIGURATION
DATA_DIR = 'data'
XLSX_FILE = 'bls_data.xlsx'
CSV_FILE = 'bls_data.csv'

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Fehler: SUPABASE_URL und SUPABASE_KEY müssen als Umgebungsvariablen gesetzt sein.")
    sys.exit(1)

API_ENDPOINT = f"{SUPABASE_URL}/rest/v1/nutrition_library"

def clean_number(val):
    if pd.isna(val): return 0
    s = str(val).strip()
    if s == '' or s == '-' or s.startswith('<'): return 0
    # Komma zu Punkt (für CSVs wichtig)
    s = s.replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return 0

def post_batch(batch):
    data = json.dumps(batch).encode('utf-8')
    req = urllib.request.Request(API_ENDPOINT, data=data)
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'resolution=ignore-duplicates') # WICHTIG: Ignoriert Duplikate statt Fehler

    try:
        with urllib.request.urlopen(req) as response:
            if response.status not in (200, 201, 204):
                print(f"⚠️ Warnung: Status {response.status}")
                print(response.read().decode('utf-8'))
            return True
    except urllib.error.HTTPError as e:
        print(f"❌ Fehler beim Upload: {e.code} {e.reason}")
        print(e.read().decode('utf-8'))
        return False
    except Exception as e:
        print(f"❌ Netzwerkfehler: {e}")
        return False

def run():
    xlsx_path = os.path.join(DATA_DIR, XLSX_FILE)
    csv_path = os.path.join(DATA_DIR, CSV_FILE)
    
    df = None
    
    if os.path.exists(xlsx_path):
        print(f"✅ Excel-Datei gefunden: {xlsx_path}")
        try:
            df = pd.read_excel(xlsx_path, engine='openpyxl')
        except Exception as e:
            print(f"❌ Fehler beim Excel-Lesen: {e}")
            return
            
    elif os.path.exists(csv_path):
        print(f"⚠️ Keine Excel gefunden, versuche CSV: {csv_path}")
        try:
            df = pd.read_csv(csv_path, sep=None, engine='python', encoding='latin-1', on_bad_lines='skip')
        except Exception as e:
            print(f"❌ CSV-Fehler: {e}")
            return
    else:
        print(f"❌ Weder {XLSX_FILE} noch {CSV_FILE} im Ordner '{DATA_DIR}' gefunden!")
        return

    print(f"Daten geladen! {len(df)} Zeilen gefunden.")

    # Spalten-Mapping analog zum Original-Skript
    column_mapping = {
        'bls_code': 'BLS Code',
        'name': 'Lebensmittelbezeichnung',
        'calories': 'ENERCC', 
        'fat': 'FAT ',       
        'saturated_fat': 'FASAT', 
        'carbs': 'CHO ',     
        'sugar': 'SUGAR',    
        'fiber': 'FIBT',     
        'protein': 'PROT625', 
        'salt': 'NACL',      
        'iron': 'FE ',       
        'calcium': 'CA ',    
        'magnesium': 'MG ',  
        'zinc': 'ZN ',       
        'vitamin_c': 'VITC'  
    }

    final_cols = {}
    for key, search_term in column_mapping.items():
        found = False
        for col in df.columns:
            if str(col).startswith(search_term):
                final_cols[key] = col
                found = True
                break
        if not found:
            print(f"Info: Spalte '{search_term}' nicht exakt gefunden.")

    if 'bls_code' not in final_cols or 'name' not in final_cols:
        print("❌ Kritische Spalten fehlen (BLS Code oder Name). Abbruch.")
        return

    batch = []
    total_processed = 0
    total_success = 0
    BATCH_SIZE = 100

    print("Starte Upload...")

    for index, row in df.iterrows():
        try:
            bls_code = str(row[final_cols['bls_code']]).strip()
            raw_name = str(row[final_cols['name']])
            
            if pd.isna(raw_name) or raw_name == 'nan':
                continue

            name = raw_name.replace("'", "").strip() # Einfache Anführungszeichen entfernen für JSON compatibility wenn nötig, aber JSON dumps macht das eigentlich
            category = bls_code[0] if bls_code else 'X'

            def get_val(key):
                if key in final_cols:
                    return clean_number(row[final_cols[key]])
                return 0

            item = {
                "bls_code": bls_code,
                "name": name,
                "category": category,
                "calories": int(get_val('calories')),
                "fat": get_val('fat'),
                "saturated_fat": get_val('saturated_fat'),
                "carbs": get_val('carbs'),
                "sugar": get_val('sugar'),
                "fiber": get_val('fiber'),
                "protein": get_val('protein'),
                "salt": get_val('salt'),
                "iron": get_val('iron'),
                "calcium": get_val('calcium'),
                "magnesium": get_val('magnesium'),
                "zinc": get_val('zinc'),
                "vitamin_c": get_val('vitamin_c')
            }
            
            batch.append(item)
            total_processed += 1

            if len(batch) >= BATCH_SIZE:
                if post_batch(batch):
                    total_success += len(batch)
                    print(f"Fortschritt: {total_success} / {len(df)}...")
                batch = []

        except Exception as e:
            continue

    # Restlicher Batch
    if batch:
        if post_batch(batch):
            total_success += len(batch)

    print(f"✅ FERTIG! {total_success} von {total_processed} Einträgen hochgeladen.")

if __name__ == "__main__":
    run()
