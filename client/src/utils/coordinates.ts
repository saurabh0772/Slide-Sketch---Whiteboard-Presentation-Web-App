import type { IPdfRect } from '../types/canvas';

export const LOGICAL_PDF_BASE_WIDTH = 1920;

/**
 * Calculates the exact contain rectangle of a PDF page within a 16:9 container,
 * and sets up the logical coordinate system for annotations.
 */
export const calculatePdfRect = (
  containerWidth: number,
  containerHeight: number,
  pageWidth: number,
  pageHeight: number
): IPdfRect => {
  if (containerWidth <= 0 || containerHeight <= 0 || pageWidth <= 0 || pageHeight <= 0) {
    return {
      x: 0,
      y: 0,
      width: containerWidth,
      height: containerHeight,
      logicalWidth: LOGICAL_PDF_BASE_WIDTH,
      logicalHeight: 1080,
      scale: 1,
    };
  }

  const containerRatio = containerWidth / containerHeight;
  const pageRatio = pageWidth / pageHeight;

  let displayWidth: number;
  let displayHeight: number;
  let displayX: number;
  let displayY: number;

  if (pageRatio >= containerRatio) {
    // PDF is wider than or matches 16:9 container -> fit to container width, letterbox top/bottom
    displayWidth = containerWidth;
    displayHeight = containerWidth / pageRatio;
    displayX = 0;
    displayY = (containerHeight - displayHeight) / 2;
  } else {
    // PDF is taller than 16:9 container (e.g. 4:3 or portrait) -> fit to container height, pillarbox left/right
    displayHeight = containerHeight;
    displayWidth = containerHeight * pageRatio;
    displayX = (containerWidth - displayWidth) / 2;
    displayY = 0;
  }

  const logicalWidth = LOGICAL_PDF_BASE_WIDTH;
  const logicalHeight = LOGICAL_PDF_BASE_WIDTH / pageRatio;
  const scale = displayWidth / logicalWidth;

  return {
    x: displayX,
    y: displayY,
    width: displayWidth,
    height: displayHeight,
    logicalWidth,
    logicalHeight,
    scale,
  };
};

/**
 * Converts display coordinates (relative to 16:9 container) to logical PDF coordinates.
 */
export const toLogicalCoords = (
  displayX: number,
  displayY: number,
  pdfRect: IPdfRect
): { x: number; y: number } => {
  if (!pdfRect.scale) return { x: 0, y: 0 };
  return {
    x: (displayX - pdfRect.x) / pdfRect.scale,
    y: (displayY - pdfRect.y) / pdfRect.scale,
  };
};

/**
 * Converts logical PDF coordinates to display coordinates (relative to 16:9 container).
 */
export const toDisplayCoords = (
  logicalX: number,
  logicalY: number,
  pdfRect: IPdfRect
): { x: number; y: number } => {
  return {
    x: pdfRect.x + logicalX * pdfRect.scale,
    y: pdfRect.y + logicalY * pdfRect.scale,
  };
};

/**
 * Computes 3 vertex points [x1, y1, x2, y2, x3, y3] for a triangle.
 * Supports:
 * - 'regular': Isosceles triangle with apex at top center.
 * - 'right': Right-angle triangle with 90° corner at (x, y + height).
 */
export const getTrianglePoints = (
  x: number,
  y: number,
  width: number,
  height: number,
  triangleType: 'regular' | 'right' = 'right'
): number[] => {
  if (triangleType === 'right') {
    return [
      x, y,
      x, y + height,
      x + width, y + height,
    ];
  }
  return [
    x + width / 2, y,
    x, y + height,
    x + width, y + height,
  ];
};

export interface IGraphElements {
  axes: { points: number[]; pointerAtEnd?: boolean }[];
  ticks: number[][]; // array of [x1, y1, x2, y2]
  gridLines: number[][]; // array of [x1, y1, x2, y2]
}

/**
 * Computes coordinate axes, tick marks, and optional grid lines for a 2D graph.
 * Supports:
 * - 'quadrant': 1st quadrant L-shaped X-Y axes with arrow heads and ticks.
 * - 'cartesian': 4-quadrant cross with center origin and ticks on all 4 arms.
 * - 'grid': 1st quadrant axes with subtle background coordinate grid mesh.
 */
export const getGraphElements = (
  x: number,
  y: number,
  width: number,
  height: number,
  graphType: 'quadrant' | 'cartesian' | 'grid' = 'cartesian'
): IGraphElements => {
  const axes: { points: number[]; pointerAtEnd?: boolean }[] = [];
  const ticks: number[][] = [];
  const gridLines: number[][] = [];

  const tickSize = Math.max(4, Math.min(8, Math.min(width, height) * 0.03));

  if (graphType === 'cartesian') {
    const cx = x + width / 2;
    const cy = y + height / 2;

    // X-Axis (both right and left pointing arrows)
    axes.push(
      { points: [cx, cy, x + width, cy], pointerAtEnd: true },
      { points: [cx, cy, x, cy], pointerAtEnd: true }
    );
    // Y-Axis (both up and down pointing arrows)
    axes.push(
      { points: [cx, cy, cx, y], pointerAtEnd: true },
      { points: [cx, cy, cx, y + height], pointerAtEnd: true }
    );

    // Divisions on each half
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const numTicksX = Math.max(2, Math.min(6, Math.round(halfWidth / 55)));
    const numTicksY = Math.max(2, Math.min(6, Math.round(halfHeight / 55)));

    // X-axis ticks (positive & negative)
    for (let i = 1; i <= numTicksX; i++) {
      const stepX = (i * halfWidth) / (numTicksX + 0.4);
      ticks.push([cx + stepX, cy - tickSize, cx + stepX, cy + tickSize]);
      ticks.push([cx - stepX, cy - tickSize, cx - stepX, cy + tickSize]);
    }

    // Y-axis ticks (positive & negative)
    for (let j = 1; j <= numTicksY; j++) {
      const stepY = (j * halfHeight) / (numTicksY + 0.4);
      ticks.push([cx - tickSize, cy - stepY, cx + tickSize, cy - stepY]);
      ticks.push([cx - tickSize, cy + stepY, cx + tickSize, cy + stepY]);
    }
  } else {
    // Quadrant I or Grid: Origin is at bottom-left (x, y + height)
    const ox = x;
    const oy = y + height;

    // X-Axis (points right)
    axes.push({ points: [ox, oy, ox + width, oy], pointerAtEnd: true });
    // Y-Axis (points up)
    axes.push({ points: [ox, oy, ox, y], pointerAtEnd: true });

    const numTicksX = Math.max(3, Math.min(8, Math.round(width / 60)));
    const numTicksY = Math.max(3, Math.min(8, Math.round(height / 60)));

    // X-axis ticks & grid
    for (let i = 1; i <= numTicksX; i++) {
      const tx = ox + (i * width) / (numTicksX + 0.4);
      ticks.push([tx, oy - tickSize, tx, oy + tickSize]);
      if (graphType === 'grid') {
        gridLines.push([tx, y, tx, oy]);
      }
    }

    // Y-axis ticks & grid
    for (let j = 1; j <= numTicksY; j++) {
      const ty = oy - (j * height) / (numTicksY + 0.4);
      ticks.push([ox - tickSize, ty, ox + tickSize, ty]);
      if (graphType === 'grid') {
        gridLines.push([ox, ty, ox + width, ty]);
      }
    }
  }

  return { axes, ticks, gridLines };
};

