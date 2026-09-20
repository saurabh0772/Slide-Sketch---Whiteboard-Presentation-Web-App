import mongoose, { Document as MongooseDocument, Schema } from 'mongoose';

export interface IAnnotation {
  id: string;
  type: 'pencil' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'triangle' | 'graph';
  // PDF-relative or logical coordinates
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[];
  text?: string;
  fontSize?: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  triangleType?: 'regular' | 'right';
  graphType?: 'quadrant' | 'cartesian' | 'grid';
}

export interface IPageData {
  id?: string;
  pageNumber: number;
  pdfPageNumber?: number | null;
  isUserAdded?: boolean;
  annotations: IAnnotation[];
}

export interface IDocument extends MongooseDocument {
  title: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  totalPages: number;
  aspectRatio: number;
  is16x9: boolean;
  gridFsFileId?: mongoose.Types.ObjectId;
  pages: IPageData[];
  createdAt: Date;
  updatedAt: Date;
}

const AnnotationSchema = new Schema<IAnnotation>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['pencil', 'line', 'arrow', 'rect', 'ellipse', 'text', 'triangle', 'graph'],
      required: true,
    },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    points: [{ type: Number }],
    text: { type: String },
    fontSize: { type: Number },
    stroke: { type: String, default: '#000000' },
    strokeWidth: { type: Number, default: 2 },
    fill: { type: String },
    triangleType: { type: String, enum: ['regular', 'right'] },
    graphType: { type: String, enum: ['quadrant', 'cartesian', 'grid'], default: 'cartesian' },
  },
  { _id: false }
);

const PageDataSchema = new Schema<IPageData>(
  {
    id: { type: String },
    pageNumber: { type: Number, required: true },
    pdfPageNumber: { type: Number, default: null },
    isUserAdded: { type: Boolean, default: false },
    annotations: [AnnotationSchema],
  },
  { _id: false }
);

const DocumentSchema = new Schema<IDocument>(
  {
    title: { type: String, required: true, trim: true },
    originalName: { type: String, required: true },
    fileName: { type: String, required: true, unique: true },
    filePath: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, required: true, default: 'application/pdf' },
    totalPages: { type: Number, required: true, default: 1 },
    aspectRatio: { type: Number, default: 1.7778 },
    is16x9: { type: Boolean, default: true, index: true },
    gridFsFileId: { type: Schema.Types.ObjectId, default: null },
    pages: [PageDataSchema],
  },
  {
    timestamps: true,
  }
);

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
