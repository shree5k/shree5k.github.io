# Converting PNG to WebP

Batch-convert every `.png` inside the `assets/` folder (and its subfolders) to `.webp` using `cwebp`.

## Prerequisites

Install `cwebp` via Homebrew (one-time):

```bash
brew install webp
```

## Run from the `assets/` directory

```bash
cd assets

for f in $(find . -name "*.png"); do
  cwebp -q 80 "$f" -o "${f%.png}.webp"
done
```

`-q 80` sets quality to 80 (good balance of size vs fidelity). Adjust as needed.

## What this does

- Recursively finds every `.png` file under the current directory.
- Converts each to a `.webp` file in the same location with the same name.
- Original `.png` files are kept (not deleted).

## After converting

Update any references in `data.json`, HTML files, or CSS that point to `.png` so they point to `.webp` instead.
