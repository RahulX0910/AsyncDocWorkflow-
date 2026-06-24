import { api } from "./client";
import {type DocRecord } from "../types/documents";

/* ---------------- Upload Document ---------------- */

export const uploadDocument = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return api.post("documents/upload", {
    body: formData,
  }).json();
};

/* ---------------- Get All Documents ---------------- */

export const getDocuments = async (): Promise<DocRecord[]> => {
  return api.get("documents").json<DocRecord[]>();
};

/* ---------------- Get Single Document ---------------- */

export const getDocument = async (id: string) => {
  return api.get(`documents/${id}`).json();
};

/* ---------------- Delete Document ---------------- */

export const deleteDocument = async (id: string) => {
  return api.delete(`documents/${id}`).json();
};

/* ---------------- Update Document ---------------- */

export const updateDocument = async (
  id: string,
  data: any
) => {
  return api.put(`documents/${id}`, {
    json: data,
  }).json();
};