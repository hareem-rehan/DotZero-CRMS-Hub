'use client';

import { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

const MAX_FILES = 5;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  label?: string;
  error?: string;
}

export function FileUpload({ files, onFilesChange, label, error }: FileUploadProps) {
  const [rejectMsg, setRejectMsg] = useState('');

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      setRejectMsg('');
      if (rejected.length > 0) {
        const msgs = rejected.flatMap((r) => r.errors.map((e) => e.message));
        setRejectMsg(msgs[0] ?? 'File rejected');
        return;
      }
      const next = [...files, ...accepted].slice(0, MAX_FILES);
      onFilesChange(next);
    },
    [files, onFilesChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE_BYTES,
    maxFiles: MAX_FILES - files.length,
    disabled: files.length >= MAX_FILES,
  });

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    onFilesChange(next);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-[#2D2D2D]">{label}</label>}

      <div
        {...getRootProps()}
        className={`rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors cursor-pointer ${
          isDragActive
            ? 'border-[#EF323F] bg-red-50'
            : files.length >= MAX_FILES
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-[#D3D3D3] hover:border-[#EF323F] hover:bg-red-50/30'
        } ${error ? 'border-red-500' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-1 text-sm text-[#5D5B5B]">
          <svg className="h-8 w-8 text-[#D3D3D3]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          {files.length >= MAX_FILES ? (
            <span className="text-gray-400">Maximum {MAX_FILES} files reached</span>
          ) : isDragActive ? (
            <span className="font-medium text-[#EF323F]">Drop files here</span>
          ) : (
            <>
              <span>
                <span className="font-medium text-[#EF323F]">Click to upload</span> or drag & drop
              </span>
              <span className="text-xs text-gray-400">
                PDF, DOC, DOCX, XLS, XLSX, PNG, JPG — max 10 MB each, up to {MAX_FILES} files
              </span>
            </>
          )}
        </div>
      </div>

      {(rejectMsg || error) && (
        <p className="text-xs text-red-600">{rejectMsg || error}</p>
      )}

      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((file, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg border border-[#D3D3D3] bg-white px-3 py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon mimeType={file.type} />
                <span className="truncate text-[#2D2D2D]">{file.name}</span>
                <span className="shrink-0 text-xs text-[#5D5B5B]">{formatSize(file.size)}</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="ml-2 shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Remove file"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  return (
    <svg className={`h-4 w-4 shrink-0 ${isPdf ? 'text-red-500' : isImage ? 'text-blue-500' : 'text-green-600'}`} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
    </svg>
  );
}
