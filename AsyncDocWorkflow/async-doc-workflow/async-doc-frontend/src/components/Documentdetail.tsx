import { useState, useEffect } from "react";
import ky from "ky";
import { type DocRecord } from "../types/documents";
import { StatusBadge } from "./DocumentCard";

type ExtractedField = { key: string; value: string };

type Props = {
  docId: string;
  onBack: () => void;
};

// ─── Export helpers ───────────────────────────────────────────────
function exportAsCSV(fields: ExtractedField[], filename: string) {
  const header = "Key,Value";
  const rows = fields.map((f) => `"${f.key}","${f.value.replace(/"/g, '""')}"`);
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  triggerDownload(blob, `${filename}.csv`);
}

function exportAsJSON(fields: ExtractedField[], filename: string) {
  const obj = Object.fromEntries(fields.map((f) => [f.key, f.value]));
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  triggerDownload(blob, `${filename}.json`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────
export default function DocumentDetail({ docId, onBack }: Props) {
  const [doc, setDoc] = useState<DocRecord | null>(null);
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await ky
          .get(`http://localhost:8000/documents/${docId}`)
          .json<DocRecord>();
        setDoc(data);

        // Map extracted_data object → array of {key, value}
        // Adjust based on your actual DocRecord shape
        const extracted: ExtractedField[] = Object.entries(
          (data as any).extracted_data ?? {}
        ).map(([key, value]) => ({ key, value: String(value) }));
        setFields(extracted);
      } catch (e) {
        console.error("Failed to load document", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [docId]);

  const startEdit = (key: string, value: string) => {
    setEditingKey(key);
    setEditValue(value);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue("");
  };

  const saveEdit = async (key: string) => {
    setSaving(true);
    try {
      await ky.patch(`http://localhost:8000/documents/${docId}`, {
        json: { [key]: editValue },
      });
      setFields((prev) =>
        prev.map((f) => (f.key === key ? { ...f, value: editValue } : f))
      );
      setEditingKey(null);
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setSaving(false);
    }
  };

  const filename = doc?.filename?.replace(/\.[^.]+$/, "") ?? "document";

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center text-gray-400 text-sm">
        Loading document...
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center text-red-400 text-sm">
        Document not found.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-700 transition px-2 py-1 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200"
        >
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-gray-800 truncate">
            {doc.filename}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {doc.created_at
              ? new Date(doc.created_at).toLocaleString()
              : "—"}
          </p>
        </div>
        <StatusBadge status={doc.status as any} />

        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => setExportOpen((p) => !p)}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition font-medium"
          >
            Export ↓
          </button>
          {exportOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden">
              <button
                onClick={() => { exportAsCSV(fields, filename); setExportOpen(false); }}
                className="w-full text-left text-sm px-4 py-2.5 hover:bg-gray-50 text-gray-700 transition"
              >
                Download CSV
              </button>
              <button
                onClick={() => { exportAsJSON(fields, filename); setExportOpen(false); }}
                className="w-full text-left text-sm px-4 py-2.5 hover:bg-gray-50 text-gray-700 transition"
              >
                Download JSON
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Extracted fields */}
      {fields.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
          No extracted data available for this document.
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {fields.map((field) => (
            <div
              key={field.key}
              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition group"
            >
              {/* Key */}
              <span className="text-xs font-medium text-gray-500 w-40 shrink-0 pt-1">
                {field.key}
              </span>

              {/* Value / editor */}
              {editingKey === field.key ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(field.key);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="flex-1 border border-blue-300 rounded-lg px-3 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    onClick={() => saveEdit(field.key)}
                    disabled={saving}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-800 break-all">
                    {field.value || <span className="text-gray-300">—</span>}
                  </span>
                  <button
                    onClick={() => startEdit(field.key, field.value)}
                    className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition shrink-0"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}