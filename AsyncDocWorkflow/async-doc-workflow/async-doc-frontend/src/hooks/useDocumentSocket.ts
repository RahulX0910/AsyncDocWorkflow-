import { useEffect, useRef, useCallback } from "react";
import { type DocRecord } from "../types/documents";

type WSMessage =
  | { type: "doc_update"; doc: DocRecord }
  | { type: "doc_added"; doc: DocRecord }
  | { type: "doc_deleted"; id: string };

type Props = {
  onUpdate: (doc: DocRecord) => void;
  onAdd: (doc: DocRecord) => void;
  onDelete: (id: string) => void;
};

export function useDocumentSocket({ onUpdate, onAdd, onDelete }: Props) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket("ws://localhost:8000/ws");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Connected");
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        if (msg.type === "doc_update") onUpdate(msg.doc);
        else if (msg.type === "doc_added") onAdd(msg.doc);
        else if (msg.type === "doc_deleted") onDelete(msg.id);
      } catch (e) {
        console.error("[WS] Failed to parse message", e);
      }
    };

    ws.onclose = () => {
      console.warn("[WS] Disconnected — reconnecting in 3s...");
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error("[WS] Error", err);
      ws.close();
    };
  }, [onUpdate, onAdd, onDelete]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  return wsRef;
}