import { useEffect, useRef, useState } from "react";

// Bentuk pesan PERSIS payload broadcast backend (app/mqtt/handlers.py:110-123).
// Field "controller" berisi device_id (string, mis. "ctrl-A"), BUKAN controller_id numerik -
// beda dari AccessLog.controller_id di REST API (GET /api/logs), jangan disamakan.
export interface LiveFeedMessage {
  id: number;
  kartu: string;
  user_nama: string | null;
  door_nama: string | null;
  controller: string;
  result: "GRANTED" | "DENIED";
  reason: string | null;
  server_ts: string;
}

function wsUrl(): string {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  return base.replace(/^http/, "ws") + "/ws/live-feed";
}

const RECONNECT_DELAY_MS = 3000;

export function useLiveFeed(limit = 20) {
  const [messages, setMessages] = useState<LiveFeedMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;

    function connect() {
      ws = new WebSocket(wsUrl());

      ws.onopen = () => setConnected(true);

      ws.onmessage = (event) => {
        try {
          const data: LiveFeedMessage = JSON.parse(event.data);
          setMessages((prev) => [data, ...prev].slice(0, limit));
        } catch {
          // abaikan pesan yang bukan JSON valid
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!cancelled) {
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => ws?.close();
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws?.close();
    };
  }, [limit]);

  return { messages, connected };
}
