#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Add Slang
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 📋
# @raycast.packageName Clipboard Tools

# Documentation:
# @raycast.description Capture selected text, edit in a full text window, then add slang to your Google Sheet.

GAS_WEBAPP_URL="https://script.google.com/macros/s/AKfycbwttTs2hSLADJ2AXyWbbajXwAWl7T7mbp9Vsa02nCy4TuvZplbvCNAOgmHgDx1muwNliQ/exec"

capture_selection() {
  prev=$(pbpaste)

  selected_text=$(osascript <<'APPLESCRIPT'
tell application "System Events"
  set hadRaycast to false
  if exists process "Raycast" then
    set hadRaycast to true
    set visible of process "Raycast" to false
    delay 0.2
  end if

  set copiedText to ""
  try
    tell (first application process whose frontmost is true)
      set copiedText to value of attribute "AXSelectedText" of (first UI element whose focused of it is true)
    end tell
  end try

  if copiedText is missing value then
    set copiedText to ""
  end if

  if copiedText is "" then
    set the clipboard to ""
    keystroke "c" using command down
    repeat 15 times
      delay 0.1
      try
        set copiedText to the clipboard as text
      end try
      if copiedText is not "" and copiedText is not missing value then exit repeat
    end repeat
  end if

  if copiedText is missing value then
    set copiedText to ""
  end if

  if hadRaycast then
    set visible of process "Raycast" to true
  end if

  return copiedText
end tell
APPLESCRIPT
)

  if [ -n "$selected_text" ]; then
    TEXT=$(printf '%s' "$selected_text" | python3 -c 'import sys; print(sys.stdin.read().rstrip("\n"), end="")')
    return 0
  fi

  if [ -n "$prev" ]; then
    TEXT=$(printf '%s' "$prev" | python3 -c 'import sys; print(sys.stdin.read().rstrip("\n"), end="")')
    return 0
  fi

  return 1
}

TEXT=""

if ! capture_selection; then
  afplay /System/Library/Sounds/Basso.aiff &
  echo "No text selected."
  exit 1
fi

initial_file=$(mktemp)
trap 'rm -f "$initial_file"' EXIT
printf '%s' "$TEXT" > "$initial_file"

TEXT=$(python3 - "$initial_file" <<'PY'
import sys
import tkinter as tk
from tkinter import scrolledtext

with open(sys.argv[1], encoding="utf-8") as handle:
    initial = handle.read()
state = {"text": None}

root = tk.Tk()
root.title("Add Slang")
root.attributes("-topmost", True)
root.minsize(380, 220)
root.resizable(True, True)

container = tk.Frame(root, padx=10, pady=10)
container.pack(fill=tk.BOTH, expand=True)

label = tk.Label(container, text="Edit slang before sending:", anchor="w")
label.pack(fill=tk.X, pady=(0, 6))

editor = scrolledtext.ScrolledText(
    container,
    width=48,
    height=8,
    wrap=tk.WORD,
    font=("Menlo", 12),
    undo=True,
)
editor.pack(fill=tk.BOTH, expand=True)
editor.insert("1.0", initial)
editor.mark_set(tk.INSERT, tk.END)
editor.focus_set()

def send(_event=None):
    state["text"] = editor.get("1.0", "end-1c")
    root.destroy()
    return "break"

def cancel(_event=None):
    root.destroy()

actions = tk.Frame(container)
actions.pack(fill=tk.X, pady=(12, 0))

tk.Button(actions, text="Cancel", width=12, command=cancel).pack(side=tk.RIGHT, padx=(8, 0))
tk.Button(actions, text="Add Slang", width=14, command=send).pack(side=tk.RIGHT)

root.bind("<Escape>", cancel)
editor.bind("<Command-Return>", send)
editor.bind("<Command-KP_Enter>", send)
root.bind("<Command-Return>", send)
root.bind("<Command-KP_Enter>", send)
root.protocol("WM_DELETE_WINDOW", cancel)

root.update_idletasks()
window_width = 420
window_height = 240
pos_x = (root.winfo_screenwidth() - window_width) // 2
pos_y = (root.winfo_screenheight() - window_height) // 2
root.geometry(f"{window_width}x{window_height}+{pos_x}+{pos_y}")

root.mainloop()

if state["text"] is None:
    sys.exit(2)

print(state["text"], end="")
PY
)

status=$?

if [ "$status" -eq 2 ]; then
  echo "Cancelled."
  exit 0
fi

if [ "$status" -ne 0 ] || [ -z "$TEXT" ]; then
  afplay /System/Library/Sounds/Basso.aiff &
  echo "No text provided."
  exit 1
fi

afplay /System/Library/Sounds/Tink.aiff &

json_payload=$(printf '%s' "$TEXT" | python3 -c 'import json,sys; print(json.dumps({"text": sys.stdin.read()}))')

# Do not use -X POST: Apps Script redirects with 302 and expects GET on the redirect URL.
response=$(curl -s -L -w "\n%{http_code}" \
  -H "Content-Type: application/json" \
  --data-binary @- <<< "$json_payload" \
  "$GAS_WEBAPP_URL")

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

result=$(python3 -c '
import json, sys

body = sys.stdin.read().strip()
if not body:
    print("ERROR:Empty response")
    sys.exit(0)

try:
    data = json.loads(body)
except json.JSONDecodeError:
    print("ERROR:invalid")
    sys.exit(0)

status = data.get("status")
if status == "success":
    entry_id = data.get("data", {}).get("id", "?")
    print(f"OK:{entry_id}")
elif status == "error":
    print("ERROR:" + data.get("message", "Unknown error"))
else:
    print("ERROR:Unexpected response")
' <<< "$body")

if [[ "$result" == OK:* ]]; then
  entry_id="${result#OK:}"
  afplay /System/Library/Sounds/Glass.aiff &
  echo "Slang added ✓ (id: $entry_id)"
  exit 0
fi

afplay /System/Library/Sounds/Basso.aiff &
if [[ "$result" == ERROR:* ]]; then
  echo "${result#ERROR:}"
elif [ "$http_code" -ne 200 ]; then
  echo "Request failed (HTTP $http_code)"
else
  echo "Failed to parse response"
fi
exit 1
