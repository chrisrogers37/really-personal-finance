"use client";

import { useState, useCallback } from "react";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  loading?: boolean;
  acceptedFormats?: string;
}

export function FileDropzone({
  onFileSelect,
  loading = false,
  acceptedFormats = ".csv,.qfx,.qbo,.ofx",
}: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
        transition-colors duration-200
        ${
          dragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-white hover:border-gray-400"
        }
        ${loading ? "opacity-50 pointer-events-none" : ""}
      `}
    >
      <input
        type="file"
        accept={acceptedFormats}
        onChange={handleChange}
        className="hidden"
        id="file-upload"
        disabled={loading}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <p className="text-lg font-medium text-gray-700">
          {loading ? "Parsing file..." : "Drop a bank export file here"}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          or click to browse. Supports CSV, QFX, QBO, OFX
        </p>
      </label>
    </div>
  );
}
