import React from 'react';
import {
  Pencil,
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
  { name: 'Dark Charcoal', value: '#1e293b' },
  { name: 'Pure White', value: '#ffffff' },
  { name: 'Rose Red', value: '#e11d48' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Emerald Green', value: '#059669' },
  { name: 'Amber Orange', value: '#d97706' },
  { name: 'Violet Purple', value: '#7c3aed' },
];

const STROKE_WIDTHS = [
  { label: 'Thin', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
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
        <ToolButton
          icon={<Pencil className="w-4 h-4" />}
          label="Pencil / Freehand (P or 7)"
          active={tool === 'pencil'}
          onClick={() => onSelectTool('pencil')}
        />
        <ToolButton
          icon={<Minus className="w-4 h-4" />}
          label="Line (L)"
          active={tool === 'line'}
          onClick={() => onSelectTool('line')}
        />
        <ToolButton
          icon={<ArrowRight className="w-4 h-4" />}
          label="Arrow (A)"
          active={tool === 'arrow'}
          onClick={() => onSelectTool('arrow')}
        />
        <ToolButton
          icon={<Square className="w-4 h-4" />}
          label="Rectangle (R)"
          active={tool === 'rect'}
          onClick={() => onSelectTool('rect')}
        />
        <ToolButton
          icon={<Circle className="w-4 h-4" />}
          label="Circle (C)"
          active={tool === 'ellipse'}
          onClick={() => onSelectTool('ellipse')}
        />
        <ToolButton
          icon={triangleMode === 'regular' ? <Triangle className="w-4 h-4" /> : <TriangleRight className="w-4 h-4" />}
          label="Triangle (T) - Right-Angle by default"
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

        <ToolButton
          icon={<LineChart className="w-4 h-4" />}
          label="Graph / Coordinate Plane (G) - Cartesian (4Q) / Grid / Quadrant"
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

        <ToolButton
          icon={<Eraser className="w-4 h-4" />}
          label="Eraser (E or 0)"
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
          {STROKE_WIDTHS.map((sw) => (
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

        <button
          onClick={onClearPage}
          title="Reset canvas for this slide (Undoable)"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-medium">Reset Canvas</span>
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

        <button
          onClick={onSave}
          disabled={isSaving}
          title="Save annotations to server (Ctrl+S)"
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs ${
            isSaved
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : isDirty
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-500/30'
              : 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600'
          }`}
        >
          {isSaving ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isSaved ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{isSaving ? 'Saving' : isSaved ? 'Saved' : 'Save'}</span>
        </button>

        {/* Download PDF Button - beside Save */}
        {onDownloadPdf && (
          <button
            onClick={onDownloadPdf}
            disabled={isExporting}
            title="Download whiteboard / presentation as PDF"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs sm:text-sm font-semibold transition-all border border-neutral-300/80 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? (
              <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            )}
            <span className="hidden md:inline">{isExporting ? 'Exporting...' : 'Download PDF'}</span>
            <span className="md:hidden">{isExporting ? '...' : 'PDF'}</span>
          </button>
        )}
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
