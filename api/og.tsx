import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

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

export default async function handler(request: Request) {
  const { searchParams } = new URL(request.url);

  // Get parameters
  const title = decodeHtmlEntities(searchParams.get('title') || 'iGeeksBlog');
  const image = searchParams.get('image');
  const author = searchParams.get('author') || 'iGeeksBlog';
  const category = searchParams.get('category');

  // Truncate title for display
  const displayTitle = truncateText(title, 100);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: '#0a0a0a',
        }}
      >
        {/* Background Image */}
        {image && (
          <img
            src={image}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: image
              ? 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.3) 100%)'
              : 'linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '48px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Category Badge */}
          {category && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '18px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {category}
              </span>
            </div>
          )}

          {/* Title */}
          <h1
            style={{
              color: 'white',
              fontSize: displayTitle.length > 60 ? '42px' : '52px',
              fontWeight: 700,
              lineHeight: 1.2,
              margin: 0,
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
              maxWidth: '90%',
            }}
          >
            {displayTitle}
          </h1>

          {/* Author and Branding Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '12px',
            }}
          >
            {/* Author */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
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
                }}
              >
                {author.charAt(0).toUpperCase()}
              </div>
              <span
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '20px',
                  fontWeight: 500,
                }}
              >
                {author}
              </span>
            </div>

            {/* Logo/Brand */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span
                style={{
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 700,
                  letterSpacing: '-0.5px',
                }}
              >
                iGeeksBlog
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
