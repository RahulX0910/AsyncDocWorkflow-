import { type DocRecord } from "../types/documents";

export const statusColors: Record<string, string> = {
  uploaded: "bg-gray-400",
  processing: "bg-yellow-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
};

export const statusTextColors: Record<string, string> = {
  uploaded: "text-gray-600",
  processing: "text-yellow-600",
  completed: "text-green-600",
  failed: "text-red-600",
};

export type Status = keyof typeof statusColors;

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`text-white px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}>
      {status}
    </span>
  );
}

export default function DocumentCard({ doc }: { doc: DocRecord }) {
  return (
    <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-gray-200 transition">
      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-base shrink-0">
        📄
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{doc.filename}</p>
        {doc.created_at && (
          <p className="text-xs text-gray-400">
            {new Date(doc.created_at).toLocaleString()}
          </p>
        )}
      </div>

      {/* Status badge */}
      <StatusBadge status={doc.status as Status} />
    </div>
  );
}
