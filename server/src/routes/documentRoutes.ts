import { Router } from 'express';
import {
  uploadDocument,
  createBlankDocument,
  getDocuments,
  getDocumentById,
  serveDocumentFile,
  updateDocument,
  deleteDocument,
} from '../controllers/documentController';
import { uploadPdf } from '../middleware/upload';

const router = Router();

// Upload PDF document
router.post('/', uploadPdf.single('file'), uploadDocument);

// Create a blank 16:9 presentation
router.post('/blank', createBlankDocument);

// List all documents (filtered to 16:9 by default)
router.get('/', getDocuments);

// Get specific document metadata and annotations
router.get('/:id', getDocumentById);

// Stream specific document PDF file
router.get('/:id/file', serveDocumentFile);

// Update document annotations, title, or totalPages
router.put('/:id', updateDocument);

// Delete document
router.delete('/:id', deleteDocument);

export default router;
