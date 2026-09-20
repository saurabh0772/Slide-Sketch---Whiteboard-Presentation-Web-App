import fs from 'fs/promises';
import { PDFDocument } from 'pdf-lib';

export interface IPdfMetadata {
  pageCount: number;
  title?: string;
  width: number;
  height: number;
  aspectRatio: number;
  is16x9: boolean;
}

export const inspectPdf = async (filePath: string): Promise<IPdfMetadata> => {
  const fileBuffer = await fs.readFile(filePath);
  const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  const title = pdfDoc.getTitle() || undefined;

  let width = 1920;
  let height = 1080;

  if (pageCount > 0) {
    const firstPage = pdfDoc.getPage(0);
    const size = firstPage.getSize();
    width = size.width;
    height = size.height;
  }

  const aspectRatio = height > 0 ? Number((width / height).toFixed(4)) : 1.7778;
  // 16:9 is 1.7778. Allow widescreen ratios between 1.60 and 1.95 (covers standard 16:9, 16:10 slides)
  const is16x9 = aspectRatio >= 1.60 && aspectRatio <= 1.95;

  return {
    pageCount,
    title,
    width,
    height,
    aspectRatio,
    is16x9,
  };
};
