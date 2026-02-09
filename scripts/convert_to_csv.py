import pandas as pd
import os

# KONFIGURATION
INPUT_FILE = 'data/bls_data.xlsx'      # Deine Excel-Quelle
OUTPUT_FILE = 'data/bls_import_ready.csv' # Das saubere Ergebnis

def clean_number(val):
    """Macht aus '10,5' -> 10.5 und entfernt '<' Zeichen"""
    if pd.isna(val): return 0
    s = str(val).strip()
    if s == '' or s == '-': return 0
    if s.startswith('<'): return 0 # Werte unter Nachweisgrenze als 0 behandeln
    
    # Komma zu Punkt
    s = s.replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return 0

def run():
    print(f"1. Lese Excel-Datei: {INPUT_FILE} ...")
    if not os.path.exists(INPUT_FILE):
        print("❌ Datei nicht gefunden! Bitte prüf den Namen.")
        return

    # Nur die Spalten laden, die wir brauchen (Mapping)
    # Links: Wie es in deiner App heißt | Rechts: Wonach wir im Excel suchen
    search_terms = {
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

    df = pd.read_excel(INPUT_FILE, engine='openpyxl')
    
    # Wir bauen eine neue, saubere Tabelle
    clean_data = []

    # Echte Spaltennamen im Excel finden
    final_cols = {}
    for my_col, search_term in search_terms.items():
        for excel_col in df.columns:
            if str(excel_col).startswith(search_term):
                final_cols[my_col] = excel_col
                break

    print("2. Bereinige Daten & Wähle Spalten aus...")
    
    for index, row in df.iterrows():
        try:
            # Code & Name sind Pflicht
            code = str(row[final_cols['bls_code']]).strip()
            name = str(row[final_cols['name']]).strip()
            
            if not code or not name or name.lower() == 'nan':
                continue

            # Kategorie ist der erste Buchstabe des Codes
            category = code[0]

            # Neue Zeile bauen
            entry = {
                'bls_code': code,
                'name': name,
                'category': category,
                'calories': int(clean_number(row.get(final_cols.get('calories')))),
                'fat': clean_number(row.get(final_cols.get('fat'))),
                'saturated_fat': clean_number(row.get(final_cols.get('saturated_fat'))),
                'carbs': clean_number(row.get(final_cols.get('carbs'))),
                'sugar': clean_number(row.get(final_cols.get('sugar'))),
                'fiber': clean_number(row.get(final_cols.get('fiber'))),
                'protein': clean_number(row.get(final_cols.get('protein'))),
                'salt': clean_number(row.get(final_cols.get('salt'))),
                # Mikros
                'iron': clean_number(row.get(final_cols.get('iron'))),
                'calcium': clean_number(row.get(final_cols.get('calcium'))),
                'magnesium': clean_number(row.get(final_cols.get('magnesium'))),
                'zinc': clean_number(row.get(final_cols.get('zinc'))),
                'vitamin_c': clean_number(row.get(final_cols.get('vitamin_c'))),
            }
            clean_data.append(entry)
            
        except Exception:
            continue

    # Speichern
    print(f"3. Speichere saubere CSV...")
    clean_df = pd.DataFrame(clean_data)
    clean_df.to_csv(OUTPUT_FILE, index=False, encoding='utf-8')
    
    print("-" * 30)
    print(f"✅ FERTIG! {len(clean_df)} Lebensmittel bereit.")
    print(f"Lade jetzt diese Datei hoch: {OUTPUT_FILE}")

if __name__ == "__main__":
    run()