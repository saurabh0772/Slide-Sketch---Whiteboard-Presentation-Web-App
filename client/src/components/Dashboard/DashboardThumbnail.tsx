import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { IDocumentSummary } from '../../types/document';
import { calculatePdfRect } from '../../utils/coordinates';
import { renderShapeToContext } from '../../utils/pdfExport';
import { getPdfFileUrl } from '../../services/api';
import { FileText } from 'lucide-react';

// Configure PDF.js worker
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface DashboardThumbnailProps {
  doc: IDocumentSummary;
}

export const DashboardThumbnail: React.FC<DashboardThumbnailProps> = React.memo(({ doc }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isCancelled = false;

    // Cancel in-flight PDF render task
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // ignore
      }
      renderTaskRef.current = null;
    }

    const TARGET_W = 480;
    const TARGET_H = 270;

    const renderThumbnail = async () => {
      setLoading(true);
      setError(false);

      // 1. Reset canvas to clean white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, TARGET_W, TARGET_H);

      const hasPdf = Boolean(
        doc.gridFsFileId ||
        doc.filePath ||
        (!doc.fileName?.startsWith('blank-') && doc.fileSize > 0)
      );

      let pdfRect = {
        x: 0,
        y: 0,
        width: TARGET_W,
        height: TARGET_H,
        scale: TARGET_W / 1920,
      };

      if (hasPdf) {
        try {
          const url = getPdfFileUrl(doc._id);
          const loadingTask = pdfjsLib.getDocument(url);
          const pdfDoc = await loadingTask.promise;

          if (isCancelled) return;

          // Fetch cover page (Page 1)
          const page = await pdfDoc.getPage(1);
          if (isCancelled) return;

          const unscaledViewport = page.getViewport({ scale: 1 });
          const calculatedRect = calculatePdfRect(
            TARGET_W,
            TARGET_H,
            unscaledViewport.width,
            unscaledViewport.height
          );
          pdfRect = {
            x: calculatedRect.x,
            y: calculatedRect.y,
            width: calculatedRect.width,
            height: calculatedRect.height,
            scale: calculatedRect.scale,
          };

          const pdfScale = calculatedRect.width / unscaledViewport.width;
          const viewport = page.getViewport({ scale: pdfScale });

          const bufferCanvas = document.createElement('canvas');
          bufferCanvas.width = Math.max(1, Math.round(calculatedRect.width));
          bufferCanvas.height = Math.max(1, Math.round(calculatedRect.height));
          const bufferCtx = bufferCanvas.getContext('2d');

          if (bufferCtx) {
            const task = page.render({
              canvasContext: bufferCtx,
              viewport,
            });
            renderTaskRef.current = task;
            await task.promise;
            renderTaskRef.current = null;

            if (isCancelled) return;

            ctx.drawImage(
              bufferCanvas,
              calculatedRect.x,
              calculatedRect.y,
              calculatedRect.width,
              calculatedRect.height
            );
          }
        } catch (err: any) {
          if (err?.name !== 'RenderingCancelledException' && !isCancelled) {
            console.warn('[DashboardThumbnail] Failed to render PDF thumbnail for doc:', doc._id, err?.message);
            setError(true);
          }
        }
      } else {
        // Blank presentation: draw subtle whiteboard background grid
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, TARGET_W, TARGET_H);
      }

      if (isCancelled) return;

      // 2. Render any annotations saved on slide 1
      const firstPage = doc.pages?.[0];
      if (firstPage?.annotations && Array.isArray(firstPage.annotations) && firstPage.annotations.length > 0) {
        ctx.save();
        ctx.translate(pdfRect.x, pdfRect.y);
        ctx.scale(pdfRect.scale, pdfRect.scale);

        for (const shape of firstPage.annotations) {
          renderShapeToContext(ctx, shape);
        }

        ctx.restore();
      }

      if (!isCancelled) {
        setLoading(false);
      }
    };

    renderThumbnail();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        renderTaskRef.current = null;
      }
    };
  }, [doc._id, doc.updatedAt, doc.gridFsFileId, doc.filePath]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-white dark:bg-neutral-900 flex items-center justify-center">
      {/* Canvas for sharp thumbnail */}
      <canvas
        ref={canvasRef}
        width={480}
        height={270}
        className={`w-full h-full object-contain pointer-events-none transition-opacity duration-300 ${
          loading ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Loading Skeleton */}
      {loading && (
        <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800 animate-pulse flex items-center justify-center">
          <FileText className="w-8 h-8 text-neutral-300 dark:text-neutral-600 animate-pulse" />
        </div>
      )}

      {/* Fallback Icon on Error */}
      {error && !loading && (
        <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <FileText className="w-10 h-10 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
        </div>
      )}
    </div>
  );
});
