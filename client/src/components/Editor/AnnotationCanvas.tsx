import React, { useState, useRef, useCallback } from 'react';
import {
  Stage,
  Layer,
  Group,
  Line,
  Arrow,
  Rect,
  Ellipse,
  Text as KonvaText,
} from 'react-konva';
import type Konva from 'konva';
import type { IAnnotation } from '../../types/document';
import type { IPdfRect, ToolType, TriangleMode, GraphMode } from '../../types/canvas';
import { toLogicalCoords, getTrianglePoints, getGraphElements } from '../../utils/coordinates';

interface AnnotationCanvasProps {
  containerWidth: number;
  containerHeight: number;
  pdfRect: IPdfRect;
  tool: ToolType;
  triangleMode?: TriangleMode;
  graphMode?: GraphMode;
  strokeColor: string;
  strokeWidth: number;
  annotations: IAnnotation[];
  selectedId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onChangeAnnotations: (newAnnotations: IAnnotation[], pushHistory?: boolean) => void;
  onDeleteAnnotation?: (id: string) => void;
}

// Helper: square of distance from point to segment
function distToSegmentSquared(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

// Helper: exact Euclidean distance from point (px, py) to any annotation shape
function getDistanceToShape(px: number, py: number, shape: IAnnotation): number {
  if (shape.type === 'pencil' && shape.points && shape.points.length >= 2) {
    const pts = shape.points;
    let minDistSq = Infinity;
    for (let i = 0; i < pts.length - 2; i += 2) {
      const dSq = distToSegmentSquared(px, py, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
      if (dSq < minDistSq) minDistSq = dSq;
    }
    if (pts.length === 2) {
      const dx = px - pts[0];
      const dy = py - pts[1];
      minDistSq = dx * dx + dy * dy;
    }
    return Math.sqrt(minDistSq);
  }

  if ((shape.type === 'line' || shape.type === 'arrow') && shape.points && shape.points.length >= 4) {
    return Math.sqrt(distToSegmentSquared(px, py, shape.points[0], shape.points[1], shape.points[2], shape.points[3]));
  }

  if (shape.type === 'rect') {
    const x = Math.min(shape.x, shape.x + (shape.width || 0));
    const y = Math.min(shape.y, shape.y + (shape.height || 0));
    const w = Math.abs(shape.width || 0);
    const h = Math.abs(shape.height || 0);
    const isFilled = Boolean(shape.fill && shape.fill !== 'transparent' && shape.fill !== 'none');

    if (isFilled) {
      if (px >= x && px <= x + w && py >= y && py <= y + h) {
        return 0;
      }
      const clampedX = Math.max(x, Math.min(px, x + w));
      const clampedY = Math.max(y, Math.min(py, y + h));
      return Math.hypot(px - clampedX, py - clampedY);
    }

    // Unfilled rectangle: distance to the 4 perimeter edges only
    const dTop = distToSegmentSquared(px, py, x, y, x + w, y);
    const dBottom = distToSegmentSquared(px, py, x, y + h, x + w, y + h);
    const dLeft = distToSegmentSquared(px, py, x, y, x, y + h);
    const dRight = distToSegmentSquared(px, py, x + w, y, x + w, y + h);
    return Math.sqrt(Math.min(dTop, dBottom, dLeft, dRight));
  }

  if (shape.type === 'ellipse') {
    const w = Math.abs(shape.width || 0);
    const h = Math.abs(shape.height || 0);
    const rx = w / 2;
    const ry = h / 2;
    const cx = shape.x + rx;
    const cy = shape.y + ry;
    if (rx <= 0 || ry <= 0) {
      return Math.hypot(px - cx, py - cy);
    }
    const isFilled = Boolean(shape.fill && shape.fill !== 'transparent' && shape.fill !== 'none');
    const norm = ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2;

    if (isFilled && norm <= 1) {
      return 0;
    }

    // Distance to ellipse perimeter
    const angle = Math.atan2(py - cy, px - cx);
    const ex = cx + rx * Math.cos(angle);
    const ey = cy + ry * Math.sin(angle);
    return Math.hypot(px - ex, py - ey);
  }

  if (shape.type === 'triangle' && shape.points && shape.points.length >= 6) {
    const [x1, y1, x2, y2, x3, y3] = shape.points;
    const isFilled = Boolean(shape.fill && shape.fill !== 'transparent' && shape.fill !== 'none');

    if (isFilled) {
      const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
      const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
      const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(hasNeg && hasPos)) {
        return 0;
      }
    }

    const dEdge1 = distToSegmentSquared(px, py, x1, y1, x2, y2);
    const dEdge2 = distToSegmentSquared(px, py, x2, y2, x3, y3);
    const dEdge3 = distToSegmentSquared(px, py, x3, y3, x1, y1);
    return Math.sqrt(Math.min(dEdge1, dEdge2, dEdge3));
  }

  if (shape.type === 'graph') {
    const elements = getGraphElements(shape.x, shape.y, Math.abs(shape.width || 0), Math.abs(shape.height || 0), shape.graphType || 'cartesian');
    let minDistSq = Infinity;

    for (const axis of elements.axes) {
      const dSq = distToSegmentSquared(px, py, axis.points[0], axis.points[1], axis.points[2], axis.points[3]);
      if (dSq < minDistSq) minDistSq = dSq;
    }
    for (const tick of elements.ticks) {
      const dSq = distToSegmentSquared(px, py, tick[0], tick[1], tick[2], tick[3]);
      if (dSq < minDistSq) minDistSq = dSq;
    }
    for (const grid of elements.gridLines) {
      const dSq = distToSegmentSquared(px, py, grid[0], grid[1], grid[2], grid[3]);
      if (dSq < minDistSq) minDistSq = dSq;
    }
    return Math.sqrt(minDistSq);
  }

  if (shape.type === 'text') {
    const fontSize = shape.fontSize || 28;
    const textLen = shape.text?.length || 1;
    const approxW = Math.max(30, textLen * fontSize * 0.65);
    const approxH = fontSize * 1.3;
    const clampedX = Math.max(shape.x, Math.min(px, shape.x + approxW));
    const clampedY = Math.max(shape.y, Math.min(py, shape.y + approxH));
    return Math.hypot(px - clampedX, py - clampedY);
  }

  return Infinity;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  containerWidth,
  containerHeight,
  pdfRect,
  tool,
  triangleMode = 'right',
  graphMode = 'cartesian',
  strokeColor,
  strokeWidth,
  annotations,
  onChangeAnnotations,
  onDeleteAnnotation,
}) => {
  const stageRef = useRef<Konva.Stage | null>(null);
  const isDrawingRef = useRef(false);
  const isErasingRef = useRef(false);
  const erasedOnPointerDownRef = useRef(false);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastErasedShapeIdRef = useRef<string | null>(null);
  const currentShapeRef = useRef<IAnnotation | null>(null);

  // Keep a ref to the latest annotations to prevent stale closure bugs during drag/rapid erase
  const annotationsRef = useRef<IAnnotation[]>(annotations);
  annotationsRef.current = annotations;

  // Active shape being drawn in real-time
  const [activeShape, setActiveShape] = useState<IAnnotation | null>(null);

  // Erase a specific shape by ID using the freshest annotations ref
  const handleEraseShape = useCallback(
    (id: string) => {
      if (tool !== 'eraser') return;
      const current = annotationsRef.current;
      const next = current.filter((a) => a.id !== id);
      if (next.length !== current.length) {
        // Immediately update annotationsRef so subsequent event ticks don't see the deleted item
        annotationsRef.current = next;
        if (onDeleteAnnotation) {
          onDeleteAnnotation(id);
        } else {
          onChangeAnnotations(next, true);
        }
      }
    },
    [tool, onDeleteAnnotation, onChangeAnnotations]
  );

  // Get pointer coordinates in PDF logical space
  const getLogicalPointerPos = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return null;
      const pointer = stage.getPointerPosition();
      if (!pointer) return null;
      return toLogicalCoords(pointer.x, pointer.y, pdfRect);
    },
    [pdfRect]
  );

  // Erase ONLY the single closest shape within proximity threshold to guarantee we never erase multiple items at once
  const eraseSingleClosestShape = useCallback(
    (pos: { x: number; y: number }, maxDistance = 14): string | null => {
      if (tool !== 'eraser') return null;
      const current = annotationsRef.current;
      if (current.length === 0) return null;

      let closestShape: IAnnotation | null = null;
      let minDistance = Infinity;

      for (const shape of current) {
        const dist = getDistanceToShape(pos.x, pos.y, shape);
        if (dist < minDistance) {
          minDistance = dist;
          closestShape = shape;
        }
      }

      if (closestShape && minDistance <= maxDistance) {
        handleEraseShape(closestShape.id);
        return closestShape.id;
      }
      return null;
    },
    [tool, handleEraseShape]
  );

  // Handle pointer down (drawing start or eraser start)
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // If eraser tool, handle single-target tap/click erase
    if (tool === 'eraser') {
      isErasingRef.current = true;
      erasedOnPointerDownRef.current = false;
      lastErasedShapeIdRef.current = null;

      const stage = e.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (pointer) {
        pointerDownPosRef.current = { x: pointer.x, y: pointer.y };
      } else {
        pointerDownPosRef.current = null;
      }

      const target = e.target;

      // 1. Direct hit on an annotation shape
      if (target && target !== stage) {
        const shapeId = target.id() || target.getParent()?.id();
        if (shapeId && annotationsRef.current.some((a) => a.id === shapeId)) {
          handleEraseShape(shapeId);
          erasedOnPointerDownRef.current = true;
          lastErasedShapeIdRef.current = shapeId;
          return;
        }
      }

      // 2. Proximity tap on empty canvas: erase ONLY the single closest shape within 14px
      const pos = getLogicalPointerPos(e);
      if (pos) {
        const erasedId = eraseSingleClosestShape(pos, 14);
        if (erasedId) {
          erasedOnPointerDownRef.current = true;
          lastErasedShapeIdRef.current = erasedId;
        }
      }
      return;
    }

    const pos = getLogicalPointerPos(e);
    if (!pos) return;

    // SHAPE TOOLS (pencil, line, arrow, rect, ellipse)
    isDrawingRef.current = true;
    const newId = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    let newShape: IAnnotation;

    if (tool === 'pencil') {
      newShape = {
        id: newId,
        type: 'pencil',
        x: 0,
        y: 0,
        points: [pos.x, pos.y],
        stroke: strokeColor,
        strokeWidth,
      };
    } else if (tool === 'line') {
      newShape = {
        id: newId,
        type: 'line',
        x: 0,
        y: 0,
        points: [pos.x, pos.y, pos.x, pos.y],
        stroke: strokeColor,
        strokeWidth,
      };
    } else if (tool === 'arrow') {
      newShape = {
        id: newId,
        type: 'arrow',
        x: 0,
        y: 0,
        points: [pos.x, pos.y, pos.x, pos.y],
        stroke: strokeColor,
        strokeWidth,
      };
    } else if (tool === 'rect') {
      newShape = {
        id: newId,
        type: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: strokeColor,
        strokeWidth,
      };
    } else if (tool === 'ellipse') {
      newShape = {
        id: newId,
        type: 'ellipse',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: strokeColor,
        strokeWidth,
      };
    } else if (tool === 'triangle') {
      const mouseEvt = e.evt as MouseEvent;
      const activeType: TriangleMode = mouseEvt?.shiftKey
        ? triangleMode === 'right'
          ? 'regular'
          : 'right'
        : triangleMode;

      newShape = {
        id: newId,
        type: 'triangle',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        points: [pos.x, pos.y, pos.x, pos.y, pos.x, pos.y],
        stroke: strokeColor,
        strokeWidth,
        triangleType: activeType,
      };
    } else if (tool === 'graph') {
      newShape = {
        id: newId,
        type: 'graph',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: strokeColor,
        strokeWidth,
        graphType: graphMode,
      };
    } else {
      return;
    }

    currentShapeRef.current = newShape;
    setActiveShape(newShape);
  };

  // Handle pointer move (drawing progress or eraser drag)
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // If eraser tool is dragging over shapes, erase on direct touch or single closest proximity
    if (tool === 'eraser') {
      const mouseEvt = e.evt as MouseEvent;
      const isDragging = isErasingRef.current || (mouseEvt && mouseEvt.buttons === 1);
      if (!isDragging) return;

      const stage = e.target.getStage();
      const pointer = stage?.getPointerPosition();

      // Guard against tap jitter: if a shape was already erased on pointerdown, do NOT erase
      // any other shape until the cursor has moved by at least 10px (intentional drag)
      if (pointerDownPosRef.current && pointer) {
        const dx = pointer.x - pointerDownPosRef.current.x;
        const dy = pointer.y - pointerDownPosRef.current.y;
        const dist = Math.hypot(dx, dy);

        if (erasedOnPointerDownRef.current && dist < 10) {
          return;
        }
      }

      // In active drag mode: erase shapes as the cursor passes over them
      const target = e.target;
      if (target && target !== stage) {
        const shapeId = target.id() || target.getParent()?.id();
        if (shapeId && shapeId !== lastErasedShapeIdRef.current && annotationsRef.current.some((a) => a.id === shapeId)) {
          handleEraseShape(shapeId);
          lastErasedShapeIdRef.current = shapeId;
          return;
        }
      }

      // Proximity check during active drag (tight 8px radius)
      const pos = getLogicalPointerPos(e);
      if (pos) {
        const erasedId = eraseSingleClosestShape(pos, 8);
        if (erasedId) {
          lastErasedShapeIdRef.current = erasedId;
        }
      }
      return;
    }

    if (!isDrawingRef.current || !currentShapeRef.current) return;

    const pos = getLogicalPointerPos(e);
    if (!pos) return;

    const shape = currentShapeRef.current;

    if (shape.type === 'pencil') {
      const nextPoints = [...(shape.points || []), pos.x, pos.y];
      const updated = { ...shape, points: nextPoints };
      currentShapeRef.current = updated;
      setActiveShape(updated);
    } else if (shape.type === 'line' || shape.type === 'arrow') {
      const startX = shape.points ? shape.points[0] : pos.x;
      const startY = shape.points ? shape.points[1] : pos.y;
      const updated = { ...shape, points: [startX, startY, pos.x, pos.y] };
      currentShapeRef.current = updated;
      setActiveShape(updated);
    } else if (shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'graph') {
      const width = pos.x - shape.x;
      const height = pos.y - shape.y;
      const updated = { ...shape, width, height };
      currentShapeRef.current = updated;
      setActiveShape(updated);
    } else if (shape.type === 'triangle') {
      const mouseEvt = e.evt as MouseEvent;
      const width = pos.x - shape.x;
      const height = pos.y - shape.y;
      const activeType: TriangleMode = mouseEvt?.shiftKey
        ? shape.triangleType === 'right'
          ? 'regular'
          : 'right'
        : shape.triangleType || 'regular';
      const pts = getTrianglePoints(shape.x, shape.y, width, height, activeType);
      const updated = {
        ...shape,
        width,
        height,
        points: pts,
        triangleType: activeType,
      };
      currentShapeRef.current = updated;
      setActiveShape(updated);
    }
  };

  // Handle pointer up (drawing finalize or eraser stop)
  const handleMouseUp = () => {
    isErasingRef.current = false;
    erasedOnPointerDownRef.current = false;
    pointerDownPosRef.current = null;
    lastErasedShapeIdRef.current = null;

    if (!isDrawingRef.current || !currentShapeRef.current) return;
    isDrawingRef.current = false;

    let finalShape = { ...currentShapeRef.current };
    currentShapeRef.current = null;
    setActiveShape(null);

    // Normalize rect, ellipse, or graph if dragged with negative width/height
    if (finalShape.type === 'rect' || finalShape.type === 'ellipse' || finalShape.type === 'graph') {
      let x = finalShape.x;
      let y = finalShape.y;
      let w = finalShape.width || 0;
      let h = finalShape.height || 0;

      if (w < 0) {
        x += w;
        w = Math.abs(w);
      }
      if (h < 0) {
        y += h;
        h = Math.abs(h);
      }

      // Ignore accidental tiny clicks
      if (w < 4 && h < 4) {
        return;
      }

      finalShape = { ...finalShape, x, y, width: w, height: h };
    }

    // Normalize triangle bounds and recalculate vertex points
    if (finalShape.type === 'triangle') {
      let x = finalShape.x;
      let y = finalShape.y;
      let w = finalShape.width || 0;
      let h = finalShape.height || 0;

      if (w < 0) {
        x += w;
        w = Math.abs(w);
      }
      if (h < 0) {
        y += h;
        h = Math.abs(h);
      }

      if (w < 4 && h < 4) {
        return;
      }

      const pts = getTrianglePoints(x, y, w, h, finalShape.triangleType || 'regular');
      finalShape = {
        ...finalShape,
        x,
        y,
        width: w,
        height: h,
        points: pts,
      };
    }

    if (finalShape.type === 'pencil' && (!finalShape.points || finalShape.points.length < 4)) {
      return;
    }

    if ((finalShape.type === 'line' || finalShape.type === 'arrow') && finalShape.points) {
      const [x1, y1, x2, y2] = finalShape.points;
      const dist = Math.hypot(x2 - x1, y2 - y1);
      if (dist < 4) return;
    }

    // Append new shape to document state and record undo history
    const nextAnnotations = [...annotationsRef.current, finalShape];
    annotationsRef.current = nextAnnotations;
    onChangeAnnotations(nextAnnotations, true);
  };

  const hitTolerance = 8;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: containerWidth,
        height: containerHeight,
        cursor: tool === 'eraser' ? 'pointer' : 'crosshair',
      }}
    >
      <Stage
        ref={stageRef}
        width={containerWidth}
        height={containerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <Layer>
          {/* Group is placed and scaled exactly to match the displayed slide */}
          <Group
            x={pdfRect.x}
            y={pdfRect.y}
            scaleX={pdfRect.scale}
            scaleY={pdfRect.scale}
          >
            {/* Render all stored page annotations */}
            {annotations.map((shape) => {
              const effectiveHitWidth = Math.max((shape.strokeWidth || 2) + hitTolerance, 14);

              if (shape.type === 'pencil') {
                return (
                  <Line
                    key={shape.id}
                    id={shape.id}
                    points={shape.points}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth}
                    hitStrokeWidth={effectiveHitWidth}
                    tension={0.4}
                    lineCap="round"
                    lineJoin="round"
                  />
                );
              }

              if (shape.type === 'line') {
                return (
                  <Line
                    key={shape.id}
                    id={shape.id}
                    points={shape.points}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth}
                    hitStrokeWidth={effectiveHitWidth}
                    lineCap="round"
                    lineJoin="round"
                  />
                );
              }

              if (shape.type === 'arrow') {
                return (
                  <Arrow
                    key={shape.id}
                    id={shape.id}
                    points={shape.points}
                    pointerLength={14}
                    pointerWidth={14}
                    fill={shape.stroke}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth}
                    hitStrokeWidth={effectiveHitWidth}
                    lineCap="round"
                    lineJoin="round"
                  />
                );
              }

              if (shape.type === 'rect') {
                return (
                  <Rect
                    key={shape.id}
                    id={shape.id}
                    x={shape.x}
                    y={shape.y}
                    width={shape.width || 0}
                    height={shape.height || 0}
                    fill={shape.fill || undefined}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth}
                    hitStrokeWidth={effectiveHitWidth}
                    cornerRadius={4}
                  />
                );
              }

              if (shape.type === 'ellipse') {
                const w = Math.abs(shape.width || 0);
                const h = Math.abs(shape.height || 0);
                return (
                  <Ellipse
                    key={shape.id}
                    id={shape.id}
                    x={shape.x + w / 2}
                    y={shape.y + h / 2}
                    radiusX={w / 2}
                    radiusY={h / 2}
                    fill={shape.fill || undefined}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth}
                    hitStrokeWidth={effectiveHitWidth}
                  />
                );
              }

              if (shape.type === 'triangle' && shape.points && shape.points.length >= 6) {
                return (
                  <Line
                    key={shape.id}
                    id={shape.id}
                    points={shape.points}
                    closed={true}
                    fill={shape.fill || undefined}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth}
                    hitStrokeWidth={effectiveHitWidth}
                    lineCap="round"
                    lineJoin="round"
                  />
                );
              }

              if (shape.type === 'text') {
                return (
                  <KonvaText
                    key={shape.id}
                    id={shape.id}
                    x={shape.x}
                    y={shape.y}
                    text={shape.text}
                    fontSize={shape.fontSize || 28}
                    fontFamily="Inter, system-ui, -apple-system, sans-serif"
                    fill={shape.stroke}
                  />
                );
              }

              if (shape.type === 'graph') {
                const w = Math.abs(shape.width || 0);
                const h = Math.abs(shape.height || 0);
                const elements = getGraphElements(shape.x, shape.y, w, h, shape.graphType || 'cartesian');

                return (
                  <Group key={shape.id} id={shape.id}>
                    {/* Coordinate grid lines if in grid mode */}
                    {elements.gridLines.map((pts, idx) => (
                      <Line
                        key={`grid-${shape.id}-${idx}`}
                        points={pts}
                        stroke={shape.stroke}
                        strokeWidth={1}
                        hitStrokeWidth={effectiveHitWidth}
                        opacity={0.3}
                        dash={[4, 4]}
                      />
                    ))}

                    {/* Tick marks on axes */}
                    {elements.ticks.map((pts, idx) => (
                      <Line
                        key={`tick-${shape.id}-${idx}`}
                        points={pts}
                        stroke={shape.stroke}
                        strokeWidth={Math.max(1.5, shape.strokeWidth * 0.8)}
                        hitStrokeWidth={effectiveHitWidth}
                        lineCap="round"
                      />
                    ))}

                    {/* Primary axes with arrowheads */}
                    {elements.axes.map((axis, idx) => (
                      <Arrow
                        key={`axis-${shape.id}-${idx}`}
                        points={axis.points}
                        pointerLength={12}
                        pointerWidth={12}
                        fill={shape.stroke}
                        stroke={shape.stroke}
                        strokeWidth={shape.strokeWidth}
                        hitStrokeWidth={effectiveHitWidth}
                        lineCap="round"
                        lineJoin="round"
                      />
                    ))}
                  </Group>
                );
              }

              return null;
            })}

            {/* Active drawing shape preview */}
            {activeShape && (
              <>
                {activeShape.type === 'pencil' && (
                  <Line
                    points={activeShape.points}
                    stroke={activeShape.stroke}
                    strokeWidth={activeShape.strokeWidth}
                    tension={0.4}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
                {activeShape.type === 'line' && (
                  <Line
                    points={activeShape.points}
                    stroke={activeShape.stroke}
                    strokeWidth={activeShape.strokeWidth}
                    lineCap="round"
                  />
                )}
                {activeShape.type === 'arrow' && (
                  <Arrow
                    points={activeShape.points}
                    pointerLength={14}
                    pointerWidth={14}
                    fill={activeShape.stroke}
                    stroke={activeShape.stroke}
                    strokeWidth={activeShape.strokeWidth}
                    lineCap="round"
                  />
                )}
                {activeShape.type === 'rect' && (
                  <Rect
                    x={activeShape.x}
                    y={activeShape.y}
                    width={activeShape.width || 0}
                    height={activeShape.height || 0}
                    stroke={activeShape.stroke}
                    strokeWidth={activeShape.strokeWidth}
                    cornerRadius={4}
                  />
                )}
                {activeShape.type === 'ellipse' && (
                  <Ellipse
                    x={activeShape.x + Math.abs(activeShape.width || 0) / 2}
                    y={activeShape.y + Math.abs(activeShape.height || 0) / 2}
                    radiusX={Math.abs(activeShape.width || 0) / 2}
                    radiusY={Math.abs(activeShape.height || 0) / 2}
                    stroke={activeShape.stroke}
                    strokeWidth={activeShape.strokeWidth}
                  />
                )}
                {activeShape.type === 'triangle' && activeShape.points && (
                  <Line
                    points={activeShape.points}
                    closed={true}
                    stroke={activeShape.stroke}
                    strokeWidth={activeShape.strokeWidth}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
                {activeShape.type === 'graph' && (() => {
                  const gw = Math.abs(activeShape.width || 0);
                  const gh = Math.abs(activeShape.height || 0);
                  const gx = (activeShape.width || 0) < 0 ? activeShape.x + (activeShape.width || 0) : activeShape.x;
                  const gy = (activeShape.height || 0) < 0 ? activeShape.y + (activeShape.height || 0) : activeShape.y;
                  if (gw < 4 || gh < 4) return null;
                  const previewElements = getGraphElements(gx, gy, gw, gh, activeShape.graphType || 'cartesian');
                  return (
                    <Group>
                      <Rect
                        x={gx}
                        y={gy}
                        width={gw}
                        height={gh}
                        stroke={activeShape.stroke}
                        strokeWidth={1}
                        dash={[4, 4]}
                        opacity={0.35}
                      />
                      {previewElements.gridLines.map((pts, idx) => (
                        <Line
                          key={`prev-grid-${idx}`}
                          points={pts}
                          stroke={activeShape.stroke}
                          strokeWidth={1}
                          opacity={0.3}
                          dash={[4, 4]}
                        />
                      ))}
                      {previewElements.ticks.map((pts, idx) => (
                        <Line
                          key={`prev-tick-${idx}`}
                          points={pts}
                          stroke={activeShape.stroke}
                          strokeWidth={Math.max(1.5, activeShape.strokeWidth * 0.8)}
                          lineCap="round"
                        />
                      ))}
                      {previewElements.axes.map((axis, idx) => (
                        <Arrow
                          key={`prev-axis-${idx}`}
                          points={axis.points}
                          pointerLength={12}
                          pointerWidth={12}
                          fill={activeShape.stroke}
                          stroke={activeShape.stroke}
                          strokeWidth={activeShape.strokeWidth}
                          lineCap="round"
                          lineJoin="round"
                        />
                      ))}
                    </Group>
                  );
                })()}
              </>
            )}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
};
