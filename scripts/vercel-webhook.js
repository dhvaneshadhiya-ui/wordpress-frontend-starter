/**
 * Vercel Serverless Function - WordPress Webhook Handler
 * 
 * Deploy as: api/webhook.js in your Vercel project
 * Or use as standalone Edge Function
 * 
 * Environment Variables Required:
 * - VERCEL_DEPLOY_HOOK_URL: Your Vercel deploy hook URL
 * - WEBHOOK_SECRET: (Optional) Secret for validating requests
 */

const VERCEL_DEPLOY_HOOK_URL = process.env.VERCEL_DEPLOY_HOOK_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// Simple in-memory rate limiting (resets on cold start)
let lastRebuildTime = 0;
const COOLDOWN_MS = 60000;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Webhook-Secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate webhook secret
  if (WEBHOOK_SECRET) {
    const signature = req.headers['x-webhook-secret'] || req.headers['authorization'];
    if (signature !== WEBHOOK_SECRET && signature !== `Bearer ${WEBHOOK_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // Check cooldown
  const now = Date.now();
  if (now - lastRebuildTime < COOLDOWN_MS) {
    const waitTime = Math.ceil((COOLDOWN_MS - (now - lastRebuildTime)) / 1000);
    return res.status(429).json({ 
      error: 'Rate limited', 
      retryAfter: waitTime 
    });
  }

  const { action, post_type, post_status, post_id, post_title } = req.body || {};

  console.log('WordPress webhook:', { action, post_type, post_status, post_id });

  // Only trigger rebuild for published posts
  const shouldRebuild = 
    (post_type === 'post' && post_status === 'publish') ||
    (action === 'delete' && post_type === 'post') ||
    action?.includes('category') ||
    action?.includes('tag');

  if (!shouldRebuild) {
    return res.json({ 
      success: true, 
      message: 'Event received, no rebuild triggered',
      reason: 'Not a publishable content change'
    });
  }

  if (!VERCEL_DEPLOY_HOOK_URL) {
    return res.status(500).json({ error: 'VERCEL_DEPLOY_HOOK_URL not configured' });
  }

  try {
    const response = await fetch(VERCEL_DEPLOY_HOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      lastRebuildTime = now;
      const reason = `${action || 'update'}: ${post_title || post_id || 'content'}`;
      console.log('✓ Rebuild triggered:', reason);
      return res.json({ 
        success: true, 
        message: 'Rebuild triggered',
        reason 
      });
    } else {
      const error = await response.text();
      console.error('✗ Rebuild failed:', error);
      return res.status(500).json({ error: 'Failed to trigger rebuild' });
    }
  } catch (error) {
    console.error('✗ Webhook error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

// Edge runtime config (for Vercel Edge Functions)
export const config = {
  runtime: 'edge'
};
