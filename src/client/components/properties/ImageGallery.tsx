import { useState } from 'react';
import { cn } from '../../lib/utils';

interface ImageGalleryProps {
  images: string[];
  className?: string;
}

export function ImageGallery({ images, className }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className={cn("flex items-center justify-center bg-zinc-100 dark:bg-zinc-800/50 rounded-lg aspect-video text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700", className)}>
        <span className="font-mono text-sm">NO IMAGERY</span>
      </div>
    );
  }

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="relative group overflow-hidden rounded-lg bg-zinc-900 aspect-[4/3] md:aspect-video shadow-2xl ring-1 ring-white/10">
        <img
          src={images[currentIndex]}
          alt={`Property view ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        
        {images.length > 1 && (
          <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={prevImage}
              className="p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-110 active:scale-95"
              aria-label="Previous image"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextImage}
              className="p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-110 active:scale-95"
              aria-label="Next image"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
        
        <div className="absolute bottom-4 right-4 px-3 py-1.5 text-xs font-mono tracking-wider text-white bg-black/60 backdrop-blur-md rounded-md border border-white/10">
          {String(currentIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "relative flex-shrink-0 w-24 h-16 rounded-md overflow-hidden transition-all duration-300",
                idx === currentIndex
                  ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-950 opacity-100 scale-105"
                  : "opacity-40 hover:opacity-100 grayscale hover:grayscale-0"
              )}
            >
              <img
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
