import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import type { IDocument, IAnnotation, ISlidePage } from '../types/document';
import type { ToolType, IPageHistory, TriangleMode, GraphMode } from '../types/canvas';
import { fetchDocumentById, updateDocument, getPdfFileUrl } from '../services/api';
import { EditorToolbar } from '../components/Editor/EditorToolbar';
import { SlideViewport } from '../components/Editor/SlideViewport';
import { PageNavigation } from '../components/Editor/PageNavigation';
import { PageThumbnailSidebar } from '../components/Editor/PageThumbnailSidebar';
import { ShortcutsModal } from '../components/Editor/ShortcutsModal';
import { exportPresentationToPdf } from '../utils/pdfExport';
import * as pdfjsLib from 'pdfjs-dist';

interface EditorPageProps {
  documentId: string;
  onBackToDashboard: () => void;
}

export const EditorPage: React.FC<EditorPageProps> = ({
  documentId,
  onBackToDashboard,
}) => {
  const [doc, setDoc] = useState<IDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  // Ordered list of slides (each slide has its own immutable id, optional pdfPageNumber, and annotations)
  const [slides, setSlides] = useState<ISlidePage[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Undo / Redo history state: slideId -> { past: [...], future: [...] }
  const [historyBySlideId, setHistoryBySlideId] = useState<Record<string, IPageHistory>>({});

  // Active Tool & Styling (pencil is default)
  const [tool, setTool] = useState<ToolType>('pencil');
  const [triangleMode, setTriangleMode] = useState<TriangleMode>('right');
  const [graphMode, setGraphMode] = useState<GraphMode>('cartesian');
  const [strokeColor, setStrokeColor] = useState<string>('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelectTool = useCallback((selectedTool: ToolType) => {
    setTool(selectedTool);
    if (selectedTool === 'triangle') {
      setTriangleMode('right'); // First preference on tap
    } else if (selectedTool === 'graph') {
      setGraphMode('cartesian'); // First preference on tap: Cartesian 4Q
    }
  }, []);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Refs for current state in listeners & timers
  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  const currentSlideIndexRef = useRef(currentSlideIndex);
  currentSlideIndexRef.current = currentSlideIndex;

  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Fetch document data and initialize slide order
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const fetchedDoc = await fetchDocumentById(documentId);
        if (isCancelled) return;

        setDoc(fetchedDoc);

        // Build ordered slides from fetched document
        const initialSlides: ISlidePage[] =
          fetchedDoc.pages && fetchedDoc.pages.length > 0
            ? fetchedDoc.pages.map((p, idx) => ({
                id: p.id || `slide-${idx + 1}-${Date.now()}`,
                pdfPageNumber:
                  p.pdfPageNumber !== undefined
                    ? p.pdfPageNumber
                    : idx + 1 <= fetchedDoc.totalPages
                    ? idx + 1
                    : null,
                annotations: p.annotations || [],
                isUserAdded: Boolean(p.isUserAdded),
              }))
            : [
                {
                  id: `slide-1-${Date.now()}`,
                  pdfPageNumber: 1,
                  annotations: [],
                  isUserAdded: false,
                },
              ];

        setSlides(initialSlides);
        setCurrentSlideIndex(0);
        setLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || 'Failed to load document');
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, [documentId]);

  // Load PDF Document for thumbnail generation when document has a PDF file
  useEffect(() => {
    const hasPdf = Boolean(doc?.gridFsFileId || doc?.filePath || (!doc?.fileName?.startsWith('blank-') && doc?.mimeType === 'application/pdf'));
    if (!hasPdf) {
      setPdfDoc(null);
      return;
    }

    let isCancelled = false;
    const url = getPdfFileUrl(documentId);
    const loadingTask = pdfjsLib.getDocument(url);

    loadingTask.promise
      .then((loadedDoc) => {
        if (!isCancelled) {
          setPdfDoc(loadedDoc);
        }
      })
      .catch((err) => {
        console.warn('[EditorPage] Could not load PDF for thumbnails:', err);
        if (!isCancelled) setPdfDoc(null);
      });

    return () => {
      isCancelled = true;
    };
  }, [doc?.filePath, documentId]);

  // Current active slide object
  const currentSlide = slides[currentSlideIndex] || {
    id: 'placeholder',
    pdfPageNumber: null,
    annotations: [],
  };

  // Save annotations to server
  const handleSave = useCallback(
    async (silent = false) => {
      const activeSlides = slidesRef.current;
      if (activeSlides.length === 0) return;

      if (!silent) setIsSaving(true);

      try {
        const pagesPayload = activeSlides.map((s, idx) => ({
          id: s.id,
          pageNumber: idx + 1,
          pdfPageNumber: s.pdfPageNumber,
          annotations: s.annotations,
          isUserAdded: Boolean(s.isUserAdded),
        }));

        await updateDocument(documentId, {
          pages: pagesPayload,
          totalPages: pagesPayload.length,
        });

        setIsDirty(false);
        if (!silent) {
          setIsSaving(false);
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 2000);
        }
      } catch (err: any) {
        console.error('[EditorPage] Save failed:', err);
        if (!silent) {
          setIsSaving(false);
          alert(err?.message || 'Failed to save presentation.');
        }
      }
    },
    [documentId]
  );

  // Trigger debounced autosave (1.5s after user stops drawing)
  const triggerAutosave = useCallback(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = setTimeout(() => {
      handleSave(true);
    }, 1500);
  }, [handleSave]);

  // Export presentation to downloadable PDF
  const handleDownloadPdf = useCallback(async () => {
    if (!doc) return;
    try {
      setIsExporting(true);
      if (isDirtyRef.current) {
        await handleSave(true);
      }

      const hasPdf = Boolean(doc.gridFsFileId || doc.filePath || (!doc.fileName?.startsWith('blank-') && doc.mimeType === 'application/pdf'));
      await exportPresentationToPdf({
        title: doc.title || 'SlideSketch Presentation',
        slides: slidesRef.current,
        pdfUrl: hasPdf ? getPdfFileUrl(documentId) : undefined,
      });
      setIsExporting(false);
    } catch (err: any) {
      console.error('[EditorPage] Export failed:', err);
      setIsExporting(false);
      alert(err?.message || 'Failed to export presentation as PDF.');
    }
  }, [doc, documentId, handleSave]);

  // Update current slide's annotations with undo history push
  const handleChangeAnnotations = useCallback(
    (newAnnotations: IAnnotation[], pushHistory = true) => {
      const index = currentSlideIndexRef.current;
      const current = slidesRef.current[index];
      if (!current) return;

      if (pushHistory) {
        setHistoryBySlideId((prev) => {
          const slideHist = prev[current.id] || { past: [], future: [] };
          return {
            ...prev,
            [current.id]: {
              past: [...slideHist.past, current.annotations],
              future: [],
            },
          };
        });
      }

      setSlides((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          annotations: newAnnotations,
        };
        return next;
      });

      setIsDirty(true);
      setIsSaved(false);
      triggerAutosave();
    },
    [triggerAutosave]
  );

  // Add new page JUST BELOW current page
  const handleAddPage = useCallback(() => {
    setSlides((prev) => {
      const insertIndex = currentSlideIndexRef.current + 1;
      const newSlide: ISlidePage = {
        id: `slide-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        pdfPageNumber: null, // Blank white page
        annotations: [],
        isUserAdded: true, // Only pages added via Add Page can be deleted
      };

      const next = [...prev];
      next.splice(insertIndex, 0, newSlide);

      // Navigate to newly inserted page immediately
      setCurrentSlideIndex(insertIndex);
      setIsDirty(true);
      setIsSaved(false);
      triggerAutosave();

      return next;
    });
  }, [triggerAutosave]);

  // Delete slide - ONLY ALLOWED on user-added pages
  const handleDeleteSlide = useCallback(
    (indexToDelete: number) => {
      if (slides.length <= 1) return;
      const target = slides[indexToDelete];
      // STRICT SAFETY RULE: Only slides added by user via "+ Add Page" can be deleted
      if (!target || !target.isUserAdded) {
        return;
      }

      setSlides((prev) => {
        if (!prev[indexToDelete]?.isUserAdded) return prev;
        const next = prev.filter((_, idx) => idx !== indexToDelete);
        const newIndex = Math.min(
          currentSlideIndexRef.current >= indexToDelete
            ? Math.max(0, currentSlideIndexRef.current - 1)
            : currentSlideIndexRef.current,
          next.length - 1
        );
        setCurrentSlideIndex(newIndex);
        return next;
      });

      setIsDirty(true);
      setIsSaved(false);
      triggerAutosave();
    },
    [slides, triggerAutosave]
  );

  // Delete single annotation by ID
  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      const index = currentSlideIndexRef.current;
      const current = slidesRef.current[index];
      if (!current) return;

      const next = current.annotations.filter((a) => a.id !== id);
      handleChangeAnnotations(next, true);
    },
    [handleChangeAnnotations]
  );

  // Clear current slide annotations (open in-app confirmation modal)
  const handleClearPage = useCallback(() => {
    setIsResetConfirmOpen(true);
  }, []);

  const handleConfirmResetCanvas = useCallback(() => {
    handleChangeAnnotations([], true);
    setSelectedId(null);
    setIsResetConfirmOpen(false);
  }, [handleChangeAnnotations]);

  // Undo on current slide
  const handleUndo = useCallback(() => {
    const slideId = currentSlide.id;
    const hist = historyBySlideId[slideId];
    if (!hist || hist.past.length === 0) return;

    const previousState = hist.past[hist.past.length - 1];
    const newPast = hist.past.slice(0, -1);
    const currentAnnots = currentSlide.annotations;

    setHistoryBySlideId((prev) => ({
      ...prev,
      [slideId]: {
        past: newPast,
        future: [currentAnnots, ...(prev[slideId]?.future || [])],
      },
    }));

    setSlides((prev) => {
      const next = [...prev];
      next[currentSlideIndexRef.current] = {
        ...next[currentSlideIndexRef.current],
        annotations: previousState,
      };
      return next;
    });

    setIsDirty(true);
    triggerAutosave();
  }, [currentSlide, historyBySlideId, triggerAutosave]);

  // Redo on current slide
  const handleRedo = useCallback(() => {
    const slideId = currentSlide.id;
    const hist = historyBySlideId[slideId];
    if (!hist || hist.future.length === 0) return;

    const nextState = hist.future[0];
    const newFuture = hist.future.slice(1);
    const currentAnnots = currentSlide.annotations;

    setHistoryBySlideId((prev) => ({
      ...prev,
      [slideId]: {
        past: [...(prev[slideId]?.past || []), currentAnnots],
        future: newFuture,
      },
    }));

    setSlides((prev) => {
      const next = [...prev];
      next[currentSlideIndexRef.current] = {
        ...next[currentSlideIndexRef.current],
        annotations: nextState,
      };
      return next;
    });

    setIsDirty(true);
    triggerAutosave();
  }, [currentSlide, historyBySlideId, triggerAutosave]);

  const canUndo = (historyBySlideId[currentSlide.id]?.past.length || 0) > 0;
  const canRedo = (historyBySlideId[currentSlide.id]?.future.length || 0) > 0;

  // Handle Back to Dashboard with AUTOMATIC SAVE
  const handleBack = useCallback(async () => {
    if (isDirtyRef.current) {
      await handleSave(true);
    }
    onBackToDashboard();
  }, [handleSave, onBackToDashboard]);

  // Guarantee save if user presses browser back, refreshes, or closes tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirtyRef.current) {
        const pagesPayload = slidesRef.current.map((s, idx) => ({
          id: s.id,
          pageNumber: idx + 1,
          pdfPageNumber: s.pdfPageNumber,
          annotations: s.annotations,
        }));

        fetch(`/api/documents/${documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pages: pagesPayload,
            totalPages: pagesPayload.length,
          }),
          keepalive: true,
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also save on component unmount
      if (isDirtyRef.current) {
        handleSave(true);
      }
    };
  }, [documentId, handleSave]);

  // Centralized keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // 1. SAVE: Ctrl+S
      if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave(false);
        return;
      }

      // 2. UNDO: Ctrl+Z (without Shift)
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // 3. REDO: Ctrl+Shift+Z or Ctrl+Y
      if (
        (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z') ||
        (isCtrlOrCmd && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // 4. SLIDE NAVIGATION
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (currentSlideIndexRef.current < slidesRef.current.length - 1) {
          setCurrentSlideIndex((idx) => idx + 1);
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentSlideIndexRef.current > 0) {
          setCurrentSlideIndex((idx) => idx - 1);
        }
        return;
      }

      if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlideIndex(0);
        return;
      }

      if (e.key === 'End') {
        e.preventDefault();
        setCurrentSlideIndex(slidesRef.current.length - 1);
        return;
      }

      // 5. QUICK TOOL SELECTION (P or 7, L, A, R, C, T, G, E or 0)
      if (!isCtrlOrCmd && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'p' || key === '7') setTool('pencil');
        else if (key === 'l') setTool('line');
        else if (key === 'a') setTool('arrow');
        else if (key === 'r') setTool('rect');
        else if (key === 'c') handleSelectTool('ellipse');
        else if (key === 't') handleSelectTool('triangle');
        else if (key === 'g') handleSelectTool('graph');
        else if (key === 'e' || key === '0') handleSelectTool('eraser');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave, handleUndo, handleRedo, handleSelectTool]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-neutral-50 text-neutral-600">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading presentation...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-neutral-50 text-neutral-900 p-6">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-neutral-200 text-center space-y-4 shadow-xl">
          <p className="text-rose-600 font-semibold text-lg">Error Loading Document</p>
          <p className="text-neutral-600 text-sm">{error || 'Document not found.'}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const hasPdf = Boolean(doc?.gridFsFileId || doc?.filePath || (!doc?.fileName?.startsWith('blank-') && doc?.mimeType === 'application/pdf'));
  const pdfUrl = hasPdf ? getPdfFileUrl(documentId) : '';

  return (
    <div className="h-screen flex flex-col bg-neutral-100 overflow-hidden">
      {/* Top Toolbar */}
      <EditorToolbar
        title={doc.title}
        tool={tool}
        triangleMode={triangleMode}
        graphMode={graphMode}
        onSelectTool={handleSelectTool}
        onChangeTriangleMode={setTriangleMode}
        onChangeGraphMode={setGraphMode}
        strokeColor={strokeColor}
        onChangeStrokeColor={setStrokeColor}
        strokeWidth={strokeWidth}
        onChangeStrokeWidth={setStrokeWidth}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDeleteSelected={() => {}}
        hasSelected={false}
        onClearPage={handleClearPage}
        onAddPage={handleAddPage}
        isSaving={isSaving}
        isSaved={isSaved}
        isDirty={isDirty}
        onSave={() => handleSave(false)}
        onDownloadPdf={handleDownloadPdf}
        isExporting={isExporting}
        onBackToDashboard={handleBack}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Main Workspace Area: Sidebar + 16:9 Viewport */}
      <div className="flex-1 flex min-h-0 relative">
        <PageThumbnailSidebar
          isOpen={sidebarOpen}
          slides={slides}
          currentSlideIndex={currentSlideIndex}
          onSelectSlide={setCurrentSlideIndex}
          onDeleteSlide={handleDeleteSlide}
          pdfDoc={pdfDoc}
        />

        <SlideViewport
          pdfUrl={pdfUrl}
          pdfPageNumber={currentSlide.pdfPageNumber}
          tool={tool}
          triangleMode={triangleMode}
          graphMode={graphMode}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          annotations={currentSlide.annotations || []}
          selectedId={selectedId}
          onSelectAnnotation={setSelectedId}
          onChangeAnnotations={handleChangeAnnotations}
          onDeleteAnnotation={handleDeleteAnnotation}
        />
      </div>

      {/* Bottom Page Navigation */}
      <PageNavigation
        currentIndex={currentSlideIndex}
        totalSlides={slides.length}
        onSelectIndex={setCurrentSlideIndex}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* Reset Canvas Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-amber-500">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                  Reset Canvas?
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Slide {currentSlideIndex + 1}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              This will clear all drawings on this slide. You can restore them anytime using Undo (<kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-mono">Ctrl+Z</kbd>).
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResetCanvas}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors"
              >
                Reset Canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
