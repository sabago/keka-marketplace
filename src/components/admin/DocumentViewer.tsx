'use client';

import { useState } from 'react';
import { FileText, Download, ZoomIn, ZoomOut, Loader2, AlertCircle } from 'lucide-react';

interface DocumentViewerProps {
  fileName: string;
  downloadUrl: string;
  mimeType: string;
}

export default function DocumentViewer({
  fileName,
  downloadUrl,
  mimeType,
}: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPDF = mimeType === 'application/pdf';
  const isImage = mimeType.startsWith('image/');

  const handleDownload = () => {
    window.open(downloadUrl, '_blank');
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError('Failed to load document');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
            {fileName}
          </span>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#0B4F96] hover:bg-blue-50 rounded transition-colors"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
      </div>

      {/* Viewer */}
      <div className="relative bg-gray-100 min-h-[600px] max-h-[800px] overflow-auto">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 text-[#0B4F96] animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading document...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-gray-900 font-medium">Failed to load document</p>
              <p className="text-xs text-gray-600 mt-1">Try downloading the file instead</p>
            </div>
          </div>
        )}

        {isPDF && (
          <iframe
            src={downloadUrl}
            className="w-full h-full min-h-[600px]"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError('Failed to load PDF');
            }}
            title={fileName}
          />
        )}

        {isImage && (
          <div className="flex items-center justify-center p-4">
            <img
              src={downloadUrl}
              alt={fileName}
              className="max-w-full h-auto shadow-lg rounded"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        )}

        {!isPDF && !isImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-900 font-medium mb-2">
                Preview not available for this file type
              </p>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#083d75] transition-colors"
              >
                <Download className="h-4 w-4" />
                Download File
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>Type: {mimeType}</span>
          <span>Temporary preview link (expires in 5 minutes)</span>
        </div>
      </div>
    </div>
  );
}
