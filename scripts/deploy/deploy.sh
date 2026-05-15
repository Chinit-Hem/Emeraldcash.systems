#!/bin/bash

# Emerald Cash VMS - Deployment Script
# This script helps you push to GitHub and deploy to Vercel for FREE

set -e

echo "🚀 Emerald Cash VMS Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Step 1: Check prerequisites
echo ""
echo "📋 Step 1: Checking prerequisites..."

if ! command -v git &> /dev/null; then
    print_error "Git is not installed"
    exit 1
fi
print_status "Git is installed"

if ! command -v gh &> /dev/null; then
    print_warning "GitHub CLI (gh) is not installed"
    echo "  Install it with: brew install gh"
fi

# Step 2: Check GitHub authentication
echo ""
echo "🔐 Step 2: GitHub Authentication"
echo "--------------------------------"

if ! gh auth status &> /dev/null; then
    print_warning "Not logged into GitHub CLI"
    echo ""
    echo "To continue, you need to authenticate with GitHub:"
    echo ""
    echo "Option A - Using GitHub CLI (recommended):"
    echo "  1. Run: gh auth login"
    echo "  2. Choose 'Login with a web browser'"
    echo "  3. Copy the code shown"
    echo "  4. Press Enter to open browser"
    echo "  5. Paste the code to authenticate"
    echo ""
    echo "Option B - Using HTTPS with Personal Access Token:"
    echo "  1. Create a PAT at: https://github.com/settings/tokens"
    echo "  2. Run: git remote set-url origin https://USERNAME:TOKEN@github.com/USERNAME/REPO.git"
    echo ""
    read -p "Have you authenticated with GitHub? (y/n): " auth_confirm
    
    if [ "$auth_confirm" != "y" ]; then
        echo ""
        echo "Please authenticate first, then run this script again."
        echo "After authentication, run: gh repo create vms-next --public --source=. --push"
        exit 0
    fi
else
    print_status "Logged into GitHub CLI"
    
    # Get GitHub username
    GH_USERNAME=$(gh api user --jq '.login' 2>/dev/null || echo "")
    if [ -n "$GH_USERNAME" ]; then
        print_status "GitHub username: $GH_USERNAME"
    fi
fi

# Step 3: Git setup
echo ""
echo "📝 Step 3: Git Configuration"
echo "-----------------------------"

# Set git user if not set
if [ -z "$(git config user.name)" ]; then
    read -p "Enter your name for git commits: " GIT_NAME
    git config user.name "$GIT_NAME"
fi

if [ -z "$(git config user.email)" ]; then
    read -p "Enter your email for git commits: " GIT_EMAIL
    git config user.email "$GIT_EMAIL"
fi

print_status "Git configured: $(git config user.name) <$(git config user.email)>"

# Step 4: Clean up duplicate files
echo ""
echo "🧹 Step 4: Cleaning up..."
echo "--------------------------"

# Remove duplicate files with " 2" suffix
DUPLICATES=$(find . -name "* 2.*" -type f 2>/dev/null || true)
if [ -n "$DUPLICATES" ]; then
    echo "Removing duplicate files..."
    echo "$DUPLICATES" | while read -r file; do
        rm -f "$file"
        echo "  Removed: $file"
    done
    print_status "Cleaned up duplicate files"
fi

# Step 5: Initialize or update git repo
echo ""
echo "🔄 Step 5: Git Repository"
echo "--------------------------"

if [ ! -d ".git" ]; then
    print_warning "Git repository not initialized"
    read -p "Initialize git repository? (y/n): " init_git
    if [ "$init_git" = "y" ]; then
        git init
        git branch -M main
        print_status "Git repository initialized"
    fi
else
    print_status "Git repository exists"
fi

# Step 6: Stage and commit
echo ""
echo "💾 Step 6: Committing Changes"
echo "------------------------------"

# Add all files except .gitignore'd ones
git add -A

# Check if there are changes to commit
if git diff --cached --quiet; then
    print_warning "No changes to commit"
else
    read -p "Enter commit message: " COMMIT_MSG
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="Update: $(date '+%Y-%m-%d %H:%M')"
    fi
    git commit -m "$COMMIT_MSG"
    print_status "Changes committed"
fi

# Step 7: Create GitHub repository
echo ""
echo "🐙 Step 7: GitHub Repository"
echo "-----------------------------"

# Check if remote exists
if git remote get-url origin &> /dev/null; then
    ORIGIN_URL=$(git remote get-url origin)
    print_status "Remote 'origin' exists: $ORIGIN_URL"
else
    echo "No remote 'origin' configured."
    echo ""
    echo "Creating GitHub repository..."
    
    # Get repo name from package.json or use default
    REPO_NAME=$(node -e "console.log(require('./package.json').name)" 2>/dev/null || echo "vms-next")
    
    # Ask for repo visibility
    echo ""
    echo "Repository visibility:"
    echo "  1) Public (free on GitHub)"
    echo "  2) Private (free on GitHub with limits)"
    read -p "Choose (1/2): " visibility_choice
    
    if [ "$visibility_choice" = "2" ]; then
        VISIBILITY="--private"
    else
        VISIBILITY="--public"
    fi
    
    # Create repository
    if gh auth status &> /dev/null; then
        gh repo create "$REPO_NAME" $VISIBILITY --source=. --push
        print_status "GitHub repository created and code pushed"
    else
        print_warning "GitHub CLI not authenticated, skipping repo creation"
        echo "After authenticating, run:"
        echo "  gh repo create $REPO_NAME $VISIBILITY --source=. --push"
    fi
fi

# Step 8: Deploy to Vercel
echo ""
echo "⚡ Step 8: Vercel Deployment"
echo "----------------------------"

echo "To deploy to Vercel (FREE):"
echo ""
echo "Option A - Using Vercel CLI (recommended):"
echo "  1. Install Vercel CLI: npm i -g vercel"
echo "  2. Run: vercel"
echo "  3. Login with your GitHub account"
echo "  4. Select your repository"
echo "  5. Accept default settings"
echo ""
echo "Option B - Using Vercel Dashboard:"
echo "  1. Go to: https://vercel.com/new"
echo "  2. Import your GitHub repository"
echo "  3. Configure environment variables:"
echo "     - NEXT_PUBLIC_API_URL (your Google Apps Script URL)"
echo "     - SESSION_SECRET (a random secure string)"
echo "  4. Deploy!"
echo ""
echo "Your project is ready for Vercel!"
echo "  - Build command: npm run build"
echo "  - Output directory: .next"
echo "  - Framework: Next.js"

# Step 9: Final instructions
echo ""
echo "✅ Deployment Preparation Complete!"
echo "===================================="
echo ""
echo "Next steps:"
echo "  1. Push to GitHub (if not already done): git push -u origin main"
echo "  2. Deploy to Vercel using one of the options above"
echo "  3. Add your environment variables in Vercel dashboard"
echo ""
echo "Free tier limits:"
echo "  - GitHub: Unlimited public repos, private repos with limits"
echo "  - Vercel: 100GB bandwidth, 100 hours build time/month (hobby tier)"
echo ""

