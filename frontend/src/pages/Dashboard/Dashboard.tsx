import { useEffect, useState } from "react";
import StatCard from "../../components/StatCard";
import StatCardSkeleton from "../../components/StatCardSkeleton";
import Table, { type Column } from "../../components/Table";
import { useSimulatedLoading } from "../../hooks/useSimulatedLoading";
import { accessLogs, controllers, doors, users } from "../../mock/data";
import { isControllerOnline } from "../../utils/controllerStatus";
import { formatTime } from "../../utils/format";
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

function resultColor(result: AccessResult): string {
  return result === "GRANTED"
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
}

export default function Dashboard() {
  const isLoading = useSimulatedLoading();
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

  const columns: Column<AccessLog>[] = [
    { header: "Waktu", render: (l) => formatTime(l.server_ts) },
    {
      header: "Nama / Kartu",
      render: (l) => (
        <div>
          <div className="font-bold text-gray-900 dark:text-gray-100">{l.user_nama ?? "Unknown"}</div>
          <div className="font-mono text-xs text-gray-400 dark:text-gray-500">{l.kartu}</div>
        </div>
      ),
    },
    {
      header: "Pintu / Controller",
      render: (l) => {
        const ctrl = controllers.find((c) => c.id === l.controller_id);
        return (
          <div>
            <div className="font-bold text-gray-900 dark:text-gray-100">{l.door_nama ?? "—"}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">{ctrl?.device_id ?? "—"}</div>
          </div>
        );
      },
    },
    {
      header: "Status",
      render: (l) => <span className={`font-semibold ${resultColor(l.result)}`}>{l.result}</span>,
    },
    {
      header: "Reason",
      render: (l) => <span className={resultColor(l.result)}>{l.reason ?? "—"}</span>,
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Users" value={users.length} to="/users" />
            <StatCard label="Controllers" value={controllers.length} to="/controllers" />
            <StatCard label="Doors" value={doors.length} to="/doors" />
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
            🔴 Live Transaction
          </h2>
          <div className="max-h-[28rem] overflow-y-auto">
            <Table
              columns={columns}
              rows={feed}
              rowKey={(l) => l.id}
              emptyMessage="Belum ada transaksi."
            />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Status Controller ({onlineCount} Online / {offlineCount} Offline)
          </h2>
          <div className="space-y-3">
            {controllers.map((controller) => {
              const online = isControllerOnline(controller);
              return (
                <div
                  key={controller.id}
                  className="rounded-md border border-gray-200 p-3 dark:border-gray-600"
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {controller.nama}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Device ID: {controller.device_id} · IP:{" "}
                      {controller.ip_address ?? "DHCP (auto)"}
                    </span>
                    <span
                      className={`font-semibold ${online ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {online ? "ONLINE" : "OFFLINE"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
