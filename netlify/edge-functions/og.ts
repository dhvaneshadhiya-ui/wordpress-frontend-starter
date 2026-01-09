import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import type { Config } from '@netlify/edge-functions';

// Initialize WASM (cached after first call)
let wasmInitialized = false;

// Helper to decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—');
}

// Truncate text to fit
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// React-like createElement for satori
function h(
  type: string,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): { type: string; props: Record<string, unknown> } {
  return {
    type,
    props: {
      ...props,
      children: children.length === 1 ? children[0] : children.length > 0 ? children : undefined,
    },
  };
}

export default async function handler(request: Request) {
  const { searchParams } = new URL(request.url);

  // Get parameters
  const title = decodeHtmlEntities(searchParams.get('title') || 'iGeeksBlog');
  const image = searchParams.get('image');
  const author = searchParams.get('author') || 'iGeeksBlog';
  const category = searchParams.get('category');

  // Truncate title for display
  const displayTitle = truncateText(title, 100);

  // Fetch font (Inter Bold from Google Fonts)
  const fontData = await fetch(
    'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff'
  ).then((res) => res.arrayBuffer());

  // Build the OG image element tree
  const element = h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        backgroundColor: '#0a0a0a',
      },
    },
    // Background Image
    image &&
      h('img', {
        src: image,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        },
      }),
    // Gradient Overlay
    h('div', {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: image
          ? 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.3) 100%)'
          : 'linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%)',
        display: 'flex',
      },
    }),
    // Content
    h(
      'div',
      {
        style: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        },
      },
      // Category Badge
      category &&
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center' } },
          h(
            'span',
            {
              style: {
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '18px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              },
            },
            category
          )
        ),
      // Title
      h(
        'div',
        {
          style: {
            color: 'white',
            fontSize: displayTitle.length > 60 ? '42px' : '52px',
            fontWeight: 700,
            lineHeight: 1.2,
            maxWidth: '90%',
          },
        },
        displayTitle
      ),
      // Author and Branding Row
      h(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '12px',
          },
        },
        // Author
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            },
          },
          h(
            'div',
            {
              style: {
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px',
                fontWeight: 600,
              },
            },
            author.charAt(0).toUpperCase()
          ),
          h(
            'span',
            {
              style: {
                color: 'rgba(255,255,255,0.9)',
                fontSize: '20px',
                fontWeight: 500,
              },
            },
            author
          )
        ),
        // Logo/Brand
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            },
          },
          h(
            'span',
            {
              style: {
                color: 'white',
                fontSize: '24px',
                fontWeight: 700,
                letterSpacing: '-0.5px',
              },
            },
            'iGeeksBlog'
          )
        )
      )
    )
  );

  // Generate SVG with satori
  const svg = await satori(element as React.ReactNode, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Inter',
        data: fontData,
        weight: 700,
        style: 'normal',
      },
    ],
  });

  // Initialize WASM if needed
  if (!wasmInitialized) {
    await initWasm(
      fetch('https://unpkg.com/@resvg/resvg-wasm@2.6.0/index_bg.wasm')
    );
    wasmInitialized = true;
  }

  // Convert SVG to PNG
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1200,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(pngBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, s-maxage=31536000, immutable',
    },
  });
}

export const config: Config = {
  path: '/og',
};
