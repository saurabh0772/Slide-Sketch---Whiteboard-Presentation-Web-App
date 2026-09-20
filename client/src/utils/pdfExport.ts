import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import type { IAnnotation } from '../types/document';
import { calculatePdfRect, getGraphElements } from './coordinates';

// Ensure PDF.js worker is configured
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export interface IExportSlide {
  pdfPageNumber?: number | null;
  annotations: IAnnotation[];
}

export interface IExportOptions {
  title: string;
  slides: IExportSlide[];
  pdfUrl?: string;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Render a single shape onto an HTML5 2D canvas context
 */
function renderShapeToContext(ctx: CanvasRenderingContext2D, shape: IAnnotation) {
  ctx.save();

  if (shape.type === 'pencil' && shape.points && shape.points.length >= 2) {
    ctx.beginPath();
    ctx.strokeStyle = shape.stroke || '#000000';
    ctx.lineWidth = shape.strokeWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(shape.points[0], shape.points[1]);
    for (let i = 2; i < shape.points.length; i += 2) {
      ctx.lineTo(shape.points[i], shape.points[i + 1]);
    }
    ctx.stroke();
  } else if (shape.type === 'line' && shape.points && shape.points.length >= 4) {
    const [x1, y1, x2, y2] = shape.points;
    ctx.beginPath();
    ctx.strokeStyle = shape.stroke || '#000000';
    ctx.lineWidth = shape.strokeWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  } else if (shape.type === 'arrow' && shape.points && shape.points.length >= 4) {
    const [x1, y1, x2, y2] = shape.points;
    ctx.beginPath();
    ctx.strokeStyle = shape.stroke || '#000000';
    ctx.lineWidth = shape.strokeWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Draw Arrowhead
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLength = 16;
    const headAngle = Math.PI / 6;

    ctx.beginPath();
    ctx.fillStyle = shape.stroke || '#000000';
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLength * Math.cos(angle - headAngle),
      y2 - headLength * Math.sin(angle - headAngle)
    );
    ctx.lineTo(
      x2 - headLength * Math.cos(angle + headAngle),
      y2 - headLength * Math.sin(angle + headAngle)
    );
    ctx.closePath();
    ctx.fill();
  } else if (shape.type === 'rect') {
    const x = shape.x;
    const y = shape.y;
    const w = shape.width || 0;
    const h = shape.height || 0;

    if (shape.fill && shape.fill !== 'transparent') {
      ctx.fillStyle = shape.fill;
      ctx.fillRect(x, y, w, h);
    }

    ctx.beginPath();
    ctx.strokeStyle = shape.stroke || '#000000';
    ctx.lineWidth = shape.strokeWidth || 2;
    ctx.strokeRect(x, y, w, h);
  } else if (shape.type === 'ellipse') {
    const w = Math.abs(shape.width || 0);
    const h = Math.abs(shape.height || 0);
    const cx = shape.x + w / 2;
    const cy = shape.y + h / 2;
    const rx = w / 2;
    const ry = h / 2;

    if (rx > 0 && ry > 0) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);

      if (shape.fill && shape.fill !== 'transparent') {
        ctx.fillStyle = shape.fill;
        ctx.fill();
      }

      ctx.strokeStyle = shape.stroke || '#000000';
      ctx.lineWidth = shape.strokeWidth || 2;
      ctx.stroke();
    }
  } else if (shape.type === 'triangle' && shape.points && shape.points.length >= 6) {
    const [x1, y1, x2, y2, x3, y3] = shape.points;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();

    if (shape.fill && shape.fill !== 'transparent') {
      ctx.fillStyle = shape.fill;
      ctx.fill();
    }

    ctx.strokeStyle = shape.stroke || '#000000';
    ctx.lineWidth = shape.strokeWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  } else if (shape.type === 'text' && shape.text) {
    const fontSize = shape.fontSize || 28;
    ctx.font = `${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = shape.stroke || '#000000';
    ctx.fillText(shape.text, shape.x, shape.y + fontSize);
  } else if (shape.type === 'graph') {
    const w = Math.abs(shape.width || 0);
    const h = Math.abs(shape.height || 0);
    if (w >= 4 && h >= 4) {
      const elements = getGraphElements(shape.x, shape.y, w, h, shape.graphType || 'quadrant');

      // Grid lines (if grid mode)
      if (elements.gridLines && elements.gridLines.length > 0) {
        ctx.save();
        ctx.strokeStyle = shape.stroke || '#000000';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.25;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (const [gx1, gy1, gx2, gy2] of elements.gridLines) {
          ctx.moveTo(gx1, gy1);
          ctx.lineTo(gx2, gy2);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Tick marks
      ctx.beginPath();
      ctx.strokeStyle = shape.stroke || '#000000';
      ctx.lineWidth = Math.max(1.5, (shape.strokeWidth || 2) * 0.75);
      ctx.lineCap = 'round';
      for (const [tx1, ty1, tx2, ty2] of elements.ticks) {
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
      }
      ctx.stroke();

      // Axes with arrows
      const headLength = 12;
      const headAngle = Math.PI / 6;

      for (const axis of elements.axes) {
        const [ax1, ay1, ax2, ay2] = axis.points;

        ctx.beginPath();
        ctx.strokeStyle = shape.stroke || '#000000';
        ctx.lineWidth = shape.strokeWidth || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(ax1, ay1);
        ctx.lineTo(ax2, ay2);
        ctx.stroke();

        // Draw arrow head at end
        if (axis.pointerAtEnd) {
          const angle = Math.atan2(ay2 - ay1, ax2 - ax1);
          ctx.beginPath();
          ctx.fillStyle = shape.stroke || '#000000';
          ctx.moveTo(ax2, ay2);
          ctx.lineTo(
            ax2 - headLength * Math.cos(angle - headAngle),
            ay2 - headLength * Math.sin(angle - headAngle)
          );
          ctx.lineTo(
            ax2 - headLength * Math.cos(angle + headAngle),
            ay2 - headLength * Math.sin(angle + headAngle)
          );
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  ctx.restore();
}

/**
 * Save a PDF blob by opening the native OS file manager ("Save As" dialog)
 * or falling back to standard browser download
 */
export async function downloadPdfBlob(blob: Blob, suggestedName: string): Promise<void> {
  const cleanName = suggestedName.endsWith('.pdf') ? suggestedName : `${suggestedName}.pdf`;

  // 1. Try modern File System Access API (opens the OS file manager asking for location)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: cleanName,
        types: [
          {
            description: 'PDF Document (*.pdf)',
            accept: {
              'application/pdf': ['.pdf'],
            },
          },
        ],
      });

      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User deliberately cancelled in file manager dialog
        return;
      }
      console.warn('[pdfExport] showSaveFilePicker not permitted or failed, using fallback:', err);
    }
  }

  // 2. Fallback: Trigger browser download via Blob URL
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = blobUrl;
  anchor.download = cleanName;
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(blobUrl);
  }, 2000);
}

/**
 * Export the full presentation to a downloadable 16:9 PDF
 */
export async function exportPresentationToPdf({
  title,
  slides,
  pdfUrl,
  onProgress,
}: IExportOptions): Promise<void> {
  const WIDTH = 1920;
  const HEIGHT = 1080;

  let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
  if (pdfUrl) {
    try {
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      pdfDoc = await loadingTask.promise;
    } catch (err) {
      console.warn('[pdfExport] Could not load base PDF document for background export:', err);
    }
  }

  // Initialize jsPDF in landscape 1920x1080 points
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [WIDTH, HEIGHT],
    compress: true,
  });

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Failed to create 2D canvas context for PDF export.');
  }

  for (let i = 0; i < slides.length; i++) {
    onProgress?.(i + 1, slides.length);
    const slide = slides[i];

    // Reset canvas to pure white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // If slide corresponds to a PDF page, render PDF background
    if (pdfDoc && typeof slide.pdfPageNumber === 'number' && slide.pdfPageNumber >= 1) {
      try {
        const page = await pdfDoc.getPage(slide.pdfPageNumber);
        const unscaledViewport = page.getViewport({ scale: 1 });
        const pdfRect = calculatePdfRect(
          WIDTH,
          HEIGHT,
          unscaledViewport.width,
          unscaledViewport.height
        );

        const pdfScale = pdfRect.width / unscaledViewport.width;
        const viewport = page.getViewport({ scale: pdfScale });

        const pdfCanvas = document.createElement('canvas');
        pdfCanvas.width = pdfRect.width;
        pdfCanvas.height = pdfRect.height;
        const pdfCtx = pdfCanvas.getContext('2d');

        if (pdfCtx) {
          await page.render({
            canvasContext: pdfCtx,
            viewport,
          }).promise;

          ctx.drawImage(pdfCanvas, pdfRect.x, pdfRect.y, pdfRect.width, pdfRect.height);
        }
      } catch (err) {
        console.warn(`[pdfExport] Failed to render PDF page ${slide.pdfPageNumber}:`, err);
      }
    }

    // Render all annotations for this slide
    if (slide.annotations && Array.isArray(slide.annotations)) {
      for (const shape of slide.annotations) {
        renderShapeToContext(ctx, shape);
      }
    }

    // Add rendered frame to PDF document
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) {
      doc.addPage([WIDTH, HEIGHT], 'landscape');
    }
    doc.addImage(imgData, 'JPEG', 0, 0, WIDTH, HEIGHT, undefined, 'FAST');
  }

  // Sanitize filename and save via file manager / Save As dialog
  const sanitized = title.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'SlideSketch_Whiteboard';
  const pdfBlob = doc.output('blob');
  await downloadPdfBlob(pdfBlob, `${sanitized}.pdf`);
}
