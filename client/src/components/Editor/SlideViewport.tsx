import React, { useRef, useState, useEffect } from 'react';
import { PdfViewer } from './PdfViewer';
import { AnnotationCanvas } from './AnnotationCanvas';
import { calculatePdfRect } from '../../utils/coordinates';
import type { IAnnotation } from '../../types/document';
import type { IPdfRect, ToolType, TriangleMode, GraphMode } from '../../types/canvas';

interface SlideViewportProps {
  pdfUrl: string;
  pdfPageNumber?: number | null;
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
  onPageCountLoaded?: (count: number) => void;
}

export const SlideViewport: React.FC<SlideViewportProps> = ({
  pdfUrl,
  pdfPageNumber,
  tool,
  triangleMode,
  graphMode,
  strokeColor,
  strokeWidth,
  annotations,
  selectedId,
  onSelectAnnotation,
  onChangeAnnotations,
  onDeleteAnnotation,
  onPageCountLoaded,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Current slide intrinsic unscaled size
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({
    width: 1920,
    height: 1080,
  });

  // Observe container size and keep it responsive
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Compute exact PDF displayed rectangle inside 16:9 container
  const pdfRect: IPdfRect = calculatePdfRect(
    containerSize.width,
    containerSize.height,
    pageSize.width,
    pageSize.height
  );

  const handlePageLoaded = (info: { width: number; height: number; totalPages: number }) => {
    setPageSize({ width: info.width, height: info.height });
    onPageCountLoaded?.(info.totalPages);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-neutral-100 dark:bg-neutral-900 overflow-hidden relative select-none">
      {/* 16:9 Responsive Slide Frame: Blank White Presentation Slide */}
      <div
        ref={containerRef}
        className="relative w-full max-w-[1720px] aspect-video max-h-[calc(100vh-140px)] bg-white rounded-xl shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 flex items-center justify-center"
      >
        {containerSize.width > 0 && containerSize.height > 0 && (
          <>
            {/* Layer 1: PDF Canvas or Pure White Page */}
            <PdfViewer
              pdfUrl={pdfUrl}
              pdfPageNumber={pdfPageNumber}
              pdfRect={pdfRect}
              onPageLoaded={handlePageLoaded}
            />

            {/* Layer 2: Transparent Annotation Canvas directly above Slide */}
            <AnnotationCanvas
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
              pdfRect={pdfRect}
              tool={tool}
              triangleMode={triangleMode}
              graphMode={graphMode}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              annotations={annotations}
              selectedId={selectedId}
              onSelectAnnotation={onSelectAnnotation}
              onChangeAnnotations={onChangeAnnotations}
              onDeleteAnnotation={onDeleteAnnotation}
            />
          </>
        )}
      </div>
    </div>
  );
};
