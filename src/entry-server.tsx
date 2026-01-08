import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

export function render(url: string): string {
  const helmetContext = {};
  
  // Create a QueryClient that doesn't fetch during SSR
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Disable all network requests during SSR
        enabled: false,
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
      },
    },
  });
  
  try {
    const html = ReactDOMServer.renderToString(
      <QueryClientProvider client={queryClient}>
        <HelmetProvider context={helmetContext}>
          <StaticRouter location={url}>
            <App />
          </StaticRouter>
        </HelmetProvider>
      </QueryClientProvider>
    );
    
    return html;
  } catch (error) {
    console.error(`SSR Error for ${url}:`, error);
    return '<div id="root"></div>';
  }
}
