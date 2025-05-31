#!/bin/bash
# scripts/sync-version.sh

set -e  # Exit on any error

if [ $# -eq 0 ]; then
    echo "❌ Usage: $0 <version>"
    echo "📝 Example: $0 1.2.3"
    exit 1
fi

VERSION=$1

# Validate version format (basic semver check)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
    echo "❌ Invalid version format. Use semantic versioning (e.g., 1.2.3)"
    exit 1
fi

echo "🔄 Syncing version $VERSION across all files..."

# 1. Update package.json
echo "📦 Updating package.json..."
npm version $VERSION --no-git-tag-version

# 2. Update tauri.conf.json
echo "🦀 Updating tauri.conf.json..."
if command -v jq >/dev/null 2>&1; then
    jq --arg version "$VERSION" '.version = $version' src-tauri/tauri.conf.json > src-tauri/tauri.conf.json.tmp
    mv src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json
else
    echo "⚠️  jq not found, using sed fallback..."
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json
    rm -f src-tauri/tauri.conf.json.bak
fi

# 3. Update Cargo.toml
echo "📋 Updating Cargo.toml..."
sed -i.bak "s/^version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml
rm -f src-tauri/Cargo.toml.bak

echo ""
echo "✅ All versions updated successfully!"
echo ""
echo "📋 Verification:"
echo "package.json:     $(jq -r '.version' package.json)"
echo "tauri.conf.json:  $(jq -r '.version' src-tauri/tauri.conf.json || grep '"version"' src-tauri/tauri.conf.json)"
echo "Cargo.toml:       $(grep '^version =' src-tauri/Cargo.toml)"
echo ""
echo "🚀 Next steps:"
echo "git add ."
echo "git commit -m 'bump version to v$VERSION'"
echo "git tag v$VERSION"
echo "git push origin main --tags"