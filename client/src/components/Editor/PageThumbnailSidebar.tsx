import React, { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { ISlidePage } from '../../types/document';
import { SlideThumbnail } from './SlideThumbnail';
import { Edit3, Trash2 } from 'lucide-react';

interface PageThumbnailSidebarProps {
  isOpen: boolean;
  slides: ISlidePage[];
  currentSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onDeleteSlide?: (index: number) => void;
  pdfDoc?: pdfjsLib.PDFDocumentProxy | null;
}

export const PageThumbnailSidebar: React.FC<PageThumbnailSidebarProps> = ({
  isOpen,
  slides,
  currentSlideIndex,
  onSelectSlide,
  onDeleteSlide,
  pdfDoc = null,
}) => {
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  // Scroll active item into view
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentSlideIndex]);

  if (!isOpen) return null;

  return (
    <aside className="w-48 sm:w-52 bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-full overflow-y-auto select-none z-20 transition-all">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xs sticky top-0 z-20">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
          Pages
        </span>
        <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
          {slides.length} {slides.length === 1 ? 'slide' : 'slides'}
        </span>
      </div>

      <div className="p-2.5 space-y-3 flex-1">
        {slides.map((slide, index) => {
          const isActive = index === currentSlideIndex;
          const isUserAdded = Boolean(slide.isUserAdded);
          const annotationCount = slide.annotations ? slide.annotations.length : 0;
          // STRICT RULE: Delete button ONLY exists on user-added pages (added via "+ Add Page")
          const canDelete = isUserAdded && Boolean(onDeleteSlide);

          return (
            <div
              key={slide.id}
              ref={isActive ? activeItemRef : null}
              onClick={() => onSelectSlide(index)}
              className={`group relative w-full text-left p-2 rounded-xl border cursor-pointer transition-all flex flex-col space-y-1.5 shadow-2xs hover:shadow-xs ${
                isActive
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-white dark:bg-neutral-800/90 border-neutral-200/90 dark:border-neutral-700/80 hover:border-neutral-400 dark:hover:border-neutral-600'
              }`}
            >
              {/* Header inside thumbnail card: Slide number & Added badge */}
              <div className="flex items-center justify-between px-0.5">
                <span
                  className={`text-[11px] font-bold ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  Page {index + 1}
                </span>

                {isUserAdded && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider bg-indigo-100/90 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                    Added
                  </span>
                )}
              </div>

              {/* 16:9 Thumbnail preview box showing real PDF page & annotations */}
              <div
                className={`w-full aspect-video rounded-lg border relative overflow-hidden transition-colors flex items-center justify-center ${
                  isActive
                    ? 'border-indigo-300 dark:border-indigo-700/80 shadow-2xs'
                    : 'border-neutral-200 dark:border-neutral-700'
                }`}
              >
                {/* Real-time live thumbnail canvas */}
                <SlideThumbnail slide={slide} pdfDoc={pdfDoc} />

                {/* Annotation count badge if any */}
                {annotationCount > 0 && (
                  <div className="absolute bottom-1 right-1 flex items-center space-x-1 bg-indigo-600/90 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-md backdrop-blur-xs shadow-xs pointer-events-none">
                    <Edit3 className="w-2.5 h-2.5" />
                    <span>{annotationCount}</span>
                  </div>
                )}

                {/* Delete slide button - ONLY rendered for user-added slides */}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDeleteSlide?.(index);
                    }}
                    title="Delete Added Page"
                    className="absolute top-1 right-1 p-1 rounded-md bg-white/95 dark:bg-neutral-800/95 text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 shadow-xs transition-all z-10 opacity-90 group-hover:opacity-100 hover:scale-105"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
