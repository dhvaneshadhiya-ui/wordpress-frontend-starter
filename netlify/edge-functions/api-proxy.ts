// API Proxy Edge Function - Adds CORS headers for Lovable preview
// Forwards requests to WordPress API with proper headers

const WP_API_BASE = 'https://dev.igeeksblog.com/wp-json';

export default async function handler(request: Request) {
  const url = new URL(request.url);
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  
  // Convert /api/wp/* to /wp-json/*
  const wpPath = url.pathname.replace('/api/wp', '/wp-json');
  const wpUrl = `https://dev.igeeksblog.com${wpPath}${url.search}`;
  
  try {
    const response = await fetch(wpUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Lovable-Preview-Proxy/1.0',
      },
    });
    
    const data = await response.text();
    
    // Build response headers with CORS
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'X-WP-Total, X-WP-TotalPages',
    });
    
    // Forward WordPress pagination headers
    const wpTotal = response.headers.get('X-WP-Total');
    const wpTotalPages = response.headers.get('X-WP-TotalPages');
    
    if (wpTotal) headers.set('X-WP-Total', wpTotal);
    if (wpTotalPages) headers.set('X-WP-TotalPages', wpTotalPages);
    
    return new Response(data, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('API Proxy Error:', error);
    return new Response(JSON.stringify({ error: 'Proxy request failed' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export const config = { path: '/api/wp/*' };
