import os
import json

# Configuration
ASSETS_DIR = "../assets"
OUTPUT_JSON = "../images.json"

def run_new():
    """Renames ALL files from scratch and makes a fresh json."""
    print("\n--- Running NEW ---")
    files = [f for f in os.listdir(ASSETS_DIR) if f.lower().endswith('.avif')]
    files.sort()

    if not files:
        print(f"No .avif files found in '{ASSETS_DIR}'.")
        return

    # Step A: Rename to temporary names to avoid overwrite collisions
    temp_names = []
    for i, filename in enumerate(files):
        old_path = os.path.join(ASSETS_DIR, filename)
        temp_name = f"temp_{i}.avif"
        temp_path = os.path.join(ASSETS_DIR, temp_name)
        os.rename(old_path, temp_path)
        temp_names.append(temp_name)

    # Step B: Rename to final numbers (1.avif, 2.avif...)
    renamed_files = []
    for i, temp_name in enumerate(temp_names):
        temp_path = os.path.join(ASSETS_DIR, temp_name)
        final_name = f"{i + 1}.avif"
        final_path = os.path.join(ASSETS_DIR, final_name)
        os.rename(temp_path, final_path)
        renamed_files.append(final_name)

    # Create the JSON file
    with open(OUTPUT_JSON, "w") as f:
        json.dump(renamed_files, f, indent=4)

    print(f"Success! Renamed all {len(renamed_files)} files and generated '{OUTPUT_JSON}'.")


def run_update():
    """Keeps existing files intact, renames new files sequentially, updates json."""
    print("\n--- Running UPDATE ---")
    
    # 1. Load existing JSON
    if not os.path.exists(OUTPUT_JSON):
        print(f"No '{OUTPUT_JSON}' found. Falling back to 'NEW' mode...")
        return run_new()

    with open(OUTPUT_JSON, 'r') as f:
        try:
            tracked_files = json.load(f)
        except json.JSONDecodeError:
            tracked_files = []

    # 2. Get all current avif files in folder
    all_files = [f for f in os.listdir(ASSETS_DIR) if f.lower().endswith('.avif')]

    # 3. Clean up tracked files (in case you deleted an image manually)
    tracked_files = [f for f in tracked_files if f in all_files]

    # 4. Find completely NEW untracked files
    untracked_files = [f for f in all_files if f not in tracked_files]

    if not untracked_files:
        print("No new images found to update. Your JSON is already up to date!")
        # Save anyway just in case we cleaned up deleted files
        with open(OUTPUT_JSON, "w") as f:
            json.dump(tracked_files, f, indent=4)
        return

    untracked_files.sort()

    # 5. Determine the highest existing number so we can increment from it
    max_num = 0
    for f in tracked_files:
        name, _ = os.path.splitext(f)
        if name.isdigit():
            max_num = max(max_num, int(name))

    next_num = max_num + 1
    newly_tracked = []

    # 6. Rename new files and append to list
    for filename in untracked_files:
        old_path = os.path.join(ASSETS_DIR, filename)
        new_name = f"{next_num}.avif"
        new_path = os.path.join(ASSETS_DIR, new_name)

        # Safety check: if a file with this number exists (but wasn't in json), skip to next number
        while os.path.exists(new_path):
            next_num += 1
            new_name = f"{next_num}.avif"
            new_path = os.path.join(ASSETS_DIR, new_name)

        os.rename(old_path, new_path)
        newly_tracked.append(new_name)
        next_num += 1

    # 7. Update JSON
    tracked_files.extend(newly_tracked)
    with open(OUTPUT_JSON, "w") as f:
        json.dump(tracked_files, f, indent=4)

    print(f"Success! Renamed and added {len(newly_tracked)} NEW images.")
    print(f"Total images now tracked: {len(tracked_files)}")


def main():
    if not os.path.exists(ASSETS_DIR):
        print(f"Error: Could not find the '{ASSETS_DIR}' folder.")
        return

    print("=======================================")
    print("  Image Asset Manager")
    print("=======================================")
    print("1. NEW    (Renames ALL images from scratch, resets list)")
    print("2. UPDATE (Keeps existing names, renames only new images, updates list)")
    print("=======================================")
    
    choice = input("Enter 1 or 2: ").strip()
    
    if choice == '1':
        run_new()
    elif choice == '2':
        run_update()
    else:
        print("Invalid choice. Exiting.")

if __name__ == "__main__":
    main()