'use client';

import { useState, useEffect, useRef } from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/helpers/general';

interface LazyImageProps extends Omit<ImageProps, 'onLoad'> {
  fallback?: string;
  threshold?: number;
  rootMargin?: string;
  blurDataURL?: string;
  onLoad?: () => void;
}

export function LazyImage({
  src,
  alt,
  className,
  fallback = '/placeholder-image.jpg',
  threshold = 0.1,
  rootMargin = '50px',
  blurDataURL,
  onLoad,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src as string);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [src, threshold, rootMargin]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
    if (fallback && fallback !== src) {
      setImageSrc(fallback);
      setError(false);
    }
  };

  // If using fill, the parent needs to handle positioning
  const wrapperClassName = props.fill 
    ? cn('absolute inset-0 overflow-hidden', className)
    : cn('relative overflow-hidden', className);

  return (
    <div ref={imgRef} className={wrapperClassName}>
      {/* Shimmer loading effect */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-muted/50 via-muted to-muted/50 animate-shimmer" />
      )}
      
      {imageSrc && (
        <Image
          {...props}
          src={error ? fallback : imageSrc}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          placeholder={blurDataURL ? 'blur' : 'empty'}
          blurDataURL={blurDataURL}
        />
      )}
    </div>
  );
}

// Hook for lazy loading multiple images
export function useLazyImageLoader(imageUrls: string[], options?: {
  threshold?: number;
  rootMargin?: string;
}) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src && !loadedImages.has(src)) {
              img.src = src;
              setLoadedImages((prev) => new Set(prev).add(src));
              observerRef.current?.unobserve(img);
            }
          }
        });
      },
      {
        threshold: options?.threshold ?? 0.1,
        rootMargin: options?.rootMargin ?? '50px',
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loadedImages, options?.threshold, options?.rootMargin]);

  const observeImage = (element: HTMLImageElement | null) => {
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }
  };

  return { observeImage, loadedImages };
}