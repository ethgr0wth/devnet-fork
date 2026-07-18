import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, Loader2, AlertCircle, Check, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/queryClient";

interface ExtractionResult {
  text: string;
  filename: string;
  title: string;
  file_type: string;
  size_bytes: number;
  char_count: number;
}

interface DocumentUploadProps {
  onApply: (title: string, content: string, metadata: { filename: string; file_type: string; size_bytes: number }) => void;
  onCancel?: () => void;
  compact?: boolean;
  applyLabel?: string;
}

type UploadPhase = "idle" | "uploading" | "drafting" | "error";

const ALLOWED_TYPES: Record<string, string> = {
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/markdown": ".md",
};

const ALLOWED_EXTENSIONS = [".txt", ".csv", ".pdf", ".docx", ".md"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUpload({ onApply, onCancel, compact, applyLabel }: DocumentUploadProps) {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file type. Supported: ${ALLOWED_EXTENSIONS.join(", ")}`);
      setPhase("error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum size is 5MB.");
      setPhase("error");
      return;
    }

    setPhase("uploading");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch("/api/documents/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(data.detail || "Failed to extract text");
      }

      const result: ExtractionResult = await res.json();
      setExtraction(result);
      setDraftTitle(result.title);
      setDraftContent(result.text);
      setPhase("drafting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
      setPhase("error");
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (e.target) e.target.value = "";
  }, [handleFile]);

  const handleApply = () => {
    if (!draftTitle.trim() || !draftContent.trim() || !extraction) return;
    onApply(draftTitle.trim(), draftContent.trim(), {
      filename: extraction.filename,
      file_type: extraction.file_type,
      size_bytes: extraction.size_bytes,
    });
  };

  const resetState = () => {
    setPhase("idle");
    setError(null);
    setExtraction(null);
    setDraftTitle("");
    setDraftContent("");
  };

  if (phase === "uploading") {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3" data-testid="upload-loading">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-sm text-slate-400">Extracting text from document...</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="space-y-4" data-testid="upload-error">
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={resetState}
              className="text-xs text-red-400 hover:text-red-300 mt-2 underline"
              data-testid="button-retry-upload"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "drafting" && extraction) {
    return (
      <div className="space-y-4" data-testid="upload-draft">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <FileText className="w-4 h-4 text-purple-400" />
          <span className="truncate">{extraction.filename}</span>
          <span className="text-slate-600">({formatBytes(extraction.size_bytes)})</span>
          <button
            onClick={resetState}
            className="ml-auto text-slate-500 hover:text-white p-1"
            data-testid="button-clear-draft"
          >
            <X size={14} />
          </button>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Title</label>
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
            data-testid="input-draft-title"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm text-slate-400 flex items-center gap-1.5">
              <Edit3 size={12} />
              Extracted Content
            </label>
            <span className="text-xs text-slate-600">{draftContent.length.toLocaleString()} chars</span>
          </div>
          <textarea
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono min-h-[200px] max-h-[400px] resize-y focus:outline-none focus:border-purple-500/50"
            data-testid="textarea-draft-content"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { resetState(); onCancel?.(); }}
            className="flex-1 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
            data-testid="button-cancel-draft"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!draftTitle.trim() || !draftContent.trim()}
            className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
            data-testid="button-apply-draft"
          >
            <Check size={16} />
            {applyLabel || "Apply to Knowledge"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
        ${isDragOver
          ? "border-purple-400 bg-purple-500/10"
          : "border-slate-700 hover:border-slate-500 hover:bg-white/5"
        }
        ${compact ? "py-4" : "py-8"}
      `}
      data-testid="upload-dropzone"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS.join(",")}
        onChange={onFileSelect}
        className="hidden"
        data-testid="input-file-upload"
      />
      <Upload className={`mx-auto mb-2 ${isDragOver ? "text-purple-400" : "text-slate-500"} ${compact ? "w-5 h-5" : "w-8 h-8"}`} />
      <p className={`text-slate-400 ${compact ? "text-xs" : "text-sm"}`}>
        {isDragOver ? "Drop file here" : "Drag & drop or click to upload"}
      </p>
      <p className="text-xs text-slate-600 mt-1">PDF, DOCX, TXT, CSV, MD (max 5MB)</p>
    </div>
  );
}
