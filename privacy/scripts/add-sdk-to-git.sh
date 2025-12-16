#!/bin/bash

# Helper script to add privacy-cash-sdk to git for Railway deployment
# This removes the nested .git and adds it to the main repository

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SDK_DIR="$PROJECT_ROOT/privacy-cash-sdk"

if [ ! -d "$SDK_DIR" ]; then
  echo "❌ privacy-cash-sdk directory not found!"
  exit 1
fi

if [ -d "$SDK_DIR/.git" ]; then
  echo "📦 Found nested git repository in privacy-cash-sdk"
  echo "   Removing .git to add SDK to main repository..."
  rm -rf "$SDK_DIR/.git"
  echo "✅ Removed nested .git"
fi

echo "📝 Adding privacy-cash-sdk to git..."
cd "$PROJECT_ROOT"
git add privacy-cash-sdk

echo ""
echo "✅ SDK added to git staging area"
echo ""
echo "Next steps:"
echo "  1. Review changes: git status"
echo "  2. Commit: git commit -m 'Add privacy-cash-sdk with local changes'"
echo "  3. Push: git push"

