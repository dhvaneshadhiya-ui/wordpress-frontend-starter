export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get the path segments after /api/wp/
  const { path } = req.query;
  const wpPath = Array.isArray(path) ? path.join('/') : path;
  
  // Build the WordPress URL with query params
  const url = new URL(req.url, `http://${req.headers.host}`);
  const wpUrl = `https://dev.igeeksblog.com/wp-json/${wpPath}${url.search}`;

  try {
    const response = await fetch(wpUrl);
    const data = await response.json();
    
    // Forward WordPress pagination headers
    const wpTotal = response.headers.get('X-WP-Total');
    const wpPages = response.headers.get('X-WP-TotalPages');
    if (wpTotal) res.setHeader('X-WP-Total', wpTotal);
    if (wpPages) res.setHeader('X-WP-TotalPages', wpPages);
    
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from WordPress' });
  }
}
