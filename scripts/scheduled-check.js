/**
 * Scheduled WordPress Content Check (Node.js version)
 * 
 * Run via cron to check for new WordPress content and trigger rebuilds.
 * 
 * Setup:
 * 1. Add to crontab: crontab -e
 * 2. Add line: */15 * * * * cd /path/to/project && node scripts/scheduled-check.js >> /var/log/wp-sync.log 2>&1
 * 
 * Required environment variables:
 * - VITE_WORDPRESS_API_URL or WORDPRESS_API_URL: Your WordPress API base URL
 * - VERCEL_DEPLOY_HOOK_URL: Your Vercel deploy hook URL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', '.build-cache');
const LAST_CHECK_FILE = path.join(CACHE_DIR, 'last-check.json');

// Load environment variables
const WP_API = process.env.WORDPRESS_API_URL || process.env.VITE_WORDPRESS_API_URL;
const DEPLOY_HOOK_URL = process.env.VERCEL_DEPLOY_HOOK_URL;

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getLastCheck() {
  try {
    if (fs.existsSync(LAST_CHECK_FILE)) {
      const data = JSON.parse(fs.readFileSync(LAST_CHECK_FILE, 'utf8'));
      return data.lastCheck;
    }
  } catch (error) {
    log(`Warning: Could not read last check file: ${error.message}`);
  }
  // Default to 1 hour ago
  return new Date(Date.now() - 60 * 60 * 1000).toISOString();
}

function saveLastCheck(timestamp, modifiedCount) {
  ensureCacheDir();
  const data = {
    lastCheck: timestamp,
    lastModifiedCount: modifiedCount,
    checkedAt: new Date().toISOString()
  };
  fs.writeFileSync(LAST_CHECK_FILE, JSON.stringify(data, null, 2));
}

async function checkForModifiedPosts(since) {
  const url = `${WP_API}/posts?modified_after=${since}&per_page=1`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`WordPress API returned ${response.status}`);
  }

  const total = parseInt(response.headers.get('x-wp-total') || '0', 10);
  return total;
}

async function triggerRebuild() {
  const response = await fetch(DEPLOY_HOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'scheduled-check' })
  });

  if (!response.ok) {
    throw new Error(`Deploy hook returned ${response.status}`);
  }

  return response.json().catch(() => ({ status: 'triggered' }));
}

async function main() {
  log('Starting WordPress content check...');

  // Validate configuration
  if (!WP_API) {
    log('ERROR: WORDPRESS_API_URL or VITE_WORDPRESS_API_URL is not set');
    process.exit(1);
  }

  if (!DEPLOY_HOOK_URL) {
    log('ERROR: VERCEL_DEPLOY_HOOK_URL is not set');
    process.exit(1);
  }

  try {
    const lastCheck = getLastCheck();
    log(`Checking for posts modified after: ${lastCheck}`);

    const modifiedCount = await checkForModifiedPosts(lastCheck);
    log(`Found ${modifiedCount} modified posts`);

    // Save current timestamp
    const currentTime = new Date().toISOString();
    saveLastCheck(currentTime, modifiedCount);

    if (modifiedCount > 0) {
      log('Triggering Vercel rebuild...');
      const result = await triggerRebuild();
      log(`Deploy hook response: ${JSON.stringify(result)}`);
      log('Rebuild triggered successfully!');
    } else {
      log('No changes detected, skipping rebuild.');
    }

    log('Content check complete.');
  } catch (error) {
    log(`ERROR: ${error.message}`);
    process.exit(1);
  }
}

main();
