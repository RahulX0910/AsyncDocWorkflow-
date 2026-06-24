export type DocumentStatus =
  | "uploaded"
  | "processing"
  | "completed"
  | "failed";

export interface DocRecord {
  id: string;
  filename: string;
  status: string;
  created_at?: string;
}

