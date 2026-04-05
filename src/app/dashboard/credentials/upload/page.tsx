'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  ArrowLeft,
  Info,
} from 'lucide-react';

interface DocumentType {
  id: string;
  name: string;
  description: string | null;
  expirationDays: number | null;
  isRequired: boolean;
  isGlobal: boolean;
}

interface GroupedDocumentTypes {
  required: DocumentType[];
  optional: DocumentType[];
}

type UploadStep = 'select-type' | 'select-file' | 'uploading' | 'success' | 'error';

export default function UploadCredentialPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [step, setStep] = useState<UploadStep>('select-type');
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [groupedTypes, setGroupedTypes] = useState<GroupedDocumentTypes>({
    required: [],
    optional: [],
  });
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  const fetchDocumentTypes = async () => {
    setIsLoadingTypes(true);
    setError(null);

    try {
      const response = await fetch('/api/employee/document-types');

      if (!response.ok) {
        throw new Error('Failed to fetch document types');
      }

      const data = await response.json();
      setDocumentTypes(data.documentTypes);
      setGroupedTypes(data.grouped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching document types:', err);
    } finally {
      setIsLoadingTypes(false);
    }
  };

  const handleTypeSelect = (type: DocumentType) => {
    setSelectedType(type);
    setStep('select-file');
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only PDF, JPG, and PNG files are allowed.');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File size exceeds maximum of 10MB`);
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedType) return;

    setStep('uploading');
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentTypeId', selectedType.id);
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }

      // Simulate progress (real progress tracking would require streaming)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/employee/credentials/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload credential');
      }

      const result = await response.json();
      setUploadResult(result);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStep('error');
      console.error('Upload error:', err);
    }
  };

  const handleReset = () => {
    setStep('select-type');
    setSelectedType(null);
    setSelectedFile(null);
    setNotes('');
    setUploadProgress(0);
    setError(null);
    setUploadResult(null);
  };

  const handleViewDashboard = () => {
    router.push('/dashboard/credentials');
  };

  const handleBack = () => {
    if (step === 'select-file') {
      setStep('select-type');
      setSelectedType(null);
      setSelectedFile(null);
      setNotes('');
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Upload Credential</h1>
          <p className="text-gray-600 mt-2">
            Upload your professional licenses and certifications
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <div
            className={`flex items-center gap-2 ${
              step === 'select-type' ? 'text-[#0B4F96]' : 'text-gray-400'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step !== 'select-type' && selectedType
                  ? 'bg-[#0B4F96] border-[#0B4F96] text-white'
                  : step === 'select-type'
                  ? 'border-[#0B4F96]'
                  : 'border-gray-300'
              }`}
            >
              {selectedType && step !== 'select-type' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                '1'
              )}
            </div>
            <span className="font-medium">Select Type</span>
          </div>

          <div className="h-px w-16 bg-gray-300" />

          <div
            className={`flex items-center gap-2 ${
              step === 'select-file' || step === 'uploading'
                ? 'text-[#0B4F96]'
                : 'text-gray-400'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step === 'success'
                  ? 'bg-[#0B4F96] border-[#0B4F96] text-white'
                  : step === 'select-file' || step === 'uploading'
                  ? 'border-[#0B4F96]'
                  : 'border-gray-300'
              }`}
            >
              {step === 'success' ? <CheckCircle className="h-5 w-5" /> : '2'}
            </div>
            <span className="font-medium">Upload File</span>
          </div>

          <div className="h-px w-16 bg-gray-300" />

          <div
            className={`flex items-center gap-2 ${
              step === 'success' ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step === 'success'
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'border-gray-300'
              }`}
            >
              {step === 'success' ? <CheckCircle className="h-5 w-5" /> : '3'}
            </div>
            <span className="font-medium">Complete</span>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          {/* Step 1: Select Document Type */}
          {step === 'select-type' && (
            <div className="p-6">
              {isLoadingTypes && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-[#0B4F96] animate-spin" />
                </div>
              )}

              {!isLoadingTypes && documentTypes.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    No document types available. Please contact your administrator.
                  </p>
                </div>
              )}

              {!isLoadingTypes && documentTypes.length > 0 && (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Select Document Type
                  </h2>

                  {/* Required Documents */}
                  {groupedTypes.required.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                        Required Documents
                      </h3>
                      <div className="space-y-2">
                        {groupedTypes.required.map((type) => (
                          <button
                            key={type.id}
                            onClick={() => handleTypeSelect(type)}
                            className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-[#0B4F96] hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-gray-400" />
                                  <h4 className="font-semibold text-gray-900">
                                    {type.name}
                                  </h4>
                                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                                    Required
                                  </span>
                                </div>
                                {type.description && (
                                  <p className="text-sm text-gray-600 mt-2 ml-7">
                                    {type.description}
                                  </p>
                                )}
                                {type.expirationDays && (
                                  <p className="text-xs text-gray-500 mt-1 ml-7">
                                    Expires after {type.expirationDays} days
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Optional Documents */}
                  {groupedTypes.optional.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                        Optional Documents
                      </h3>
                      <div className="space-y-2">
                        {groupedTypes.optional.map((type) => (
                          <button
                            key={type.id}
                            onClick={() => handleTypeSelect(type)}
                            className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-[#0B4F96] hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-gray-400" />
                                  <h4 className="font-semibold text-gray-900">
                                    {type.name}
                                  </h4>
                                </div>
                                {type.description && (
                                  <p className="text-sm text-gray-600 mt-2 ml-7">
                                    {type.description}
                                  </p>
                                )}
                                {type.expirationDays && (
                                  <p className="text-xs text-gray-500 mt-1 ml-7">
                                    Expires after {type.expirationDays} days
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 2: Upload File */}
          {step === 'select-file' && selectedType && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload {selectedType.name}
                </h2>
                <p className="text-sm text-gray-600">
                  Upload a PDF, JPG, or PNG file (max 10MB)
                </p>
              </div>

              {/* File Dropzone */}
              {!selectedFile && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-[#0B4F96] bg-blue-50'
                      : 'border-gray-300 hover:border-[#0B4F96] hover:bg-gray-50'
                  }`}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Drop your file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-600">
                    Supported formats: PDF, JPG, PNG (max 10MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              )}

              {/* Selected File Preview */}
              {selectedFile && (
                <div className="border border-gray-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="h-8 w-8 text-[#0B4F96]" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Optional Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional information about this credential..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                />
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">What happens next?</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Your document will be analyzed by our AI</li>
                      <li>Key information will be extracted automatically</li>
                      <li>An admin will review and approve the credential</li>
                      <li>You'll receive an email notification when complete</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-900">{error}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('select-type');
                    setSelectedType(null);
                    setSelectedFile(null);
                    setNotes('');
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile}
                  className="flex-1 px-6 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#083d75] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Upload Credential
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Uploading */}
          {step === 'uploading' && (
            <div className="p-6">
              <div className="text-center py-12">
                <Loader2 className="h-16 w-16 text-[#0B4F96] animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Uploading your credential...
                </h2>
                <p className="text-gray-600 mb-6">
                  Please wait while we process your document
                </p>

                {/* Progress Bar */}
                <div className="max-w-md mx-auto">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#0B4F96] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {uploadProgress}% complete
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && uploadResult && (
            <div className="p-6">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Credential Uploaded Successfully!
                </h2>
                <p className="text-gray-600 mb-8">
                  Your {uploadResult.credential.documentType} has been uploaded and is
                  being processed.
                </p>

                {/* Upload Details */}
                <div className="max-w-md mx-auto mb-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Document:</span>
                      <span className="font-medium text-gray-900">
                        {uploadResult.credential.fileName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium text-gray-900">
                        {uploadResult.credential.documentType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Queue Position:</span>
                      <span className="font-medium text-gray-900">
                        #{uploadResult.parsing.queuePosition}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Est. Processing Time:</span>
                      <span className="font-medium text-gray-900">
                        ~{uploadResult.parsing.estimatedWaitTime} seconds
                      </span>
                    </div>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="max-w-md mx-auto mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900 text-left">
                      <p className="font-medium mb-2">What's next?</p>
                      <ol className="space-y-1 list-decimal list-inside">
                        <li>AI will extract credential information</li>
                        <li>Admin will review the extracted data</li>
                        <li>You'll receive email notification when approved</li>
                        <li>Credential will appear in your dashboard</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleReset}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Upload Another
                  </button>
                  <button
                    onClick={handleViewDashboard}
                    className="px-6 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#083d75] transition-colors"
                  >
                    View Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Error */}
          {step === 'error' && (
            <div className="p-6">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-10 w-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Upload Failed
                </h2>
                <p className="text-gray-600 mb-4">
                  We couldn't upload your credential. Please try again.
                </p>

                {error && (
                  <div className="max-w-md mx-auto mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-900">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleBack}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-6 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#083d75] transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
