import React, { useEffect, useRef } from 'react';
import type { ISlidePage } from '../../types/document';
import { FileText, Edit3, Trash2 } from 'lucide-react';

interface PageThumbnailSidebarProps {
  isOpen: boolean;
  slides: ISlidePage[];
  currentSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onDeleteSlide?: (index: number) => void;
}

export const PageThumbnailSidebar: React.FC<PageThumbnailSidebarProps> = ({
  isOpen,
  slides,
  currentSlideIndex,
  onSelectSlide,
  onDeleteSlide,
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
    <aside className="w-44 sm:w-48 bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-full overflow-y-auto select-none z-20 transition-all">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Slides
        </span>
        <span className="text-[11px] font-medium text-neutral-400">
          {slides.length} total
        </span>
      </div>

      <div className="p-2 space-y-2.5 flex-1">
        {slides.map((slide, index) => {
          const isActive = index === currentSlideIndex;
          const isAddedPage = slide.pdfPageNumber === null || slide.pdfPageNumber === undefined;
          const annotationCount = slide.annotations ? slide.annotations.length : 0;
          const canDelete = slides.length > 1 && Boolean(onDeleteSlide);

          return (
            <div
              key={slide.id}
              ref={isActive ? activeItemRef : null}
              onClick={() => onSelectSlide(index)}
              className={`group relative w-full text-left p-2 rounded-xl border cursor-pointer transition-all flex flex-col space-y-1.5 ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 shadow-xs ring-2 ring-indigo-500/20'
                  : 'bg-white dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700/80 hover:border-neutral-400 dark:hover:border-neutral-600'
              }`}
            >
              {/* 16:9 Thumbnail preview box */}
              <div
                className={`w-full aspect-video rounded-lg flex items-center justify-center border relative transition-colors ${
                  isActive
                    ? 'bg-white dark:bg-neutral-900 border-indigo-200 dark:border-indigo-800/60'
                    : 'bg-neutral-100 dark:bg-neutral-900/50 border-neutral-200/60 dark:border-neutral-700/40'
                }`}
              >
                <FileText
                  className={`w-5 h-5 ${
                    isActive
                      ? 'text-indigo-500'
                      : 'text-neutral-400 dark:text-neutral-600'
                  }`}
                />

                {/* Added page indicator tag */}
                {isAddedPage && (
                  <div className="absolute top-1 left-1 flex items-center space-x-0.5 bg-indigo-100/90 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-[8px] font-bold px-1 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                    <span>Added</span>
                  </div>
                )}

                {/* Annotation badge if any */}
                {annotationCount > 0 && (
                  <div className="absolute bottom-1 right-1 flex items-center space-x-0.5 bg-indigo-600/90 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-md backdrop-blur-xs shadow-2xs">
                    <Edit3 className="w-2.5 h-2.5" />
                    <span>{annotationCount}</span>
                  </div>
                )}

                {/* Delete slide button - easily tappable directly on thumbnail */}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDeleteSlide!(index);
                    }}
                    title={isAddedPage ? 'Delete Added Page' : 'Delete Slide'}
                    className={`absolute top-1 right-1 p-1 rounded-md transition-all z-10 ${
                      isAddedPage || isActive
                        ? 'bg-white/95 dark:bg-neutral-800/95 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/80 shadow-2xs'
                        : 'text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 opacity-0 group-hover:opacity-100'
                    }`}
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
