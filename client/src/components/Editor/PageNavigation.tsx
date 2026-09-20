import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Keyboard,
  Heart,
} from 'lucide-react';

interface PageNavigationProps {
  currentIndex: number;
  totalSlides: number;
  onSelectIndex: (newIndex: number) => void;
  onOpenShortcuts?: () => void;
}

export const PageNavigation: React.FC<PageNavigationProps> = ({
  currentIndex,
  totalSlides,
  onSelectIndex,
  onOpenShortcuts,
}) => {
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= totalSlides - 1;

  return (
    <footer className="h-14 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-4 flex items-center justify-between shadow-xs select-none z-30">
      {/* Left spacer / shortcut trigger */}
      <div className="flex items-center space-x-2">
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts"
            className="flex items-center space-x-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>
        )}
      </div>

      {/* Center Navigation controls without sheet number input */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* First Slide */}
        <button
          onClick={() => onSelectIndex(0)}
          disabled={isFirst}
          title="First Slide (Home)"
          className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Slide */}
        <button
          onClick={() => onSelectIndex(currentIndex - 1)}
          disabled={isFirst}
          title="Previous Slide (← Arrow)"
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Minimal clean progress indicator (read-only, no sheet numbers to update) */}
        <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          <span>{currentIndex + 1}</span>
          <span className="text-neutral-400">/</span>
          <span>{totalSlides || 1}</span>
        </div>

        {/* Next Slide */}
        <button
          onClick={() => onSelectIndex(currentIndex + 1)}
          disabled={isLast}
          title="Next Slide (→ Arrow / Space)"
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Slide */}
        <button
          onClick={() => onSelectIndex(totalSlides - 1)}
          disabled={isLast}
          title="Last Slide (End)"
          className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right helper text & creator credit */}
      <div className="text-xs text-neutral-400 hidden sm:flex items-center space-x-3">
        <span>
          Use <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-neutral-600">←</kbd> <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-neutral-600">→</kbd> to navigate
        </span>
        <span className="text-neutral-300">•</span>
        <span className="flex items-center space-x-1 font-medium text-neutral-600">
          <span>Made with</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline-block animate-pulse" />
          <span>by <span className="font-semibold text-neutral-800">Saurabh</span></span>
        </span>
      </div>
    </footer>
  );
};
