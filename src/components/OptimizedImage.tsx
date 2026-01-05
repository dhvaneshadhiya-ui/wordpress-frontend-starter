import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  getOptimizedImageUrl, 
  generateSrcSet, 
  getImageSizes,
  RESPONSIVE_WIDTHS 
} from '@/utils/imageOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  variant?: 'card' | 'featured' | 'full';
  priority?: boolean;
  width?: number;
  height?: number;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  className,
  sizes,
  variant = 'card',
  priority = false,
  width,
  height,
  quality = 75,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Fallback to placeholder on error
  const imageSrc = hasError ? '/placeholder.svg' : src;
  const isPlaceholder = imageSrc === '/placeholder.svg';

  // Default width for optimization
  const defaultWidth = variant === 'featured' ? 1200 : variant === 'full' ? 1920 : 640;
  const optimizedSrc = getOptimizedImageUrl(imageSrc, width || defaultWidth, quality);
  const srcSet = !isPlaceholder ? generateSrcSet(imageSrc, RESPONSIVE_WIDTHS, quality) : '';
  const sizesAttr = sizes || getImageSizes(variant);

  return (
    <img
      src={optimizedSrc}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizesAttr : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      onLoad={handleLoad}
      onError={handleError}
      className={cn(
        'transition-opacity duration-300',
        !isLoaded && 'opacity-0',
        isLoaded && 'opacity-100',
        className
      )}
    />
  );
}

// Simplified version for static HTML generation (SSG)
export function getOptimizedImageHTML(
  src: string,
  alt: string,
  options: {
    width?: number;
    height?: number;
    sizes?: string;
    loading?: 'lazy' | 'eager';
    className?: string;
  } = {}
): string {
  const {
    width = 1200,
    height,
    sizes = '(max-width: 768px) 100vw, 50vw',
    loading = 'lazy',
    className = '',
  } = options;

  const optimizedSrc = getOptimizedImageUrl(src, width);
  const srcSet = generateSrcSet(src);

  return `<img 
    src="${optimizedSrc}" 
    ${srcSet ? `srcset="${srcSet}" sizes="${sizes}"` : ''}
    alt="${alt}"
    ${width ? `width="${width}"` : ''}
    ${height ? `height="${height}"` : ''}
    loading="${loading}"
    decoding="async"
    ${className ? `class="${className}"` : ''}
  >`;
}
