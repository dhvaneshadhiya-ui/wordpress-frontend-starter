import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('SW registered:', registration.scope);
      
      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Check every hour
    }).catch((error) => {
      console.log('SW registration failed:', error);
    });
  });
}

const rootElement = document.getElementById("root");

if (rootElement) {
  const app = (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );

  // Use hydration for pre-rendered HTML in production
  if (import.meta.env.PROD) {
    hydrateRoot(rootElement, app);
  } else {
    createRoot(rootElement).render(app);
  }
} else {
  document.body.innerHTML = '<div style="padding: 40px; color: red;">Root element not found</div>';
}
