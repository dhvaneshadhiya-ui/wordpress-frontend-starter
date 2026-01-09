import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

const API_BASE = import.meta.env.VITE_WORDPRESS_API_URL || 'https://dev.igeeksblog.com/wp-json/wp/v2';
const HEALTH_CHECK_INTERVAL = 60000; // 60 seconds
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

interface ApiHealthState {
  isHealthy: boolean;
  lastCheck: Date | null;
  isChecking: boolean;
  consecutiveFailures: number;
}

interface ApiHealthContextValue extends ApiHealthState {
  checkHealth: () => Promise<boolean>;
}

const ApiHealthContext = createContext<ApiHealthContextValue | null>(null);

export function ApiHealthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ApiHealthState>({
    isHealthy: true, // Assume healthy initially
    lastCheck: null,
    isChecking: false,
    consecutiveFailures: 0,
  });

  const checkHealth = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isChecking: true }));
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
      
      const response = await fetch(`${API_BASE}/posts?per_page=1&_fields=id`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      
      clearTimeout(timeoutId);
      
      const isHealthy = response.ok;
      setState({
        isHealthy,
        lastCheck: new Date(),
        isChecking: false,
        consecutiveFailures: isHealthy ? 0 : state.consecutiveFailures + 1,
      });
      
      return isHealthy;
    } catch {
      setState(prev => ({
        isHealthy: false,
        lastCheck: new Date(),
        isChecking: false,
        consecutiveFailures: prev.consecutiveFailures + 1,
      }));
      return false;
    }
  }, [state.consecutiveFailures]);

  // Initial health check and periodic monitoring
  useEffect(() => {
    // Check health on mount
    checkHealth();
    
    // Set up periodic health checks
    const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
    
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <ApiHealthContext.Provider value={{ ...state, checkHealth }}>
      {children}
    </ApiHealthContext.Provider>
  );
}

export function useApiHealth() {
  const context = useContext(ApiHealthContext);
  
  if (!context) {
    // Return default values if used outside provider
    return {
      isHealthy: true,
      lastCheck: null,
      isChecking: false,
      consecutiveFailures: 0,
      checkHealth: async () => true,
    };
  }
  
  return context;
}
