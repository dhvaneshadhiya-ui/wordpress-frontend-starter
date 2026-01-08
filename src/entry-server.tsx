// Minimal SSR render - just return a shell, React hydrates on client
export function render(url: string): string {
  // Return minimal HTML shell - no component rendering during SSR
  // This guarantees build success and fast builds
  // SEO metadata is injected by prerender.js, not by React components
  return '<div class="min-h-screen bg-background"></div>';
}
