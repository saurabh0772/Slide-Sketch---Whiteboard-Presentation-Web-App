import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { IPdfRect } from '../../types/canvas';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfViewerProps {
  pdfUrl: string;
  pdfPageNumber?: number | null;
  pdfRect: IPdfRect;
  onPageLoaded: (info: { width: number; height: number; totalPages: number }) => void;
  onError?: (err: string) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfUrl,
  pdfPageNumber,
  pdfRect,
  onPageLoaded,
  onError,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  // 1. Load PDF document on pdfUrl change
  useEffect(() => {
    if (!pdfUrl) {
      setLoading(false);
      setPdfDoc(null);
      return;
    }

    let isCancelled = false;
    setLoading(true);

    const loadDoc = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const doc = await loadingTask.promise;

        if (!isCancelled) {
          setPdfDoc(doc);
          setLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('[PdfViewer] Could not load PDF file stream (might be blank doc):', err?.message);
          setLoading(false);
          setPdfDoc(null);
          // Default 16:9 page dimensions for blank/custom documents
          onPageLoaded({
            width: 1920,
            height: 1080,
            totalPages: 1,
          });
        }
      }
    };

    loadDoc();

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl]);

  // 2. Report unscaled page dimensions whenever pdfPageNumber changes
  useEffect(() => {
    if (!pdfDoc || !pdfPageNumber || pdfPageNumber > pdfDoc.numPages) {
      onPageLoaded({
        width: 1920,
        height: 1080,
        totalPages: pdfDoc ? pdfDoc.numPages : 1,
      });
      return;
    }

    let isCancelled = false;

    const fetchPageDimensions = async () => {
      try {
        const page = await pdfDoc.getPage(pdfPageNumber);
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        if (!isCancelled) {
          onPageLoaded({
            width: unscaledViewport.width,
            height: unscaledViewport.height,
            totalPages: pdfDoc.numPages,
          });
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[PdfViewer] Failed to get page:', err);
          onError?.(err?.message || 'Failed to get PDF page');
        }
      }
    };

    fetchPageDimensions();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pdfPageNumber]);

  // 3. Render page or blank white slide into canvas matching calculated pdfRect
  useEffect(() => {
    if (!canvasRef.current || pdfRect.width <= 0 || pdfRect.height <= 0) {
      return;
    }

    let isCancelled = false;

    const renderPage = async () => {
      try {
        // Cancel any pending render task
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // ignore cancellation error
          }
          renderTaskRef.current = null;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(pdfRect.width * dpr);
        canvas.height = Math.floor(pdfRect.height * dpr);
        canvas.style.width = `${pdfRect.width}px`;
        canvas.style.height = `${pdfRect.height}px`;

        // If no pdfDoc or slide is a blank page (pdfPageNumber is null), render pure white canvas
        if (!pdfDoc || !pdfPageNumber || pdfPageNumber > pdfDoc.numPages) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          return;
        }

        const page = await pdfDoc.getPage(pdfPageNumber);
        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const scale = (pdfRect.width / unscaledViewport.width) * dpr;
        const viewport = page.getViewport({ scale });

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && !isCancelled) {
          console.error('[PdfViewer] Render error:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, pdfPageNumber, pdfRect.width, pdfRect.height]);

  return (
    <div
      style={{
        position: 'absolute',
        left: pdfRect.x,
        top: pdfRect.y,
        width: pdfRect.width,
        height: pdfRect.height,
      }}
      className="pointer-events-none select-none shadow-xs"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white text-neutral-500">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Loading slide...</span>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="block w-full h-full bg-white" />
    </div>
  );
};
