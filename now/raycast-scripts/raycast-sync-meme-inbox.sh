#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Sync Meme Inbox
# @raycast.mode fullOutput
# @raycast.description Process new memes: optimize, keywords, AVIF, index
# @raycast.icon 🖼
# @raycast.packageName Memes
# @raycast.timeout 3600

NOW="/Users/shreeramk/Documents/code-projects/shree5k.github.io/now"
PYTHON="$NOW/.venv/bin/python"
SCRIPT="$NOW/scripts/manage_meme_assets.py"

if ! curl -sf "http://127.0.0.1:11434/api/tags" >/dev/null; then
  echo "Ollama is not running. Start Ollama first, then try again."
  exit 1
fi

cd "$NOW/scripts" || exit 1
"$PYTHON" "$SCRIPT"