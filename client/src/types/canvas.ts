import type { IAnnotation } from './document';

export type ToolType =
  | 'pencil'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'triangle'
  | 'graph'
  | 'eraser';

export type TriangleMode = 'regular' | 'right';
export type GraphMode = 'quadrant' | 'cartesian' | 'grid';

export interface IPdfRect {
  // Display pixel coordinates inside the 16:9 container
  x: number;
  y: number;
  width: number;
  height: number;
  // Logical base dimensions of the PDF page
  logicalWidth: number;
  logicalHeight: number;
  // Scale factor: displayWidth / logicalWidth
  scale: number;
}

export interface IPageHistory {
  past: IAnnotation[][];
  future: IAnnotation[][];
}
