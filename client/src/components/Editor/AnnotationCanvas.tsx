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

// Helper: check if a logical coordinate (px, py) is within radius of a shape
function isPointNearShape(px: number, py: number, shape: IAnnotation, radius = 28): boolean {
  const r2 = radius * radius;

  if (shape.type === 'pencil' && shape.points && shape.points.length >= 2) {
    const pts = shape.points;
    for (let i = 0; i < pts.length - 2; i += 2) {
      if (distToSegmentSquared(px, py, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]) <= r2) {
        return true;
      }
    }
    // Also check last single point if tiny
    const lastIdx = pts.length - 2;
    const dx = px - pts[lastIdx];
    const dy = py - pts[lastIdx + 1];
    if (dx * dx + dy * dy <= r2) return true;
    return false;
  }

  if ((shape.type === 'line' || shape.type === 'arrow') && shape.points && shape.points.length >= 4) {
    const [x1, y1, x2, y2] = shape.points;
    return distToSegmentSquared(px, py, x1, y1, x2, y2) <= r2;
  }

  if (shape.type === 'rect') {
    const x = Math.min(shape.x, shape.x + (shape.width || 0));
    const y = Math.min(shape.y, shape.y + (shape.height || 0));
    const w = Math.abs(shape.width || 0);
    const h = Math.abs(shape.height || 0);

    // Hit if cursor is inside or near the bounding border
    if (
      px >= x - radius &&
      px <= x + w + radius &&
      py >= y - radius &&
      py <= y + h + radius
    ) {
      return true;
    }
    return false;
  }

  if (shape.type === 'ellipse') {
    const w = Math.abs(shape.width || 0);
    const h = Math.abs(shape.height || 0);
    const cx = shape.x + w / 2;
    const cy = shape.y + h / 2;
    const rx = w / 2 + radius;
    const ry = h / 2 + radius;
    if (rx > 0 && ry > 0) {
      const norm = ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2;
      if (norm <= 1) return true;
    }
    return false;
  }

  if (shape.type === 'triangle' && shape.points && shape.points.length >= 6) {
    const [x1, y1, x2, y2, x3, y3] = shape.points;
    if (
      distToSegmentSquared(px, py, x1, y1, x2, y2) <= r2 ||
      distToSegmentSquared(px, py, x2, y2, x3, y3) <= r2 ||
      distToSegmentSquared(px, py, x3, y3, x1, y1) <= r2
    ) {
      return true;
    }
    // Check if point is inside triangle
    const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
    const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    if (!(hasNeg && hasPos)) {
      return true;
    }
    return false;
  }

  if (shape.type === 'text') {
    const approxW = 200;
    const approxH = (shape.fontSize || 28) * 1.5;
    return (
      px >= shape.x - radius &&
      px <= shape.x + approxW + radius &&
      py >= shape.y - radius &&
      py <= shape.y + approxH + radius
    );
  }

  if (shape.type === 'graph') {
    const x = Math.min(shape.x, shape.x + (shape.width || 0));
    const y = Math.min(shape.y, shape.y + (shape.height || 0));
    const w = Math.abs(shape.width || 0);
    const h = Math.abs(shape.height || 0);
    return (
      px >= x - radius &&
      px <= x + w + radius &&
      py >= y - radius &&
      py <= y + h + radius
    );
  }

  return false;
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
      if (onDeleteAnnotation) {
        onDeleteAnnotation(id);
      } else {
        const next = annotationsRef.current.filter((a) => a.id !== id);
        if (next.length !== annotationsRef.current.length) {
          annotationsRef.current = next;
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

  // Proximity eraser: check if pointer intersects any shape in annotationsRef
  const eraseShapesAtPos = useCallback(
    (pos: { x: number; y: number }) => {
      if (tool !== 'eraser') return;
      const currentAnnots = annotationsRef.current;
      const remaining = currentAnnots.filter((shape) => !isPointNearShape(pos.x, pos.y, shape, 30));
      if (remaining.length !== currentAnnots.length) {
        annotationsRef.current = remaining;
        onChangeAnnotations(remaining, true);
      }
    },
    [tool, onChangeAnnotations]
  );

  // Handle pointer down (drawing start or eraser start)
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // If eraser tool, check direct target and proximity
    if (tool === 'eraser') {
      isErasingRef.current = true;
      const target = e.target;
      if (target && target !== target.getStage()) {
        const shapeId = target.id() || target.getParent()?.id();
        if (shapeId) {
          handleEraseShape(shapeId);
        }
      }
      const pos = getLogicalPointerPos(e);
      if (pos) {
        eraseShapesAtPos(pos);
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
    // If eraser tool is dragging over shapes, erase on touch or proximity
    if (tool === 'eraser') {
      const mouseEvt = e.evt as MouseEvent;
      if (isErasingRef.current || (mouseEvt && mouseEvt.buttons === 1)) {
        const target = e.target;
        if (target && target !== target.getStage()) {
          const shapeId = target.id() || target.getParent()?.id();
          if (shapeId) {
            handleEraseShape(shapeId);
          }
        }
        const pos = getLogicalPointerPos(e);
        if (pos) {
          eraseShapesAtPos(pos);
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

  const hitTolerance = 32;

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
            {/* Render all stored page annotations with generous hit area for effortless erasing */}
            {annotations.map((shape) => {
              const effectiveHitWidth = Math.max((shape.strokeWidth || 2) + hitTolerance, 32);

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
                    onClick={() => handleEraseShape(shape.id)}
                    onTap={() => handleEraseShape(shape.id)}
                    onPointerDown={() => handleEraseShape(shape.id)}
                    onMouseEnter={(e) => {
                      if (tool === 'eraser' && (e.evt as MouseEvent).buttons === 1) {
                        handleEraseShape(shape.id);
                      }
                    }}
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
                    onClick={() => handleEraseShape(shape.id)}
                    onTap={() => handleEraseShape(shape.id)}
                    onPointerDown={() => handleEraseShape(shape.id)}
                    onMouseEnter={(e) => {
                      if (tool === 'eraser' && (e.evt as MouseEvent).buttons === 1) {
                        handleEraseShape(shape.id);
                      }
                    }}
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
                    onClick={() => handleEraseShape(shape.id)}
                    onTap={() => handleEraseShape(shape.id)}
                    onPointerDown={() => handleEraseShape(shape.id)}
                    onMouseEnter={(e) => {
                      if (tool === 'eraser' && (e.evt as MouseEvent).buttons === 1) {
                        handleEraseShape(shape.id);
                      }
                    }}
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
                    fill={shape.fill || 'transparent'}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth}
                    hitStrokeWidth={effectiveHitWidth}
                    cornerRadius={4}
                    onClick={() => handleEraseShape(shape.id)}
                    onTap={() => handleEraseShape(shape.id)}
                    onPointerDown={() => handleEraseShape(shape.id)}
                    onMouseEnter={(e) => {
                      if (tool === 'eraser' && (e.evt as MouseEvent).buttons === 1) {
                        handleEraseShape(shape.id);
                      }
                    }}
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
                    fill={shape.fill || 'transparent'}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth}
                    hitStrokeWidth={effectiveHitWidth}
                    onClick={() => handleEraseShape(shape.id)}
                    onTap={() => handleEraseShape(shape.id)}
                    onPointerDown={() => handleEraseShape(shape.id)}
                    onMouseEnter={(e) => {
                      if (tool === 'eraser' && (e.evt as MouseEvent).buttons === 1) {
                        handleEraseShape(shape.id);
                      }
                    }}
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
                    fill={shape.fill || 'transparent'}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth}
                    hitStrokeWidth={effectiveHitWidth}
                    lineCap="round"
                    lineJoin="round"
                    onClick={() => handleEraseShape(shape.id)}
                    onTap={() => handleEraseShape(shape.id)}
                    onPointerDown={() => handleEraseShape(shape.id)}
                    onMouseEnter={(e) => {
                      if (tool === 'eraser' && (e.evt as MouseEvent).buttons === 1) {
                        handleEraseShape(shape.id);
                      }
                    }}
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
                    onClick={() => handleEraseShape(shape.id)}
                    onTap={() => handleEraseShape(shape.id)}
                    onPointerDown={() => handleEraseShape(shape.id)}
                  />
                );
              }

              if (shape.type === 'graph') {
                const w = Math.abs(shape.width || 0);
                const h = Math.abs(shape.height || 0);
                const elements = getGraphElements(shape.x, shape.y, w, h, shape.graphType || 'cartesian');

                return (
                  <Group
                    key={shape.id}
                    id={shape.id}
                    onClick={() => handleEraseShape(shape.id)}
                    onTap={() => handleEraseShape(shape.id)}
                    onPointerDown={() => handleEraseShape(shape.id)}
                    onMouseEnter={(e) => {
                      if (tool === 'eraser' && (e.evt as MouseEvent).buttons === 1) {
                        handleEraseShape(shape.id);
                      }
                    }}
                  >
                    {/* Transparent hit area spanning the graph bounding box */}
                    <Rect
                      x={shape.x}
                      y={shape.y}
                      width={w}
                      height={h}
                      fill="transparent"
                      hitStrokeWidth={effectiveHitWidth}
                    />

                    {/* Coordinate grid lines if in grid mode */}
                    {elements.gridLines.map((pts, idx) => (
                      <Line
                        key={`grid-${shape.id}-${idx}`}
                        points={pts}
                        stroke={shape.stroke}
                        strokeWidth={1}
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
