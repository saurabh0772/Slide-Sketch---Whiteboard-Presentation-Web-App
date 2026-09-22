import React, { useState, useRef, useEffect } from 'react';
import {
  Pencil,
  Highlighter,
  Minus,
  ArrowRight,
  Square,
  Circle,
  Triangle,
  TriangleRight,
  LineChart,
  TrendingUp,
  Grid,
  Eraser,
  Trash2,
  Undo2,
  Redo2,
  Save,
  Check,
  ArrowLeft,
  PanelLeft,
  RotateCcw,
  Plus,
  Download,
  MoreVertical,
} from 'lucide-react';
import type { ToolType, TriangleMode, GraphMode } from '../../types/canvas';

interface EditorToolbarProps {
  title: string;
  tool: ToolType;
  triangleMode?: TriangleMode;
  graphMode?: GraphMode;
  onSelectTool: (t: ToolType) => void;
  onChangeTriangleMode?: (mode: TriangleMode) => void;
  onChangeGraphMode?: (mode: GraphMode) => void;
  strokeColor: string;
  onChangeStrokeColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  hasSelected: boolean;
  onClearPage: () => void;
  onAddPage: () => void;
  isSaving: boolean;
  isSaved: boolean;
  isDirty: boolean;
  onSave: () => void;
  onDownloadPdf?: () => void;
  isExporting?: boolean;
  onBackToDashboard: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const PRESET_COLORS = [
  { name: 'Dark Charcoal (Black)', value: '#1e293b' },
  { name: 'Highlighter Orange', value: '#fce083' },
  { name: 'Pure White', value: '#ffffff' },
  { name: 'Rose Red', value: '#e11d48' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Emerald Green', value: '#059669' },
];

const PENCIL_STROKE_WIDTHS = [
  { label: 'Thin', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
];

const HIGHLIGHTER_STROKE_WIDTHS = [
  { label: 'Thin', value: 16 },
  { label: 'Medium', value: 24 },
  { label: 'Thick', value: 36 },
];

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  title,
  tool,
  triangleMode = 'right',
  graphMode = 'cartesian',
  onSelectTool,
  onChangeTriangleMode,
  onChangeGraphMode,
  strokeColor,
  onChangeStrokeColor,
  strokeWidth,
  onChangeStrokeWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDeleteSelected,
  hasSelected,
  onClearPage,
  onAddPage,
  isSaving,
  isSaved,
  isDirty,
  onSave,
  onDownloadPdf,
  isExporting = false,
  onBackToDashboard,
  sidebarOpen,
  onToggleSidebar,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const currentStrokeWidths = tool === 'highlighter' ? HIGHLIGHTER_STROKE_WIDTHS : PENCIL_STROKE_WIDTHS;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="h-14 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-3 sm:px-4 flex items-center justify-between shadow-xs select-none z-30">
      {/* Left section: Back, Sidebar toggle, Title */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        <button
          onClick={onBackToDashboard}
          title="Back to Dashboard"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden md:inline">Dashboard</span>
        </button>

        <button
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Hide Thumbnails' : 'Show Thumbnails'}
          className={`p-1.5 rounded-lg border transition-colors ${
            sidebarOpen
              ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-1.5 min-w-0 pl-1 border-l border-neutral-200 dark:border-neutral-800">
          <span className="font-semibold text-neutral-800 dark:text-neutral-100 text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[200px]">
            {title}
          </span>
          {isDirty && (
            <span
              title="Unsaved changes"
              className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 animate-pulse"
            />
          )}
        </div>
      </div>

      {/* Middle section: Drawing Tools */}
      <div className="flex items-center space-x-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 overflow-x-auto max-w-full">
        {/* 1. Highlighter */}
        <ToolButton
          icon={
            <div className="relative flex items-center justify-center">
              <Highlighter className="w-4 h-4" />
              <span
                className="absolute -bottom-0.5 left-0.5 right-0.5 h-1 rounded-full opacity-90 shadow-2xs"
                style={{ backgroundColor: '#fce083' }}
              />
            </div>
          }
          label="Highlighter (1 or H) - Auto Orange 24px"
          active={tool === 'highlighter'}
          onClick={() => onSelectTool('highlighter')}
        />

        {/* 2. Line */}
        <ToolButton
          icon={<Minus className="w-4 h-4" />}
          label="Line (2 or L)"
          active={tool === 'line'}
          onClick={() => onSelectTool('line')}
        />

        {/* 3. Arrow */}
        <ToolButton
          icon={<ArrowRight className="w-4 h-4" />}
          label="Arrow (3 or A)"
          active={tool === 'arrow'}
          onClick={() => onSelectTool('arrow')}
        />

        {/* 4. Square / Rectangle */}
        <ToolButton
          icon={<Square className="w-4 h-4" />}
          label="Square / Rectangle (4 or R)"
          active={tool === 'rect'}
          onClick={() => onSelectTool('rect')}
        />

        {/* 5. Circle / Ellipse */}
        <ToolButton
          icon={<Circle className="w-4 h-4" />}
          label="Circle / Ellipse (5 or C)"
          active={tool === 'ellipse'}
          onClick={() => onSelectTool('ellipse')}
        />

        {/* 6. Triangle */}
        <ToolButton
          icon={triangleMode === 'regular' ? <Triangle className="w-4 h-4" /> : <TriangleRight className="w-4 h-4" />}
          label="Triangle (6 or T) - Right-Angle by default"
          active={tool === 'triangle'}
          onClick={() => {
            onSelectTool('triangle');
            onChangeTriangleMode?.('right');
          }}
        />

        {/* Sub-selector for Triangle mode: Right-Angle (first preference) vs Regular */}
        {tool === 'triangle' && (
          <div className="flex items-center bg-neutral-200/90 p-0.5 rounded-lg space-x-0.5 ml-0.5">
            <button
              type="button"
              onClick={() => onChangeTriangleMode?.('right')}
              title="Right-Angle Triangle (90° corner - Default preference)"
              className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                triangleMode === 'right'
                  ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60'
              }`}
            >
              <TriangleRight className="w-3 h-3" />
              <span className="hidden sm:inline">Right-Angle</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeTriangleMode?.('regular')}
              title="Regular / Isosceles Triangle (Hold Shift to toggle)"
              className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                triangleMode === 'regular'
                  ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60'
              }`}
            >
              <Triangle className="w-3 h-3" />
              <span className="hidden sm:inline">Regular</span>
            </button>
          </div>
        )}

        {/* 7. Pen / Pencil */}
        <ToolButton
          icon={<Pencil className="w-4 h-4" />}
          label="Pen / Pencil (7 or P) - Auto Black 4px"
          active={tool === 'pencil'}
          onClick={() => onSelectTool('pencil')}
        />

        {/* 8. Graph / Coordinate Plane */}
        <ToolButton
          icon={<LineChart className="w-4 h-4" />}
          label="Graph / Coordinate Plane (8 or G) - Cartesian (4Q) / Grid / Quadrant"
          active={tool === 'graph'}
          onClick={() => {
            onSelectTool('graph');
            onChangeGraphMode?.('cartesian');
          }}
        />

        {/* Sub-selector for Graph mode: Cartesian (4Q) (first preference) -> Grid -> Quadrant */}
        {tool === 'graph' && (
          <div className="flex items-center bg-neutral-200/90 p-0.5 rounded-lg space-x-0.5 ml-0.5">
            <button
              type="button"
              onClick={() => onChangeGraphMode?.('cartesian')}
              title="Cartesian 4-Quadrant Plane (+ cross axes - Default preference)"
              className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                graphMode === 'cartesian'
                  ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60'
              }`}
            >
              <Plus className="w-3 h-3" />
              <span className="hidden sm:inline">Cartesian (4Q)</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeGraphMode?.('grid')}
              title="Coordinate Grid (Axes with grid lines)"
              className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                graphMode === 'grid'
                  ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60'
              }`}
            >
              <Grid className="w-3 h-3" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeGraphMode?.('quadrant')}
              title="Quadrant I (L-shaped X-Y Axes with arrows)"
              className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                graphMode === 'quadrant'
                  ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span className="hidden sm:inline">Quadrant I</span>
            </button>
          </div>
        )}

        {/* 0. Eraser */}
        <ToolButton
          icon={<Eraser className="w-4 h-4" />}
          label="Eraser (0 or E)"
          active={tool === 'eraser'}
          onClick={() => onSelectTool('eraser')}
        />

        <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 mx-1" />

        {/* Color Palette */}
        <div className="flex items-center space-x-1 pl-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onChangeStrokeColor(c.value)}
              title={c.name}
              className={`w-5 h-5 rounded-full border transition-transform ${
                strokeColor === c.value
                  ? 'scale-125 ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-neutral-900 border-neutral-400'
                  : 'border-neutral-300 dark:border-neutral-600 hover:scale-110'
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>

        {/* Plus icon to add more pages - next to color area */}
        <button
          onClick={onAddPage}
          title="Add New Slide / Page (+)"
          className="flex items-center space-x-1 ml-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold transition-all hover:scale-105 active:scale-95 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[11px] hidden sm:inline">Add Page</span>
        </button>

        <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 mx-1" />

        {/* Stroke Width Selector */}
        <div className="flex items-center space-x-1">
          {currentStrokeWidths.map((sw) => (
            <button
              key={sw.value}
              onClick={() => onChangeStrokeWidth(sw.value)}
              title={`${sw.label} (${sw.value}px)`}
              className={`px-1.5 py-0.5 text-[11px] font-medium rounded transition-colors ${
                strokeWidth === sw.value
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {sw.value}px
            </button>
          ))}
        </div>
      </div>

      {/* Right section: Undo, Redo, Clear Page, Delete, Save */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
          className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {hasSelected && (
          <button
            onClick={onDeleteSelected}
            title="Delete Selected (Delete/Backspace)"
            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Three dots menu for Reset Canvas, Save PDF, Download PDF */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title="More options"
            className={`p-1.5 rounded-lg transition-colors relative ${
              isMenuOpen
                ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <MoreVertical className="w-4 h-4" />
            {isDirty && !isSaved && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-neutral-900" />
            )}
          </button>

          {isMenuOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              style={{ transformOrigin: 'top right' }}
            >
              {/* Option 1: Reset this canvas */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onClearPage();
                }}
                className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-left cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-medium">Reset this canvas</span>
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-normal">
                    Clear slide annotations
                  </span>
                </div>
              </button>

              <div className="my-1 border-t border-neutral-100 dark:border-neutral-700/60" />

              {/* Option 2: Save PDF */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onSave();
                }}
                disabled={isSaving}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition-colors text-left disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : isSaved ? (
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Save className="w-4 h-4 text-indigo-500 shrink-0" />
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium">Save PDF</span>
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-normal">
                      {isSaving ? 'Saving changes...' : isSaved ? 'All changes saved' : 'Save current progress'}
                    </span>
                  </div>
                </div>
                {isDirty && !isSaved && !isSaving && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-medium">
                    Unsaved
                  </span>
                )}
              </button>

              {/* Option 3: Download PDF */}
              {onDownloadPdf && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDownloadPdf();
                  }}
                  disabled={isExporting}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition-colors text-left disabled:opacity-50 cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    {isExporting ? (
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <Download className="w-4 h-4 text-indigo-500 shrink-0" />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">Download PDF</span>
                      <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-normal">
                        {isExporting ? 'Generating PDF...' : 'Export with annotations'}
                      </span>
                    </div>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    title={label}
    className={`p-1.5 rounded-lg transition-all ${
      active
        ? 'bg-indigo-600 text-white shadow-xs scale-105'
        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
    }`}
  >
    {icon}
  </button>
);
