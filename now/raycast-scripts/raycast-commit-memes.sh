#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Commit Meme Changes
# @raycast.mode fullOutput
# @raycast.description Stage meme AVIFs and search index, commit, and push to GitHub
# @raycast.icon 🚀
# @raycast.packageName Memes
# @raycast.timeout 600

REPO="/Users/shreeramk/Documents/code-projects/shree5k.github.io"

cd "$REPO" || exit 1

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository: $REPO"
  exit 1
fi

# Stage index, assets, and scripts (memes/ inbox is gitignored)
git add now/json/search_index.json
git add now/assets/m_*.avif 2>/dev/null
git add -u -- now/assets/
git add now/scripts/

# Drop .DS_Store if it got staged
if git diff --cached --name-only | grep -q '\.DS_Store$'; then
  git restore --staged '**/.DS_Store' 2>/dev/null || git reset HEAD -- 'now/assets/.DS_Store' 'now/.DS_Store' 2>/dev/null
fi

if git diff --cached --quiet; then
  echo "Nothing to commit."
  exit 0
fi

git commit -m "update assets"

branch=$(git branch --show-current)
echo ""
echo "Committed on $branch. Pushing to origin..."

if ! git push origin "$branch"; then
  echo ""
  echo "Push failed. Commit is saved locally — push manually when ready."
  exit 1
fi

echo ""
echo "Done. GitHub Pages will update after the push deploys."
