import argparse
import json
import os
import re
import sys

import ollama
from PIL import Image
from tqdm import tqdm

# --- CONFIGURATION (AVIF requires libavif: brew install libavif) ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MEMES_DIR = os.path.join(SCRIPT_DIR, "..", "assets", "memes")
ASSETS_DIR = os.path.join(SCRIPT_DIR, "..", "assets")
INDEX_FILE = os.path.join(SCRIPT_DIR, "..", "json", "search_index.json")
PREFIX = "m_"
MODEL = "gemma3"
MAX_KEYWORDS = 10
MAX_WIDTH = 1200
AVIF_QUALITY = 50
JPEG_QUALITY = 85
WEBP_QUALITY = 85
SUPPORTED_EXT = {".png", ".jpg", ".jpeg", ".webp"}
FINALIZED_RE = re.compile(r"^m_(\d+)\.", re.IGNORECASE)
LEGACY_AVIF_RE = re.compile(r"^(\d+)\.avif$", re.IGNORECASE)
# ---------------------


def load_index():
    if not os.path.exists(INDEX_FILE):
        return []
    with open(INDEX_FILE, encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def save_index(index):
    os.makedirs(os.path.dirname(INDEX_FILE), exist_ok=True)
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=4)


def parse_m_id(name):
    match = FINALIZED_RE.match(name)
    return int(match.group(1)) if match else None


def is_pending_inbox_file(name):
    if name.startswith("."):
        return False
    ext = os.path.splitext(name)[1].lower()
    if ext not in SUPPORTED_EXT:
        return False
    return parse_m_id(name) is None


def next_m_id(index, memes_dir, assets_dir):
    max_id = 0
    for entry in index:
        mid = parse_m_id(entry.get("fn", ""))
        if mid is not None:
            max_id = max(max_id, mid)
    for directory in (memes_dir, assets_dir):
        if not os.path.isdir(directory):
            continue
        for name in os.listdir(directory):
            mid = parse_m_id(name)
            if mid is not None:
                max_id = max(max_id, mid)
    return max_id + 1


def finalized_stems_in_memes(memes_dir):
    stems = set()
    if not os.path.isdir(memes_dir):
        return stems
    for name in os.listdir(memes_dir):
        mid = parse_m_id(name)
        if mid is not None:
            stems.add(f"{PREFIX}{mid}")
    return stems


def find_pending_files(memes_dir):
    if not os.path.isdir(memes_dir):
        return []
    return sorted(
        f for f in os.listdir(memes_dir) if is_pending_inbox_file(f)
    )


def parse_keywords(raw_text):
    text = raw_text.strip().lower()
    if "\n" in text:
        text = text.split("\n")[-1]
    for prefix in ("here's", "here is", "keyword analysis", "comma-separated"):
        if prefix in text:
            idx = text.find(":")
            if idx != -1:
                text = text[idx + 1 :]
    keywords = []
    for part in text.split(","):
        word = part.strip().strip('"').strip("'")
        if not word or word.startswith("```"):
            continue
        if any(skip in word for skip in ("keyword", "analysis", "image:")):
            continue
        if word not in keywords:
            keywords.append(word)
    return " ".join(keywords[:MAX_KEYWORDS])


def optimize_image(path):
    with Image.open(path) as img:
        img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
        if img.width > MAX_WIDTH:
            ratio = MAX_WIDTH / img.width
            size = (MAX_WIDTH, max(1, int(img.height * ratio)))
            img = img.resize(size, Image.Resampling.LANCZOS)

        ext = os.path.splitext(path)[1].lower()
        save_kwargs = {}
        if ext == ".png":
            save_kwargs = {"optimize": True}
        elif ext in (".jpg", ".jpeg"):
            save_kwargs = {"quality": JPEG_QUALITY, "optimize": True, "progressive": True}
        elif ext == ".webp":
            save_kwargs = {"quality": WEBP_QUALITY, "method": 6}

        img.save(path, **save_kwargs)


def convert_to_avif(src_path, avif_path):
    with Image.open(src_path) as img:
        img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
        os.makedirs(os.path.dirname(avif_path), exist_ok=True)
        img.save(avif_path, format="AVIF", quality=AVIF_QUALITY)


def get_keywords_from_ai(image_path, filename):
    prompt = f"""
    Analyze this image and provide exactly {MAX_KEYWORDS} or fewer precise keywords.
    Include: Objects, Text (start with 'text:'), Situational triggers (when...), and Vibe.
    Return ONLY a comma-separated list. Max {MAX_KEYWORDS} keywords total.
    """
    try:
        response = ollama.generate(
            model=MODEL, prompt=prompt, images=[image_path], stream=False
        )
        return parse_keywords(response["response"])
    except Exception as e:
        print(f"\n[!] Error analyzing {filename}: {e}")
        return ""


def migrate_legacy_names():
    index = load_index()
    if not index:
        print("No index entries to migrate.")
        return

    avif_renamed = 0
    meme_renamed = 0
    index_updated = 0

    for entry in index:
        old_fn = entry["fn"]
        if old_fn.startswith(PREFIX):
            continue

        match = LEGACY_AVIF_RE.match(old_fn)
        if not match:
            print(f"  skip unexpected fn: {old_fn}")
            continue

        num = match.group(1)
        new_fn = f"{PREFIX}{num}.avif"
        old_avif = os.path.join(ASSETS_DIR, old_fn)
        new_avif = os.path.join(ASSETS_DIR, new_fn)

        if os.path.exists(old_avif) and not os.path.exists(new_avif):
            os.rename(old_avif, new_avif)
            avif_renamed += 1

        entry["fn"] = new_fn
        index_updated += 1

        for ext in SUPPORTED_EXT:
            old_meme = os.path.join(MEMES_DIR, num + ext)
            new_meme = os.path.join(MEMES_DIR, PREFIX + num + ext)
            if os.path.exists(old_meme) and not os.path.exists(new_meme):
                os.rename(old_meme, new_meme)
                meme_renamed += 1
                break

    save_index(index)
    print(
        f"Migration done: {index_updated} index entries, "
        f"{avif_renamed} avifs, {meme_renamed} meme sources renamed."
    )


def prune_index_and_assets(index, force=False):
    stems = finalized_stems_in_memes(MEMES_DIR)
    if not stems and index and not force:
        print(
            f"Aborting prune: no finalized m_* sources in {MEMES_DIR} "
            f"but index has {len(index)} entries. Use --force-prune to override."
        )
        return index, False

    kept = []
    removed = 0
    for entry in index:
        fn = entry.get("fn", "")
        stem = os.path.splitext(fn)[0]
        if stem in stems:
            kept.append(entry)
            continue

        avif_path = os.path.join(ASSETS_DIR, fn)
        if os.path.exists(avif_path):
            os.remove(avif_path)
        removed += 1

    if removed:
        print(f"Pruned {removed} index entries (and AVIFs) with no meme source.")
    return kept, True


def process_pending(filename, index, m_id):
    src_path = os.path.join(MEMES_DIR, filename)
    ext = os.path.splitext(filename)[1].lower()
    stem = f"{PREFIX}{m_id}"
    final_src = os.path.join(MEMES_DIR, stem + ext)
    avif_fn = f"{stem}.avif"
    avif_path = os.path.join(ASSETS_DIR, avif_fn)

    optimize_image(src_path)
    if os.path.abspath(src_path) != os.path.abspath(final_src):
        os.rename(src_path, final_src)
        src_path = final_src

    keywords = get_keywords_from_ai(src_path, os.path.basename(src_path))
    if not keywords:
        print(f"\n[!] No keywords for {filename}; skipping index update.")
        return index, False

    convert_to_avif(src_path, avif_path)
    index.append({"fn": avif_fn, "kw": keywords})
    save_index(index)
    return index, True


def run_sync(force_prune=False):
    if not os.path.isdir(MEMES_DIR):
        print(f"Error: {MEMES_DIR} not found.")
        return 1

    index = load_index()
    index, ok = prune_index_and_assets(index, force=force_prune)
    if not ok:
        return 1
    save_index(index)

    indexed_fns = {entry["fn"] for entry in index}
    pending = find_pending_files(MEMES_DIR)
    next_id = next_m_id(index, MEMES_DIR, ASSETS_DIR)

    finalized_count = len(indexed_fns)
    if not pending:
        print(f"Index up to date ({finalized_count} finalized memes).")
        return 0

    print(f"Processing {len(pending)} pending inbox file(s)...")
    pbar = tqdm(pending, desc="Ingest")
    for filename in pbar:
        pbar.set_description(f"Ingest {filename} -> m_{next_id}")
        index, ok = process_pending(filename, index, next_id)
        if ok:
            next_id += 1

    print(f"Done. Total finalized memes: {len(index)}")
    return 0


def main():
    parser = argparse.ArgumentParser(description="Meme ingest: optimize, keyword, AVIF, index.")
    parser.add_argument(
        "--migrate",
        action="store_true",
        help="Rename legacy N.avif -> m_N.avif (idempotent)",
    )
    parser.add_argument(
        "--force-prune",
        action="store_true",
        help="Allow pruning when no finalized meme sources exist",
    )
    args = parser.parse_args()

    if args.migrate:
        migrate_legacy_names()
        return 0
    return run_sync(force_prune=args.force_prune)


if __name__ == "__main__":
    sys.exit(main())
