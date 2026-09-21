import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Search,
  ArrowUpRight,
  AlertCircle,
  X,
  Presentation,
  Tv,
  MoreVertical,
  Download,
  User,
  LogOut,
} from 'lucide-react';
import type { IDocumentSummary } from '../types/document';
import {
  fetchDocuments,
  fetchDocumentById,
  uploadPdfDocument,
  createBlankDocument,
  deleteDocument,
  getPdfFileUrl,
} from '../services/api';
import { exportPresentationToPdf } from '../utils/pdfExport';
import { DashboardThumbnail } from '../components/Dashboard/DashboardThumbnail';

interface DashboardProps {
  onOpenDocument: (documentId: string) => void;
  currentUser?: { username: string } | null;
  onLogout?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenDocument,
  currentUser,
  onLogout,
}) => {
  const [documents, setDocuments] = useState<IDocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCreatingBlank, setIsCreatingBlank] = useState(false);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // New Whiteboard modal state
  const [isNewWhiteboardModalOpen, setIsNewWhiteboardModalOpen] = useState(false);
  const [whiteboardTitle, setWhiteboardTitle] = useState('Untitled Whiteboard');
  const whiteboardInputRef = useRef<HTMLInputElement | null>(null);

  // In-app Delete modal state
  const [docToDelete, setDocToDelete] = useState<IDocumentSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Card triple-dot menu state & PDF download state
  const [activeMenuDocId, setActiveMenuDocId] = useState<string | null>(null);
  const [exportingDocId, setExportingDocId] = useState<string | null>(null);

  const loadDocs = async () => {
    try {
      setLoading(true);
      const docs = await fetchDocuments();
      // Ensure only 16:9 presentations are shown on the home page
      const widescreenOnly = docs.filter((d) => {
        if (d.is16x9 === false) return false;
        if (d.aspectRatio && (d.aspectRatio < 1.60 || d.aspectRatio > 1.95)) {
          return false;
        }
        return true;
      });
      setDocuments(widescreenOnly);
    } catch (err: any) {
      console.error('[Dashboard] Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  // Close card action menu when clicking anywhere else
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveMenuDocId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  // Download PDF directly from dashboard card
  const handleDownloadPdfFromDashboard = async (docSummary: IDocumentSummary) => {
    try {
      setExportingDocId(docSummary._id);
      setActiveMenuDocId(null);
      const fullDoc = await fetchDocumentById(docSummary._id);

      const hasPdf = Boolean(fullDoc.gridFsFileId || fullDoc.filePath || (!fullDoc.fileName?.startsWith('blank-') && fullDoc.mimeType === 'application/pdf'));
      await exportPresentationToPdf({
        title: fullDoc.title || docSummary.title,
        slides:
          fullDoc.pages && fullDoc.pages.length > 0
            ? fullDoc.pages
            : [{ pdfPageNumber: 1, annotations: [] }],
        pdfUrl: hasPdf ? getPdfFileUrl(fullDoc._id) : undefined,
      });

      setExportingDocId(null);
    } catch (err: any) {
      console.error('[Dashboard] Export failed:', err);
      setExportingDocId(null);
      alert(err?.message || 'Failed to export presentation as PDF.');
    }
  };

  const handleOpenNewWhiteboardModal = () => {
    setWhiteboardTitle('Untitled Whiteboard');
    setIsNewWhiteboardModalOpen(true);
    setTimeout(() => {
      whiteboardInputRef.current?.focus();
      whiteboardInputRef.current?.select();
    }, 60);
  };

  const handleCreateWhiteboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = whiteboardTitle.trim() || 'Untitled Whiteboard';
    try {
      setIsCreatingBlank(true);
      const doc = await createBlankDocument(finalTitle);
      setIsCreatingBlank(false);
      setIsNewWhiteboardModalOpen(false);
      onOpenDocument(doc._id);
    } catch (err: any) {
      setIsCreatingBlank(false);
      alert(err?.message || 'Failed to create whiteboard');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    setUploadError(null);

    // Validate type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Please select a valid PDF document.');
      return;
    }

    // Validate size (20MB)
    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError('File size exceeds the 20MB limit.');
      return;
    }

    setSelectedFile(file);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    setCustomTitle(baseName);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadError(null);

      const created = await uploadPdfDocument(selectedFile, customTitle);

      setIsUploading(false);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setCustomTitle('');

      // Open newly uploaded presentation immediately
      onOpenDocument(created._id);
    } catch (err: any) {
      setIsUploading(false);
      setUploadError(err?.message || 'Failed to upload PDF.');
    }
  };

  const handleOpenDeleteModal = (e: React.MouseEvent, doc: IDocumentSummary) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteError(null);
    setDocToDelete(doc);
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteDocument(docToDelete._id);
      setDocuments((prev) => prev.filter((d) => d._id !== docToDelete._id));
      setIsDeleting(false);
      setDocToDelete(null);
    } catch (err: any) {
      setIsDeleting(false);
      setDeleteError(err?.message || 'Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Blank Canvas';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const filteredDocuments = documents.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.originalName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-neutral-900 dark:text-white">
              SlideSketch
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              16:9 Presentation Viewer & Canvas Annotator
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* New Blank Whiteboard Presentation Button */}
          <button
            onClick={handleOpenNewWhiteboardModal}
            disabled={isCreatingBlank}
            className="flex items-center space-x-2 px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>New Slide Deck</span>
          </button>

          {/* Open PDF Button */}
          <button
            onClick={() => {
              setSelectedFile(null);
              setCustomTitle('');
              setUploadError(null);
              setIsUploadModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs shadow-indigo-600/30 transition-all hover:shadow-md cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Open PDF</span>
          </button>

          {/* User Badge & Sign Out */}
          <div className="flex items-center pl-2 sm:pl-3 border-l border-neutral-200 dark:border-neutral-800 space-x-2">
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{currentUser?.username || 'Abhishek'}</span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign out of SlideSketch"
                className="flex items-center space-x-1 px-2.5 py-1.5 text-neutral-600 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Search and stats bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                16:9 Presentations
              </h2>
              <span className="flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                <Tv className="w-3 h-3" />
                <span>Widescreen only</span>
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {filteredDocuments.length} {filteredDocuments.length === 1 ? 'presentation' : 'presentations'} available
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search 16:9 presentations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-neutral-500 font-medium">Loading presentations...</span>
          </div>
        ) : filteredDocuments.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-6 border-2 border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto bg-white/40 dark:bg-neutral-900/40">
            <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-2xl flex items-center justify-center">
              <Presentation className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 text-base">
                {searchQuery ? 'No matching 16:9 presentations' : 'No 16:9 presentations yet'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
                {searchQuery
                  ? 'Try searching with a different keyword.'
                  : 'Start by creating a blank 16:9 slide deck or upload a widescreen PDF presentation.'}
              </p>
            </div>
            {!searchQuery && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleOpenNewWhiteboardModal}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Blank Presentation</span>
                </button>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload PDF</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Grid of 16:9 Presentation Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocuments.map((doc) => (
              <div
                key={doc._id}
                onClick={() => onOpenDocument(doc._id)}
                className="group relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Thumbnail Preview Box */}
                  <div className="w-full aspect-video bg-neutral-100 dark:bg-neutral-800/80 rounded-xl flex items-center justify-center mb-4 relative overflow-hidden border border-neutral-200/60 dark:border-neutral-700/60 group-hover:border-indigo-300 dark:group-hover:border-indigo-700 transition-colors">
                    {/* Live presentation cover thumbnail */}
                    <DashboardThumbnail doc={doc} />

                    {/* 16:9 badge */}
                    <div className="absolute top-2.5 left-2.5 flex items-center space-x-1 bg-indigo-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs z-10">
                      <span>16:9</span>
                    </div>

                    {/* Page count pill */}
                    <div className="absolute top-2.5 right-2.5 flex items-center space-x-1 bg-neutral-900/80 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs z-10">
                      <Layers className="w-3 h-3" />
                      <span>{doc.totalPages} slides</span>
                    </div>
                  </div>

                  {/* Title and metadata */}
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-1">
                    {doc.originalName}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(doc.updatedAt || doc.createdAt)}</span>
                    </span>
                    <span>•</span>
                    <span>{formatFileSize(doc.fileSize)}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {/* Triple-dot options menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setActiveMenuDocId(activeMenuDocId === doc._id ? null : doc._id);
                        }}
                        title="More options"
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        {exportingDocId === doc._id ? (
                          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <MoreVertical className="w-4 h-4" />
                        )}
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuDocId === doc._id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 bottom-full mb-1.5 w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl py-1.5 z-40"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPdfFromDashboard(doc);
                            }}
                            disabled={exportingDocId === doc._id}
                            className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-colors"
                          >
                            <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                            <span>Download as PDF</span>
                          </button>

                          <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />

                          <button
                            onClick={(e) => {
                              setActiveMenuDocId(null);
                              handleOpenDeleteModal(e, doc);
                            }}
                            className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 flex-shrink-0" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-1.5 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-200/80 bg-white/70 backdrop-blur-xs py-4 px-6 text-center text-xs text-neutral-500">
        <div className="flex items-center justify-center space-x-1.5 font-medium">
          <span>Powered</span>
          <span>by</span>
          <span className="font-semibold text-neutral-800 tracking-wide">Saurabh</span>
        </div>
      </footer>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h3 className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
                Upload 16:9 PDF Presentation
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${selectedFile
                  ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
                  : 'border-neutral-300 dark:border-neutral-700 hover:border-indigo-400 bg-neutral-50 dark:bg-neutral-800/40'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  {selectedFile ? (
                    <div>
                      <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {formatFileSize(selectedFile.size)} • Click or drop another to replace
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
                        Drop your 16:9 PDF presentation here, or click to browse
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        PDF files only, up to 20MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title Input */}
              {selectedFile && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Presentation Title
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Enter presentation title"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              )}

              {/* Error Display */}
              {uploadError && (
                <div className="flex items-center space-x-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-sm font-semibold transition-all shadow-xs"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Open in Editor</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Whiteboard Modal */}
      {isNewWhiteboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Presentation className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                    New 16:9 Whiteboard
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Create a blank presentation canvas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewWhiteboardModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWhiteboardSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Whiteboard Name
                </label>
                <input
                  ref={whiteboardInputRef}
                  type="text"
                  value={whiteboardTitle}
                  onChange={(e) => setWhiteboardTitle(e.target.value)}
                  placeholder="e.g., Sprint Architecture, Physics Notes"
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewWhiteboardModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBlank}
                  className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  {isCreatingBlank ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Whiteboard</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                  Delete Presentation?
                </h3>
                <p className="text-[11px] text-neutral-500 line-clamp-1">
                  {docToDelete.title}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Are you sure you want to delete <strong className="text-neutral-800 dark:text-neutral-200">"{docToDelete.title}"</strong>? This action cannot be undone and will delete all stored annotations.
            </p>

            {deleteError && (
              <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setDocToDelete(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
