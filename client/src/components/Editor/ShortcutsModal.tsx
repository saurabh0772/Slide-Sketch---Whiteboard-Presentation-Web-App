import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: '→ / Space', desc: 'Next slide' },
  { key: '←', desc: 'Previous slide' },
  { key: 'Home', desc: 'First slide' },
  { key: 'End', desc: 'Last slide' },
  { key: '1 / H', desc: 'Highlighter' },
  { key: '2 / L', desc: 'Line tool' },
  { key: '3 / A', desc: 'Arrow tool' },
  { key: '4 / R', desc: 'Square / Rectangle' },
  { key: '5 / C', desc: 'Circle / Ellipse' },
  { key: '6 / T', desc: 'Triangle tool' },
  { key: '7 / P', desc: 'Pen / Pencil' },
  { key: '8 / G', desc: 'Graph / Coordinate Plane' },
  { key: '0 / E', desc: 'Eraser tool' },
  { key: 'Ctrl + Z', desc: 'Undo' },
  { key: 'Ctrl + Shift + Z / Ctrl + Y', desc: 'Redo' },
  { key: 'Ctrl + S', desc: 'Save annotations' },
  { key: 'Delete / Backspace', desc: 'Delete selected annotation' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs max-h-96 overflow-y-auto pr-1">
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/40"
            >
              <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                {s.desc}
              </span>
              <kbd className="px-2 py-0.5 font-mono text-[11px] bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded shadow-2xs text-neutral-800 dark:text-neutral-100">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-neutral-400 border-t border-neutral-200 dark:border-neutral-800 pt-2 text-center">
          Click the + button at the top to add new blank slides to your deck.
        </div>
      </div>
    </div>
  );
};
