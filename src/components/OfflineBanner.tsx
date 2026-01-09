import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isVisible: boolean;
  isUsingDemoData?: boolean;
}

export function OfflineBanner({ isVisible, isUsingDemoData = false }: OfflineBannerProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm px-4 py-2.5"
      role="alert"
      aria-live="polite"
    >
      <div className="container mx-auto flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>
          {isUsingDemoData 
            ? "Unable to connect to server. Showing sample content."
            : "Unable to connect to server. Showing cached content."
          }
        </span>
      </div>
    </div>
  );
}
