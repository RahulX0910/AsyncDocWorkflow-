import { useState, useCallback } from "react";
import { type DocRecord } from "../types/documents";
import UploadForm, { type FileEntry } from "../components/UploadForm";
import DocumentCart from "../components/DocumentCart";
import DocumentDetail from "../components/Documentdetail";
import { useDocumentSocket } from "../hooks/useDocumentSocket";

export default function Dashboard() {
  // ✅ Single source of truth — shared by UploadForm AND DocumentCart
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // ── WebSocket live updates ──────────────────────────────────────
  const handleUpdate = useCallback((updated: DocRecord) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === updated.id
          ? { ...f, status: updated.status as FileEntry["status"] }
          : f
      )
    );
  }, []);

  const handleAdd = useCallback((added: DocRecord) => {
    setFiles((prev) => {
      if (prev.find((f) => f.id === added.id)) return prev;
      return [
        {
          id: added.id,
          file: new File([], added.filename),
          status: added.status as FileEntry["status"],
          extracted: [],
          progress: 0,
        },
        ...prev,
      ];
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (selectedDocId === id) setSelectedDocId(null);
  }, [selectedDocId]);

  useDocumentSocket({
    onUpdate: handleUpdate,
    onAdd: handleAdd,
    onDelete: handleDelete,
  });

  // ── Document detail view ────────────────────────────────────────
  if (selectedDocId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <DocumentDetail
          docId={selectedDocId}
          onBack={() => setSelectedDocId(null)}
        />
      </div>
    );
  }

  // ── Main dashboard ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* files & setFiles shared — cart updates live as uploads progress */}
      <UploadForm files={files} setFiles={setFiles} />

      <DocumentCart
        files={files}
        onRemove={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
        onClearAll={() => setFiles([])}
        onView={(id) => setSelectedDocId(id)}
      />
    </div>
  );
}