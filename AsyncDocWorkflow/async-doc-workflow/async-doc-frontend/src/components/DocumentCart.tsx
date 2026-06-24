import { useState } from "react";
import { type FileEntry } from "./UploadForm";

type Props = {
  files: FileEntry[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onView: (id: string) => void;
};

type FilterType = "all" | "pending" | "uploading" | "done" | "error";

function fmtSize(bytes: number) {
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + " MB";
  return Math.round(bytes / 1000) + " KB";
}

const statusColor: Record<string, string> = {
  pending: "bg-gray-100 text-gray-500",
  uploading: "bg-blue-100 text-blue-600",
  done: "bg-green-100 text-green-600",
  error: "bg-red-100 text-red-500",
};

const statusLabel: Record<string, string> = {
  pending: "Pending",
  uploading: "Uploading...",
  done: "Done",
  error: "Error",
};

const fileIcon: Record<string, string> = {
  "application/pdf": "📄",
  "image/png": "🖼️",
  "image/jpeg": "🖼️",
  "text/plain": "📃",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
};

export default function DocumentCart({ files, onRemove, onClearAll, onView }: Props) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered =
    filter === "all" ? files : files.filter((f) => f.status === filter);

  const doneCount = files.filter((f) => f.status === "done").length;
  const uploadingCount = files.filter((f) => f.status === "uploading").length;
  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);

  const filters: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Done", value: "done" },
    { label: "Uploading", value: "uploading" },
    { label: "Pending", value: "pending" },
    { label: "Failed", value: "error" },
  ];

  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">Document Cart</h2>
          {uploadingCount > 0 && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full animate-pulse font-medium">
              {uploadingCount} uploading...
            </span>
          )}
        </div>
        <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-medium">
          {files.length} {files.length === 1 ? "file" : "files"}
        </span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              filter === f.value
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {f.label}
            {f.value !== "all" && (
              <span className="ml-1 opacity-60">
                ({files.filter((x) => x.status === f.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
          {files.length === 0
            ? "No documents yet. Upload files to see them here."
            : "No documents match this filter."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-gray-200 transition"
            >
              {/* Icon */}
              <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-base shrink-0">
                {fileIcon[entry.file.type] ?? "📦"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {entry.file.name}
                </p>
                <p className="text-xs text-gray-400">{fmtSize(entry.file.size)}</p>
                {entry.status === "uploading" && (
                  <div className="w-full bg-gray-100 rounded mt-1.5 h-1 overflow-hidden">
                    <div className="bg-blue-500 h-1 rounded animate-pulse w-2/3" />
                  </div>
                )}
              </div>

              {/* Status */}
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${statusColor[entry.status]}`}>
                {statusLabel[entry.status]}
              </span>

              {/* Actions */}
              <div className="flex gap-1.5 shrink-0">
                {entry.status === "done" && (
                  <button
                    onClick={() => onView(entry.id)}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                  >
                    View
                  </button>
                )}
                <button
                  onClick={() => onRemove(entry.id)}
                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {doneCount} done · {fmtSize(totalSize)} total
        </p>
        <button
          onClick={onClearAll}
          className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}