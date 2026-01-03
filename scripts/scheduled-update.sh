#!/bin/bash
# Scheduled WordPress Content Update Script
# Run via cron to check for new WordPress content and trigger rebuilds
#
# Setup:
# 1. Make executable: chmod +x scripts/scheduled-update.sh
# 2. Add to crontab: crontab -e
# 3. Add line: */15 * * * * /path/to/project/scripts/scheduled-update.sh >> /var/log/wp-sync.log 2>&1
#
# Required environment variables:
# - WORDPRESS_API_URL: Your WordPress API base URL
# - VERCEL_DEPLOY_HOOK_URL: Your Vercel deploy hook URL

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CACHE_DIR="$PROJECT_DIR/.build-cache"
LAST_CHECK_FILE="$CACHE_DIR/last-check.json"

# Load environment variables from .env if it exists
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Validate required environment variables
if [ -z "$WORDPRESS_API_URL" ] && [ -z "$VITE_WORDPRESS_API_URL" ]; then
    echo "[$(date)] ERROR: WORDPRESS_API_URL or VITE_WORDPRESS_API_URL is not set"
    exit 1
fi

if [ -z "$VERCEL_DEPLOY_HOOK_URL" ]; then
    echo "[$(date)] ERROR: VERCEL_DEPLOY_HOOK_URL is not set"
    exit 1
fi

# Use VITE_WORDPRESS_API_URL if WORDPRESS_API_URL is not set
WP_API="${WORDPRESS_API_URL:-$VITE_WORDPRESS_API_URL}"

echo "[$(date)] Starting WordPress content check..."

# Ensure cache directory exists
mkdir -p "$CACHE_DIR"

# Get last check timestamp
LAST_CHECK=""
if [ -f "$LAST_CHECK_FILE" ]; then
    LAST_CHECK=$(cat "$LAST_CHECK_FILE" | grep -o '"lastCheck":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$LAST_CHECK" ]; then
    # First run - check posts from last hour
    LAST_CHECK=$(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || date -u -v-1H '+%Y-%m-%dT%H:%M:%S')
fi

echo "[$(date)] Checking for posts modified after: $LAST_CHECK"

# Check WordPress for modified posts
MODIFIED_COUNT=$(curl -s "${WP_API}/posts?modified_after=${LAST_CHECK}&per_page=1" \
    -H "Accept: application/json" \
    -w "\n%{http_code}" | tail -1)

if [ "$MODIFIED_COUNT" != "200" ]; then
    echo "[$(date)] WARNING: WordPress API returned status $MODIFIED_COUNT"
    exit 0
fi

# Get the actual count from the response headers
RESPONSE=$(curl -s -I "${WP_API}/posts?modified_after=${LAST_CHECK}&per_page=1" \
    -H "Accept: application/json")
TOTAL_MODIFIED=$(echo "$RESPONSE" | grep -i "x-wp-total:" | tr -d '\r' | cut -d' ' -f2)

if [ -z "$TOTAL_MODIFIED" ]; then
    TOTAL_MODIFIED=0
fi

echo "[$(date)] Found $TOTAL_MODIFIED modified posts"

# Update last check timestamp
CURRENT_TIME=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
echo "{\"lastCheck\":\"$CURRENT_TIME\",\"lastModifiedCount\":$TOTAL_MODIFIED}" > "$LAST_CHECK_FILE"

# Trigger rebuild if there are modified posts
if [ "$TOTAL_MODIFIED" -gt 0 ]; then
    echo "[$(date)] Triggering Vercel rebuild..."
    
    DEPLOY_RESPONSE=$(curl -s -X POST "$VERCEL_DEPLOY_HOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{"source":"scheduled-update"}')
    
    echo "[$(date)] Deploy hook response: $DEPLOY_RESPONSE"
    echo "[$(date)] Rebuild triggered successfully!"
else
    echo "[$(date)] No changes detected, skipping rebuild."
fi

echo "[$(date)] Content check complete."
