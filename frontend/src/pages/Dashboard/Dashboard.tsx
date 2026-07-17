import { useEffect, useState } from "react";
import StatCard from "../../components/StatCard";
import { accessLogs, controllers, doors, users } from "../../mock/data";
import { isControllerOnline } from "../../utils/controllerStatus";
import type { AccessLog, AccessReason, AccessResult } from "../../types";

const FEED_LIMIT = 20;

const DUMMY_KARTU = ["AABBCCDD", "0011223344", "DEADBEEF", "FF001122", "CAFEBABE", "00000FADE"];
const DOOR_REASON_BY_RESULT: Record<AccessResult, AccessReason[]> = {
  GRANTED: ["OK"],
  DENIED: ["UNKNOWN_CARD", "NO_ACCESS"],
};

let nextLogId = Math.max(...accessLogs.map((l) => l.id)) + 1;

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Simulasi 1 event tap kartu acak - dipakai Fase A sebagai pengganti WebSocket sungguhan.
function generateRandomLog(): AccessLog {
  const controller = randomItem(controllers);
  const controllerDoors = doors.filter((d) => d.controller_id === controller.id);
  const door = randomItem(controllerDoors);
  const result: AccessResult = Math.random() > 0.4 ? "GRANTED" : "DENIED";
  const reason = randomItem(DOOR_REASON_BY_RESULT[result]);
  const kartu = randomItem(DUMMY_KARTU);
  const user = users.find((u) => u.kartu === kartu) ?? null;

  return {
    id: nextLogId++,
    kartu,
    user_id: user?.uid ?? null,
    user_nama: user?.nama ?? null,
    door_id: door.id,
    door_nama: door.nama,
    controller_id: controller.id,
    result,
    reason,
    server_ts: new Date().toISOString(),
    device_uptime_ms: Math.floor(Math.random() * 1_000_000),
    is_replayed: false,
    created_at: new Date().toISOString(),
  };
}

export default function Dashboard() {
  const [feed, setFeed] = useState<AccessLog[]>(() =>
    [...accessLogs].sort((a, b) => (a.server_ts < b.server_ts ? 1 : -1)),
  );

  // TODO(Fase B): ganti setInterval ini dengan koneksi native WebSocket ke /ws/live-feed
  // (folder src/ws/) - setiap pesan masuk di-prepend ke feed persis seperti simulasi ini.
  useEffect(() => {
    const interval = setInterval(() => {
      setFeed((prev) => [generateRandomLog(), ...prev].slice(0, FEED_LIMIT));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const onlineCount = controllers.filter((c) => isControllerOnline(c)).length;
  const offlineCount = controllers.length - onlineCount;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Users" value={users.length} />
        <StatCard label="Controllers" value={controllers.length} />
        <StatCard label="Doors" value={doors.length} />
        <StatCard
          label="Status Controller"
          value={`${onlineCount} Online / ${offlineCount} Offline`}
        />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">🔴 Live Access Feed</h2>
        <div className="max-h-96 space-y-1 overflow-y-auto">
          {feed.map((log) => (
            <div
              key={log.id}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                log.result === "GRANTED" ? "bg-green-50" : "bg-red-50"
              }`}
            >
              <span className={log.result === "GRANTED" ? "text-green-700" : "text-red-700"}>
                {log.result === "GRANTED" ? "🟢" : "🔴"}{" "}
                {new Date(log.server_ts).toLocaleTimeString("id-ID")}{" "}
                {log.user_nama ?? "Unknown"}
              </span>
              <span className="text-gray-500">
                {log.door_nama} · {log.result} ({log.reason})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
