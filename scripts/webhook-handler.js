/**
 * Webhook Handler for WordPress → Vercel Rebuild
 * 
 * Deploy this as a serverless function (Vercel, Netlify, or standalone)
 * to receive WordPress webhooks and trigger rebuilds.
 * 
 * Setup:
 * 1. Create a Deploy Hook in Vercel: Project Settings → Git → Deploy Hooks
 * 2. Set VERCEL_DEPLOY_HOOK_URL environment variable
 * 3. Install WP Webhooks plugin in WordPress
 * 4. Configure webhook to POST to this handler's URL
 */

// For standalone Express server (development/self-hosted)
import express from 'express';

const app = express();
app.use(express.json());

const VERCEL_DEPLOY_HOOK_URL = process.env.VERCEL_DEPLOY_HOOK_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

// Rate limiting: prevent multiple rebuilds within cooldown period
let lastRebuildTime = 0;
const REBUILD_COOLDOWN_MS = 60000; // 1 minute cooldown

// Debounce: collect multiple events and trigger single rebuild
let rebuildTimeout = null;
const DEBOUNCE_MS = 5000; // Wait 5 seconds for additional events

async function triggerVercelRebuild(reason) {
  if (!VERCEL_DEPLOY_HOOK_URL) {
    console.error('VERCEL_DEPLOY_HOOK_URL not configured');
    return { success: false, error: 'Deploy hook not configured' };
  }

  const now = Date.now();
  if (now - lastRebuildTime < REBUILD_COOLDOWN_MS) {
    const waitTime = Math.ceil((REBUILD_COOLDOWN_MS - (now - lastRebuildTime)) / 1000);
    console.log(`Rebuild cooldown active, wait ${waitTime}s`);
    return { success: false, error: `Cooldown active, wait ${waitTime}s` };
  }

  try {
    const response = await fetch(VERCEL_DEPLOY_HOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'wordpress-webhook', reason })
    });

    if (response.ok) {
      lastRebuildTime = now;
      console.log(`✓ Vercel rebuild triggered: ${reason}`);
      return { success: true, message: 'Rebuild triggered' };
    } else {
      const error = await response.text();
      console.error(`✗ Vercel rebuild failed: ${error}`);
      return { success: false, error };
    }
  } catch (error) {
    console.error('✗ Failed to trigger rebuild:', error.message);
    return { success: false, error: error.message };
  }
}

function scheduleRebuild(reason) {
  if (rebuildTimeout) {
    clearTimeout(rebuildTimeout);
  }
  
  rebuildTimeout = setTimeout(async () => {
    await triggerVercelRebuild(reason);
    rebuildTimeout = null;
  }, DEBOUNCE_MS);
  
  console.log(`Rebuild scheduled for: ${reason}`);
}

// Validate webhook secret (optional but recommended)
function validateSecret(req) {
  if (!WEBHOOK_SECRET) return true;
  const signature = req.headers['x-webhook-secret'] || req.headers['authorization'];
  return signature === WEBHOOK_SECRET || signature === `Bearer ${WEBHOOK_SECRET}`;
}

// WordPress webhook events that should trigger rebuild
const REBUILD_EVENTS = [
  'post_published',
  'post_updated', 
  'post_deleted',
  'post_trashed',
  'category_created',
  'category_updated',
  'category_deleted',
  'tag_created',
  'tag_updated',
  'tag_deleted',
  'user_updated'
];

app.post('/webhook', async (req, res) => {
  // Validate secret
  if (!validateSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { action, post_type, post_status, post_id, post_title } = req.body;
  
  console.log('Webhook received:', { action, post_type, post_status, post_id });

  // Only rebuild for published posts or specific actions
  if (post_type === 'post' && (post_status === 'publish' || action === 'delete')) {
    const reason = `${action}: ${post_title || post_id}`;
    scheduleRebuild(reason);
    return res.json({ success: true, message: 'Rebuild scheduled', reason });
  }

  // Handle taxonomy changes
  if (action && REBUILD_EVENTS.some(e => action.includes(e.split('_')[0]))) {
    scheduleRebuild(`Taxonomy update: ${action}`);
    return res.json({ success: true, message: 'Rebuild scheduled' });
  }

  res.json({ success: true, message: 'Event received, no rebuild needed' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    configured: !!VERCEL_DEPLOY_HOOK_URL,
    lastRebuild: lastRebuildTime ? new Date(lastRebuildTime).toISOString() : null
  });
});

// Manual rebuild trigger (protected)
app.post('/rebuild', async (req, res) => {
  if (!validateSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const result = await triggerVercelRebuild('Manual trigger');
  res.json(result);
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Webhook handler running on port ${PORT}`);
  console.log(`Deploy hook configured: ${!!VERCEL_DEPLOY_HOOK_URL}`);
});

export default app;
