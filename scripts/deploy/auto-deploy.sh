#!/bin/bash

# Automatic Deployment Script for Emerald Cash VMS
# This script automates GitHub push and Vercel deployment

set -e

echo "🚀 Emerald Cash VMS - Auto Deployment"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
info() { echo -e "${CYAN}ℹ${NC} $1"; }

# Step 1: Clean up duplicate files
echo "🧹 Cleaning up duplicate files..."
find . -name "* 2.*" -type f -delete 2>/dev/null || true
log "Cleanup complete"

# Step 2: Check and update .gitignore
echo ""
echo "📝 Updating .gitignore..."
cat > .gitignore << 'EOF'
# dependencies
/node_modules
/.pnp
.pnp.js
.yarn/install-state.gz

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# IDE
.idea/
.vscode/
*.swp
*.swo
EOF
log ".gitignore updated"

# Step 3: Git configuration
echo ""
echo "⚙️  Git configuration..."
if [ -z "$(git config user.name)" ]; then
    read -p "Enter your name: " GIT_NAME
    git config user.name "$GIT_NAME"
fi
if [ -z "$(git config user.email)" ]; then
    read -p "Enter your email: " GIT_EMAIL
    git config user.email "$GIT_EMAIL"
fi
log "Git configured: $(git config user.name)"

# Step 4: GitHub authentication
echo ""
echo "🔐 GitHub Authentication"
echo "------------------------"
echo "To continue, you need to authenticate with GitHub."
echo ""
echo "Please run these commands in a NEW terminal:"
echo ""
echo "  1️⃣  Login to GitHub:"
echo "      gh auth login"
echo ""
echo "      Select: 'Login with a web browser'"
echo "      Copy the code shown, press Enter"
echo "      Complete authentication in browser"
echo ""
echo "  2️⃣  After login, come back and run:"
echo "      cd /Users/apple/Desktop/vms-next"
echo "      bash auto-deploy.sh continue"
echo ""
echo "⏸️  Waiting for authentication... (Press Ctrl+C to cancel)"
echo ""

read -p "Have you completed authentication? (press Enter after 'gh auth login' completes): " ready

# Check auth status
if ! gh auth status &> /dev/null; then
    warn "Not authenticated. Please run 'gh auth login' first."
    exit 1
fi

log "Successfully authenticated with GitHub!"

# Step 5: Get GitHub username
GH_USERNAME=$(gh api user --jq '.login' 2>/dev/null)
REPO_NAME="vms-next"

log "GitHub username: $GH_USERNAME"
log "Repository name: $REPO_NAME"

# Step 6: Stage and commit
echo ""
echo "💾 Committing changes..."
git add -A

if git diff --cached --quiet; then
    warn "No changes to commit"
else
    git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M')"
    log "Changes committed"
fi

# Step 7: Create or update GitHub repository
echo ""
echo "🐙 GitHub Repository"
echo "--------------------"

if git remote get-url origin &> /dev/null; then
    log "Remote already exists: $(git remote get-url origin)"
else
    log "Creating GitHub repository..."
    gh repo create "$REPO_NAME" --public --source=. --push
    log "Repository created and pushed!"
fi

# Step 8: Final deployment instructions
echo ""
echo "⚡ Vercel Deployment"
echo "===================="
echo ""
echo "Your code is now on GitHub! To deploy to Vercel (FREE):"
echo ""
echo "Option 1 - Vercel CLI (fastest):"
echo "  npm i -g vercel"
echo "  vercel"
echo ""
echo "Option 2 - Vercel Dashboard:"
echo "  1. Go to https://vercel.com/new"
echo "  2. Click 'Import' on your '$REPO_NAME' repository"
echo "  3. Add these environment variables:"
echo "     • NEXT_PUBLIC_API_URL = (your Google Apps Script URL)"
echo "     • SESSION_SECRET = (generate a random string)"
echo "  4. Click 'Deploy'"
echo ""
echo "✅ Deployment ready!"
echo ""
echo "📋 Quick commands:"
echo "   cd /Users/apple/Desktop/vms-next"
echo "   git push"
echo "   vercel --yes"

