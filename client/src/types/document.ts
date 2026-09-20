export interface IAnnotation {
  id: string;
  type: 'pencil' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'triangle' | 'graph';
  // Coordinates relative to the logical PDF workspace (1920 base width)
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[]; // [x1, y1, x2, y2, ...] in logical PDF coordinates
  text?: string;
  fontSize?: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  triangleType?: 'regular' | 'right';
  graphType?: 'quadrant' | 'cartesian' | 'grid';
}


export interface ISlidePage {
  id: string;
  pdfPageNumber?: number | null;
  annotations: IAnnotation[];
}

export interface IPageData {
  id?: string;
  pageNumber: number;
  pdfPageNumber?: number | null;
  annotations: IAnnotation[];
}

export interface IDocumentSummary {
  _id: string;
  title: string;
  originalName: string;
  fileName: string;
  fileSize: number;
  totalPages: number;
  aspectRatio?: number;
  is16x9?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IDocument extends IDocumentSummary {
  filePath: string;
  mimeType: string;
  pages: IPageData[];
}
