import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, AlertCircle, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';

/**
 * Resume Uploader Component for Resume-Genome Module
 * Handles file upload (PDF/DOCX only) with drag-drop, validation, and accessibility
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FORMATS = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

export default function ResumeUploader({ onFileSelect, disabled = false, currentFile = null }) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(currentFile);
  const [validationError, setValidationError] = useState(null);

  const validateFile = (file) => {
    console.log('🔍 Validating file:', file.name, file.type, file.size);
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 10MB limit';
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = fileName.endsWith('.pdf') || fileName.endsWith('.docx');
    
    if (!hasValidExtension) {
      return 'Only PDF and DOCX files are allowed';
    }

    // Check MIME type if available
    const allowedTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '' // Allow empty MIME type if extension is valid
    ];
    
    if (file.type && !allowedTypes.includes(file.type)) {
      console.warn('⚠️ Unexpected MIME type:', file.type, 'but extension is valid');
    }

    console.log('✅ File validation passed');
    return null;
  };

  const handleFileProcess = async (file) => {
    setValidationError(null);
    
    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      showError(error);
      return;
    }

    setUploading(true);
    try {
      // Just pass the file object directly - don't try to read it as text
      // The backend API will handle the file upload
      setSelectedFile({ name: file.name, size: file.size, type: file.type });
      
      if (onFileSelect) {
        // Pass the actual File object, not text content
        await onFileSelect(file);
      }
      
      showSuccess('Resume uploaded successfully');
    } catch (error) {
      console.error('File processing error:', error);
      showError('Failed to process resume file');
      setValidationError('Failed to process file');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      const error = rejection.errors[0];
      
      if (error.code === 'file-too-large') {
        showError('File size exceeds 10MB limit');
      } else if (error.code === 'file-invalid-type') {
        showError('Only PDF and DOCX files are allowed');
      } else {
        showError('Invalid file');
      }
      return;
    }

    if (acceptedFiles.length === 0) {
      showError('Please upload a PDF or DOCX file');
      return;
    }

    const file = acceptedFiles[0];
    await handleFileProcess(file);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    disabled: uploading || disabled,
  });

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setValidationError(null);
    if (onFileSelect) {
      onFileSelect(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-200">
        Upload Resume <span className="text-red-400">*</span>
      </label>
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-royal-500 bg-royal-500/10'
            : validationError
            ? 'border-red-500/50 bg-red-500/10'
            : 'border-white/20 hover:border-white/40 hover:bg-white/5'
        } ${(uploading || disabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
        role="button"
        aria-label="Upload resume file"
        tabIndex={0}
      >
        <input {...getInputProps()} aria-describedby="file-upload-instructions" />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-royal-400 animate-spin" aria-hidden="true" />
            <p className="text-gray-300">Processing resume...</p>
          </div>
        ) : selectedFile ? (
          <div className="flex items-center justify-between gap-3 p-3 bg-white/10 rounded-lg border border-white/20">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <FileText className="w-8 h-8 text-green-400 flex-shrink-0" aria-hidden="true" />
              <div className="text-left min-w-0">
                <p className="font-medium text-white truncate">{selectedFile.name}</p>
                <p className="text-sm text-gray-400">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Remove file"
            >
              <X className="w-5 h-5 text-gray-300" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-gray-400" aria-hidden="true" />
            <div>
              <p className="text-base font-medium text-gray-200">
                {isDragActive ? 'Drop your resume here' : 'Upload your resume'}
              </p>
              <p className="text-sm text-gray-400 mt-1" id="file-upload-instructions">
                Drag and drop or click to browse (PDF, DOCX only, max 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {validationError && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg" role="alert">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-red-300">{validationError}</p>
        </div>
      )}
    </div>
  );
}
