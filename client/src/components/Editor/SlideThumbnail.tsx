import React, { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { ISlidePage } from '../../types/document';
import { calculatePdfRect } from '../../utils/coordinates';
import { renderShapeToContext } from '../../utils/pdfExport';

// Ensure PDF.js worker is registered
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface SlideThumbnailProps {
  slide: ISlidePage;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
}

export const SlideThumbnail: React.FC<SlideThumbnailProps> = React.memo(
  ({ slide, pdfDoc }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let isCancelled = false;

      // Cancel any prior in-flight PDF rendering task
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore cancellation
        }
        renderTaskRef.current = null;
      }

      const drawThumbnail = async () => {
        const TARGET_W = 320;
        const TARGET_H = 180;

        // 1. Fill base canvas with crisp white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, TARGET_W, TARGET_H);

        let pdfRect = {
          x: 0,
          y: 0,
          width: TARGET_W,
          height: TARGET_H,
          scale: TARGET_W / 1920,
        };

        // 2. Render PDF background if this slide maps to a PDF page
        if (pdfDoc && typeof slide.pdfPageNumber === 'number' && slide.pdfPageNumber >= 1) {
          try {
            const page = await pdfDoc.getPage(slide.pdfPageNumber);
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

            const pdfBufferCanvas = document.createElement('canvas');
            pdfBufferCanvas.width = Math.max(1, Math.round(calculatedRect.width));
            pdfBufferCanvas.height = Math.max(1, Math.round(calculatedRect.height));
            const pdfCtx = pdfBufferCanvas.getContext('2d');

            if (pdfCtx) {
              const renderTask = page.render({
                canvasContext: pdfCtx,
                viewport,
              });
              renderTaskRef.current = renderTask;
              await renderTask.promise;
              renderTaskRef.current = null;

              if (isCancelled) return;

              ctx.drawImage(
                pdfBufferCanvas,
                calculatedRect.x,
                calculatedRect.y,
                calculatedRect.width,
                calculatedRect.height
              );
            }
          } catch (err: any) {
            if (err?.name !== 'RenderingCancelledException') {
              console.warn(`[SlideThumbnail] Could not render page ${slide.pdfPageNumber}:`, err?.message);
            }
          }
        }

        if (isCancelled) return;

        // 3. Render vector annotations over the slide
        if (slide.annotations && Array.isArray(slide.annotations) && slide.annotations.length > 0) {
          ctx.save();
          ctx.translate(pdfRect.x, pdfRect.y);
          ctx.scale(pdfRect.scale, pdfRect.scale);

          for (const shape of slide.annotations) {
            renderShapeToContext(ctx, shape);
          }

          ctx.restore();
        }
      };

      drawThumbnail();

      return () => {
        isCancelled = true;
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // ignore cancellation
          }
          renderTaskRef.current = null;
        }
      };
    }, [slide, pdfDoc]);

    return (
      <canvas
        ref={canvasRef}
        width={320}
        height={180}
        className="w-full h-full object-contain rounded-md bg-white pointer-events-none block"
      />
    );
  },
  (prevProps, nextProps) => {
    // Only re-render when annotations or pdfDoc or slide attributes change
    return (
      prevProps.slide === nextProps.slide &&
      prevProps.pdfDoc === nextProps.pdfDoc
    );
  }
);
