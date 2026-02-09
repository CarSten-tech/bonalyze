import pandas as pd
import os
import sys

# KONFIGURATION
DATA_DIR = 'data'
XLSX_FILE = 'bls_data.xlsx'  # Wir suchen zuerst hiernach
CSV_FILE = 'bls_data.csv'    # Fallback

OUTPUT_FILE = 'migrations/017_seed_bls_clinical.sql'

def clean_number(val):
    if pd.isna(val): return 0
    s = str(val).strip()
    if s == '' or s == '-' or s.startswith('<'): return 0
    # Komma zu Punkt (für CSVs wichtig, Excel macht das meist automatisch)
    s = s.replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return 0

def run():
    xlsx_path = os.path.join(DATA_DIR, XLSX_FILE)
    csv_path = os.path.join(DATA_DIR, CSV_FILE)
    
    df = None
    
    # 1. Versuch: EXCEL (Empfohlen)
    if os.path.exists(xlsx_path):
        print(f"✅ Excel-Datei gefunden: {xlsx_path}")
        print("Lese Excel (das dauert kurz, bitte warten)...")
        try:
            df = pd.read_excel(xlsx_path, engine='openpyxl')
        except Exception as e:
            print(f"❌ Fehler beim Excel-Lesen: {e}")
            print("Tipp: Hast du 'pip install openpyxl' ausgeführt?")
            return
            
    # 2. Versuch: CSV (Fallback)
    elif os.path.exists(csv_path):
        print(f"⚠️ Keine Excel gefunden, versuche CSV: {csv_path}")
        print("Achtung: CSV ist fehleranfällig. Ignoriere kaputte Zeilen...")
        try:
            # on_bad_lines='skip' überspringt die Zeilen, die den Fehler verursachen (z.B. Zeile 9)
            df = pd.read_csv(csv_path, sep=None, engine='python', encoding='latin-1', on_bad_lines='skip')
        except Exception as e:
            print(f"❌ Auch CSV konnte nicht gelesen werden: {e}")
            return
    else:
        print(f"❌ Weder {XLSX_FILE} noch {CSV_FILE} im Ordner '{DATA_DIR}' gefunden!")
        return

    # Ab hier: Daten verarbeiten
    print(f"Daten geladen! {len(df)} Zeilen gefunden.")
    print("Mappe Spalten...")

    # Mapping (Teilstrings der Spaltennamen)
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

    # Echte Spalten finden
    final_cols = {}
    for key, search_term in column_mapping.items():
        found = False
        for col in df.columns:
            if str(col).startswith(search_term):
                final_cols[key] = col
                found = True
                break
        if not found:
            # Fallback für CSVs, manchmal heißen die Spalten anders
            print(f"Info: Spalte '{search_term}' nicht exakt gefunden.")

    # SQL Generieren
    print(f"Generiere SQL in {OUTPUT_FILE}...")
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("BEGIN;\n\n")
        count = 0
        success_count = 0
        
        for index, row in df.iterrows():
            try:
                # Pflichtfeld Name prüfen
                if 'bls_code' not in final_cols or 'name' not in final_cols:
                    print("Kritische Spalten fehlen. Abbruch.")
                    break
                    
                bls_code = str(row[final_cols['bls_code']]).strip()
                raw_name = str(row[final_cols['name']])
                
                # Wenn Name leer oder ungültig, überspringen
                if pd.isna(raw_name) or raw_name == 'nan':
                    continue

                name = raw_name.replace(',', '').replace("'", "''").strip()
                category = bls_code[0] if bls_code else 'X'

                # Werte holen (sicher mit .get, falls Spalte fehlt)
                def get_val(key):
                    if key in final_cols:
                        return clean_number(row[final_cols[key]])
                    return 0

                calories = int(get_val('calories'))
                fat = get_val('fat')
                saturated = get_val('saturated_fat')
                carbs = get_val('carbs')
                sugar = get_val('sugar')
                fiber = get_val('fiber')
                protein = get_val('protein')
                salt = get_val('salt')
                iron = get_val('iron')
                calcium = get_val('calcium')
                magnesium = get_val('magnesium')
                zinc = get_val('zinc')
                vit_c = get_val('vitamin_c')

                sql = f"""INSERT INTO public.nutrition_library 
(bls_code, name, category, calories, fat, saturated_fat, carbs, sugar, fiber, protein, salt, iron, calcium, magnesium, zinc, vitamin_c) 
VALUES ('{bls_code}', '{name}', '{category}', {calories}, {fat}, {saturated}, {carbs}, {sugar}, {fiber}, {protein}, {salt}, {iron}, {calcium}, {magnesium}, {zinc}, {vit_c}) 
ON CONFLICT (bls_code) DO NOTHING;\n"""
                f.write(sql)
                success_count += 1
                
                if success_count % 1000 == 0:
                    print(f"{success_count} Einträge geschrieben...")
                    
            except Exception as e:
                # Einzelne Zeilenfehler ignorieren wir jetzt
                continue

        f.write("\nCOMMIT;\n")
        print(f"FERTIG! {success_count} Einträge erfolgreich exportiert.")

if __name__ == "__main__":
    run()