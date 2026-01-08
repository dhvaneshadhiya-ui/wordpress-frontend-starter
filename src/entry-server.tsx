import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';

export function render(url: string): string {
  const helmetContext = {};
  
  try {
    const html = ReactDOMServer.renderToString(
      <HelmetProvider context={helmetContext}>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </HelmetProvider>
    );
    
    return html;
  } catch (error) {
    console.error(`SSR Error for ${url}:`, error);
    return '<div id="root"></div>';
  }
}
