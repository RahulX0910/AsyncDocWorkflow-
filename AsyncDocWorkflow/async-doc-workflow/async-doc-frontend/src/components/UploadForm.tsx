import { useRef, useState } from "react";
import ky from "ky";
import { DOC_UPLOADED } from "../utils/events";
import { type DocRecord } from "../types/documents";

export type FileEntry = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  progress: number;
  extracted: { key: string; value: string }[];
};

type Props = {
  files: FileEntry[];
  setFiles: React.Dispatch<React.SetStateAction<FileEntry[]>>;
};

type Tab = "upload" | "extract" | "edit";

const statusColor: Record<string, string> = {
  pending:    "bg-gray-100 text-gray-500",
  uploading:  "bg-blue-100 text-blue-600",
  processing: "bg-yellow-100 text-yellow-600",
  done:       "bg-green-100 text-green-600",
  error:      "bg-red-100 text-red-500",
};

const statusLabel: Record<string, string> = {
  pending:    "Pending",
  uploading:  "Uploading...",
  processing: "Processing...",
  done:       "Done",
  error:      "Error",
};

// Poll a doc until it's completed, then load extracted data
async function pollUntilDone(
  docId: string,
  setFiles: React.Dispatch<React.SetStateAction<FileEntry[]>>
) {
  const MAX_ATTEMPTS = 30;
  let attempts = 0;

  const interval = setInterval(async () => {
    attempts++;
    if (attempts > MAX_ATTEMPTS) {
      clearInterval(interval);
      return;
    }

    try {
      const doc = await ky
        .get(`http://localhost:8000/documents/${docId}`)
        .json<DocRecord>();

      // Update progress live
      setFiles((prev) =>
        prev.map((f) =>
          f.id === docId
            ? { ...f, progress: (doc as any).progress ?? f.progress }
            : f
        )
      );

      if (doc.status === "completed") {
        clearInterval(interval);

        const extracted = Object.entries(
          (doc as any).extracted_data ?? {}
        ).map(([key, value]) => ({ key, value: String(value) }));

        setFiles((prev) =>
          prev.map((f) =>
            f.id === docId
              ? { ...f, status: "done", progress: 100, extracted }
              : f
          )
        );
      } else if (doc.status === "failed") {
        clearInterval(interval);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === docId ? { ...f, status: "error", progress: 0 } : f
          )
        );
      } else {
        // Still processing — update status label
        setFiles((prev) =>
          prev.map((f) =>
            f.id === docId ? { ...f, status: "processing" } : f
          )
        );
      }
    } catch {
      clearInterval(interval);
    }
  }, 2000); // poll every 2 seconds
}

export default function UploadForm({ files, setFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── Upload ────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const newEntries: FileEntry[] = selected.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "pending",
      progress: 0,
      extracted: [],
    }));
    setFiles((prev) => [...prev, ...newEntries]);
    e.target.value = "";
  };

  const handleUploadAll = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) return;

    for (const entry of pending) {
      // Mark as uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === entry.id ? { ...f, status: "uploading", progress: 0 } : f
        )
      );

      const formData = new FormData();
      formData.append("file", entry.file);

      try {
        // POST to backend — returns immediately after saving file
        const doc = await ky
          .post("http://localhost:8000/documents/upload", { body: formData })
          .json<DocRecord>();

        // Update local id to match backend doc id so polling works
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, id: doc.id, status: "processing", progress: 0 }
              : f
          )
        );

        window.dispatchEvent(new Event(DOC_UPLOADED));

        // Start polling for Celery task completion
        pollUntilDone(doc.id, setFiles);
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id ? { ...f, status: "error" } : f
          )
        );
      }
    }
  };

  const handleRemove = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (editingId === id) setEditingId(null);
  };

  // ── Re-extract ────────────────────────────────────────────────
  const handleReExtract = async (entry: FileEntry) => {
    try {
      const doc = await ky
        .get(`http://localhost:8000/documents/${entry.id}`)
        .json<DocRecord>();

      const extracted = Object.entries(
        (doc as any).extracted_data ?? {}
      ).map(([key, value]) => ({ key, value: String(value) }));

      setFiles((prev) =>
        prev.map((f) => (f.id === entry.id ? { ...f, extracted } : f))
      );
    } catch {
      console.error("Re-extract failed for", entry.id);
    }
  };

  // ── Edit field ────────────────────────────────────────────────
  const handleEditField = (fileId: string, fieldKey: string, newValue: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              extracted: f.extracted.map((field) =>
                field.key === fieldKey ? { ...field, value: newValue } : field
              ),
            }
          : f
      )
    );
  };

  // ── Save edits ────────────────────────────────────────────────
  const handleSave = async (entry: FileEntry) => {
    try {
      const finalized_data = Object.fromEntries(
        entry.extracted.map((f) => [f.key, f.value])
      );
      await ky.patch(`http://localhost:8000/documents/${entry.id}`, {
        json: { finalized_data },
      });
      alert(`Saved changes for ${entry.file.name}`);
    } catch {
      alert("Save failed. Please try again.");
    }
  };

  const doneFiles = files.filter((f) => f.status === "done");

  const tabs: { key: Tab; label: string }[] = [
    { key: "upload", label: "📁 Upload" },
    { key: "extract", label: "🔍 Extract" },
    { key: "edit", label: "✏️ Edit" },
  ];

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-md rounded-xl border overflow-hidden">
      {/* ── Tab bar ── */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition ${
              activeTab === tab.key
                ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {tab.label}
            {tab.key === "extract" && doneFiles.length > 0 && (
              <span className="ml-1.5 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                {doneFiles.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* ══════════ UPLOAD TAB ══════════ */}
        {activeTab === "upload" && (
          <div>
            <label
              className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition"
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <span className="text-4xl mb-2">📂</span>
              <span className="text-gray-600 font-medium">Click to select files</span>
              <span className="text-xs text-gray-400 mt-1">Supports multiple files</span>
            </label>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl">📄</span>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 truncate max-w-xs">
                          {entry.file.name}
                        </p>
                        {(entry.status === "uploading" || entry.status === "processing") && (
                          <div className="w-32 bg-gray-200 rounded mt-1 h-1 overflow-hidden">
                            <div
                              className="bg-blue-500 h-1 rounded transition-all duration-500"
                              style={{ width: `${entry.progress || 10}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[entry.status]}`}>
                        {statusLabel[entry.status]}
                        {entry.status === "processing" && entry.progress > 0
                          ? ` ${entry.progress}%`
                          : ""}
                      </span>
                      <button
                        onClick={() => handleRemove(entry.id)}
                        className="text-gray-400 hover:text-red-500 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleUploadAll}
                  disabled={files.every((f) => f.status !== "pending")}
                  className="mt-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-medium text-sm transition"
                >
                  Upload All ({files.filter((f) => f.status === "pending").length} pending)
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════ EXTRACT TAB ══════════ */}
        {activeTab === "extract" && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Extracted Data
            </h3>
            {doneFiles.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                No completed files yet. Upload and wait for processing to finish.
              </div>
            ) : (
              <div className="space-y-4">
                {doneFiles.map((entry) => (
                  <div key={entry.id} className="border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">📄</span>
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {entry.file.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleReExtract(entry)}
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shrink-0 ml-2"
                      >
                        Re-extract
                      </button>
                    </div>

                    {entry.extracted.length === 0 ? (
                      <p className="text-gray-400 text-xs p-4">
                        No data extracted. Click Re-extract to reload from server.
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <tbody>
                          {entry.extracted.map((field) => (
                            <tr key={field.key} className="border-b last:border-0">
                              <td className="px-4 py-2 text-gray-500 font-medium w-1/3 bg-gray-50">
                                {field.key}
                              </td>
                              <td className="px-4 py-2 text-gray-800 break-all">
                                {field.value || <span className="text-gray-300">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════ EDIT TAB ══════════ */}
        {activeTab === "edit" && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Edit Extracted Data
            </h3>
            {doneFiles.filter((f) => f.extracted.length > 0).length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                No extracted data to edit yet.
              </div>
            ) : (
              <div className="space-y-4">
                {doneFiles
                  .filter((f) => f.extracted.length > 0)
                  .map((entry) => (
                    <div key={entry.id} className="border rounded-xl overflow-hidden">
                      <button
                        className="flex items-center justify-between w-full px-4 py-2.5 bg-gray-50 border-b hover:bg-gray-100 transition"
                        onClick={() =>
                          setEditingId(editingId === entry.id ? null : entry.id)
                        }
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">✏️</span>
                          <span className="text-sm font-medium text-gray-700 truncate">
                            {entry.file.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                          {editingId === entry.id ? "▲ collapse" : "▼ expand"}
                        </span>
                      </button>

                      {editingId === entry.id && (
                        <div className="p-4 space-y-3">
                          {entry.extracted.map((field) => (
                            <div key={field.key}>
                              <label className="block text-xs text-gray-500 mb-1 font-medium">
                                {field.key}
                              </label>
                              <input
                                type="text"
                                value={field.value}
                                onChange={(e) =>
                                  handleEditField(entry.id, field.key, e.target.value)
                                }
                                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>
                          ))}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleSave(entry)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition font-medium"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-4 py-2 border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}