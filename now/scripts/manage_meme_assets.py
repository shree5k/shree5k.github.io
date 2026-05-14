import os
import json
import ollama
from tqdm import tqdm

# --- CONFIGURATION ---
PNG_SOURCE_DIR = os.path.join("../assets", "memes") # AI reads from here
INDEX_FILE = "../json/search_index.json"                  # Master Index
MODEL = "gemma3"                                  # Ollama model
MAX_KEYWORDS = 10 
# ---------------------

def get_keywords_from_ai(image_path, filename):
    prompt = f"""
    Analyze this image and provide exactly {MAX_KEYWORDS} or fewer precise keywords.
    Include: Objects, Text (start with 'text:'), Situational triggers (when...), and Vibe.
    Return ONLY a comma-separated list. Max {MAX_KEYWORDS} keywords total.
    """
    try:
        response = ollama.generate(model=MODEL, prompt=prompt, images=[image_path], stream=False)
        raw_text = response['response'].strip().lower()
        keywords = [k.strip().replace('"', '') for k in raw_text.split(',') if k.strip()]
        unique = []
        for k in keywords:
            if k not in unique: unique.append(k)
        return " ".join(unique[:MAX_KEYWORDS])
    except Exception as e:
        print(f"\n[!] Error analyzing {filename}: {e}")
        return ""

def run_sync():
    # 1. Load existing index
    master_index = []
    if os.path.exists(INDEX_FILE):
        with open(INDEX_FILE, 'r', encoding='utf-8') as f:
            try: master_index = json.load(f)
            except: master_index = []

    # 2. Sync with Folder (Cleanup deleted)
    all_pngs = sorted([f for f in os.listdir(PNG_SOURCE_DIR) if f.lower().endswith('.png')])
    png_bases = {os.path.splitext(f)[0] for f in all_pngs}
    master_index = [item for item in master_index if os.path.splitext(item['fn'])[0] in png_bases]
    
    # 3. Identify New
    indexed_fns = {item['fn'] for item in master_index}
    to_process = [f for f in all_pngs if (os.path.splitext(f)[0] + ".avif") not in indexed_fns]

    if not to_process:
        print(f"✅ Index up to date ({len(master_index)} images).")
        with open(INDEX_FILE, "w", encoding='utf-8') as f:
            json.dump(master_index, f, indent=4)
        return

    print(f"🚀 Processing {len(to_process)} new images...")
    
    pbar = tqdm(to_process, desc="AI Analysis")
    for filename in pbar:
        pbar.set_description(f"Processing {filename}")
        image_path = os.path.join(PNG_SOURCE_DIR, filename)
        keywords = get_keywords_from_ai(image_path, filename)
        
        if keywords:
            # Map PNG filename to AVIF for the website
            avif_version = os.path.splitext(filename)[0] + ".avif"
            master_index.append({"fn": avif_version, "kw": keywords})
            
            # Save progress after every image
            with open(INDEX_FILE, "w", encoding='utf-8') as f:
                json.dump(master_index, f, indent=4)

    print(f"\n✨ Success! Total images in index: {len(master_index)}")

if __name__ == "__main__":
    if not os.path.exists(PNG_SOURCE_DIR):
        print(f"Error: {PNG_SOURCE_DIR} not found.")
    else:
        run_sync()