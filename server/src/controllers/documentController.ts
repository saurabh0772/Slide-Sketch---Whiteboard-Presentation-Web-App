import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { DocumentModel } from '../models/Document';
import { inspectPdf } from '../services/pdfService';

/**
 * Upload and create a new PDF document
 */
export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No PDF file was uploaded.' });
      return;
    }

    const { originalname, filename, path: filePath, size, mimetype } = req.file;

    // Inspect PDF structure and extract total pages & aspect ratio
    let pageCount = 1;
    let pdfMetaTitle: string | undefined;
    let aspectRatio = 1.7778;
    let is16x9 = true;

    try {
      const pdfMeta = await inspectPdf(filePath);
      pageCount = pdfMeta.pageCount;
      pdfMetaTitle = pdfMeta.title;
      aspectRatio = pdfMeta.aspectRatio;
      is16x9 = pdfMeta.is16x9;
    } catch (err: any) {
      // Clean up uploaded file if corrupted/invalid PDF
      await fs.unlink(filePath).catch(() => {});
      res.status(400).json({
        success: false,
        error: 'The uploaded file is not a valid PDF or is corrupted.',
      });
      return;
    }

    // Determine document title
    const baseName = path.basename(originalname, path.extname(originalname));
    const title = (req.body.title as string)?.trim() || pdfMetaTitle || baseName || 'Untitled Document';

    // Store PDF in MongoDB GridFS for permanent storage across all deploys & restarts
    let gridFsFileId: mongoose.Types.ObjectId | undefined;
    if (mongoose.connection.db) {
      try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'pdfs' });
        const uploadStream = bucket.openUploadStream(filename, {
          contentType: mimetype,
          metadata: {
            originalName: originalname,
            size,
          },
        });
        await new Promise<void>((resolve, reject) => {
          fsSync.createReadStream(filePath)
            .pipe(uploadStream)
            .on('error', reject)
            .on('finish', () => resolve());
        });
        gridFsFileId = uploadStream.id as mongoose.Types.ObjectId;
      } catch (gridFsErr) {
        console.warn('[uploadDocument] Could not store PDF in GridFS, relying on local storage:', gridFsErr);
      }
    }

    // Initialize page entries for each page with unique slide id and original pdfPageNumber
    const initialPages = [];
    for (let i = 1; i <= pageCount; i++) {
      initialPages.push({
        id: `slide-${i}-${Date.now()}`,
        pageNumber: i,
        pdfPageNumber: i,
        isUserAdded: false,
        annotations: [],
      });
    }

    const document = await DocumentModel.create({
      title,
      originalName: originalname,
      fileName: filename,
      filePath,
      fileSize: size,
      mimeType: mimetype,
      totalPages: pageCount,
      aspectRatio,
      is16x9,
      gridFsFileId,
      pages: initialPages,
    });

    res.status(201).json({
      success: true,
      document,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new blank 16:9 presentation
 */
export const createBlankDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const title = (req.body.title as string)?.trim() || 'Untitled Presentation';

    const document = await DocumentModel.create({
      title,
      originalName: `${title}.pdf`,
      fileName: `blank-${Date.now()}.pdf`,
      filePath: '', // Blank document without base PDF file
      fileSize: 0,
      mimeType: 'application/pdf',
      totalPages: 1,
      aspectRatio: 1.7778, // Exact 16:9
      is16x9: true,
      pages: [{ id: `slide-1-${Date.now()}`, pageNumber: 1, pdfPageNumber: null, annotations: [] }],
    });

    res.status(201).json({
      success: true,
      document,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get documents (by default only 16:9 presentations on home page)
 */
export const getDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: any = {};
    // Only show 16:9 presentations on home page unless specifically requested
    if (req.query.all !== 'true') {
      filter.is16x9 = true;
    }

    const documents = await DocumentModel.find(filter)
      .select('title originalName fileName fileSize totalPages aspectRatio is16x9 createdAt updatedAt')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      documents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single document by ID with all pages and annotations
 */
export const getDocumentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const document = await DocumentModel.findById(id);

    if (!document) {
      res.status(404).json({ success: false, error: 'Document not found.' });
      return;
    }

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Stream the raw PDF file for viewing
 */
export const serveDocumentFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const document = await DocumentModel.findById(id);

    if (!document) {
      res.status(404).json({ success: false, error: 'Document not found.' });
      return;
    }

    // Blank documents don't have a physical PDF file
    if (!document.filePath && !document.gridFsFileId && document.fileName?.startsWith('blank-')) {
      res.status(404).json({ success: false, error: 'Blank document without PDF file.' });
      return;
    }

    // 1. Try streaming from MongoDB GridFS (permanent, survives all redeployments & restarts)
    if (document.gridFsFileId && mongoose.connection.db) {
      try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'pdfs' });
        const files = await bucket.find({ _id: document.gridFsFileId }).toArray();
        if (files.length > 0) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(document.originalName)}"`
          );
          const downloadStream = bucket.openDownloadStream(document.gridFsFileId);
          downloadStream.on('error', (streamErr) => {
            console.error('[serveDocumentFile] GridFS stream error:', streamErr);
            if (!res.headersSent) res.status(500).json({ success: false, error: 'Failed to stream PDF from GridFS' });
          });
          downloadStream.pipe(res);
          return;
        }
      } catch (gridFsErr) {
        console.warn('[serveDocumentFile] GridFS lookup failed, falling back to disk:', gridFsErr);
      }
    }

    // Also check GridFS by fileName as secondary GridFS fallback
    if (document.fileName && mongoose.connection.db) {
      try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'pdfs' });
        const filesByName = await bucket.find({ filename: document.fileName }).toArray();
        if (filesByName.length > 0) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(document.originalName)}"`
          );
          const downloadStream = bucket.openDownloadStream(filesByName[0]._id);
          downloadStream.pipe(res);
          return;
        }
      } catch {
        // ignore
      }
    }

    // 2. Fallback: Search candidate locations on local disk
    const candidatePaths = [
      document.filePath ? path.resolve(document.filePath) : null,
      document.fileName ? path.resolve(__dirname, '../../uploads', document.fileName) : null,
      document.fileName ? path.resolve(process.cwd(), 'uploads', document.fileName) : null,
      document.fileName ? path.resolve(process.cwd(), 'server/uploads', document.fileName) : null,
    ].filter(Boolean) as string[];

    let validPath: string | null = null;
    for (const p of candidatePaths) {
      try {
        await fs.access(p);
        validPath = p;
        break;
      } catch {
        // continue search
      }
    }

    if (!validPath) {
      res.status(404).json({ success: false, error: 'PDF file not found on disk or GridFS.' });
      return;
    }

    // If found on disk but not yet in GridFS, backfill to GridFS in background for permanent persistence
    if (!document.gridFsFileId && mongoose.connection.db) {
      (async () => {
        try {
          const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: 'pdfs' });
          const uploadStream = bucket.openUploadStream(document.fileName, {
            contentType: 'application/pdf',
          });
          fsSync.createReadStream(validPath!).pipe(uploadStream).on('finish', async () => {
            await DocumentModel.findByIdAndUpdate(document._id, { gridFsFileId: uploadStream.id });
          });
        } catch {
          // ignore background backfill errors
        }
      })();
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(document.originalName)}"`
    );
    res.sendFile(validPath);
  } catch (error) {
    next(error);
  }
};

/**
 * Update document annotations, title, or totalPages
 */
export const updateDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, pages, totalPages } = req.body;

    const document = await DocumentModel.findById(id);

    if (!document) {
      res.status(404).json({ success: false, error: 'Document not found.' });
      return;
    }

    if (title && typeof title === 'string') {
      document.title = title.trim();
    }

    if (Array.isArray(pages)) {
      document.pages = pages.map((p, idx) => ({
        ...p,
        id: p.id || `slide-${idx + 1}-${Date.now()}`,
        pageNumber: idx + 1,
        pdfPageNumber: p.pdfPageNumber !== undefined ? p.pdfPageNumber : null,
        isUserAdded: Boolean(p.isUserAdded),
      }));
      document.totalPages = pages.length;
    } else if (typeof totalPages === 'number' && totalPages >= 1) {
      document.totalPages = totalPages;
    }

    await document.save();

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a document and its stored file
 */
export const deleteDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const document = await DocumentModel.findById(id);

    if (!document) {
      res.status(404).json({ success: false, error: 'Document not found.' });
      return;
    }

    // Delete from GridFS if present
    if (document.gridFsFileId && mongoose.connection.db) {
      try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'pdfs' });
        await bucket.delete(document.gridFsFileId);
      } catch {
        // Ignore error if GridFS file was already removed
      }
    }

    // Delete local file if exists
    if (document.filePath) {
      try {
        await fs.unlink(document.filePath);
      } catch {
        // Ignore error if file was already removed
      }
    }

    await DocumentModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Document deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
