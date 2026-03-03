"use client";

import { useState, useCallback } from "react";
import { Upload } from "lucide-react";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  loading?: boolean;
  acceptedFormats?: string;
}

const FORMAT_BADGES = ["CSV", "QFX", "QBO", "OFX"];

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
        bg-background-card backdrop-blur-xl rounded-2xl border-2 border-dashed
        p-8 sm:p-12 text-center cursor-pointer transition-all duration-200
        ${
          dragActive
            ? "border-accent bg-accent/10 scale-[1.01] animate-glow"
            : "border-border hover:border-border-emphasis hover:bg-white/[0.03]"
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
        <div className="flex flex-col items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center ${loading ? "animate-shimmer shimmer-bg" : ""}`}>
            <Upload className="w-8 h-8 text-indigo-400" />
          </div>

          <div>
            <p className="text-lg font-medium text-foreground">
              {loading ? "Parsing file..." : "Drop your bank export here"}
            </p>
            <p className="text-sm text-foreground-muted mt-1">
              or click to browse your files
            </p>
          </div>

          <div className="flex gap-2 mt-2">
            {FORMAT_BADGES.map((fmt) => (
              <span
                key={fmt}
                className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/[0.06] border border-white/[0.08] text-foreground-muted"
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </label>
    </div>
  );
}
