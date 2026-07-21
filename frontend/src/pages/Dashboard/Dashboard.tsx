import StatCard from "../../components/StatCard";
import StatCardSkeleton from "../../components/StatCardSkeleton";
import Table, { type Column } from "../../components/Table";
import { useControllers } from "../../api/controllers";
import { useDoors } from "../../api/doors";
import { useUsers } from "../../api/users";
import { formatTime } from "../../utils/format";
import { useLiveFeed, type LiveFeedMessage } from "../../ws/liveFeed";
import type { AccessResult } from "../../types";

function resultColor(result: AccessResult): string {
  return result === "GRANTED"
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
}

export default function Dashboard() {
  const usersQuery = useUsers({ page_size: 1 }); // cuma butuh `total`, page_size kecil hemat payload
  const controllersQuery = useControllers();
  const doorsQuery = useDoors();
  const { messages: feed, connected } = useLiveFeed(20);

  const isLoading = usersQuery.isLoading || controllersQuery.isLoading || doorsQuery.isLoading;

  const controllers = controllersQuery.data ?? [];
  const onlineCount = controllers.filter((c) => c.is_online).length;
  const offlineCount = controllers.length - onlineCount;

  const columns: Column<LiveFeedMessage>[] = [
    { header: "Waktu", render: (l) => formatTime(l.server_ts) },
    {
      header: "Nama / Kartu",
      render: (l) => (
        <div>
          <div className="font-bold text-gray-900 dark:text-gray-100">
            {l.user_nama ?? "Unknown"}
          </div>
          <div className="font-mono text-xs text-gray-400 dark:text-gray-500">{l.kartu}</div>
        </div>
      ),
    },
    {
      header: "Pintu / Controller",
      render: (l) => (
        <div>
          <div className="font-bold text-gray-900 dark:text-gray-100">{l.door_nama ?? "—"}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">{l.controller}</div>
        </div>
      ),
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
            <StatCard label="Users" value={usersQuery.data?.total ?? 0} to="/users" />
            <StatCard label="Controllers" value={controllers.length} to="/controllers" />
            <StatCard label="Doors" value={doorsQuery.data?.length ?? 0} to="/doors" />
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              🔴 Live Transaction
            </h2>
            <span
              className={`text-xs font-medium ${
                connected
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {connected ? "● Live" : "○ Menyambung ulang..."}
            </span>
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            <Table
              columns={columns}
              rows={feed}
              rowKey={(l) => l.id}
              emptyMessage="Belum ada transaksi. Tap kartu di controller untuk lihat di sini secara real-time."
            />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Status Controller ({onlineCount} Online / {offlineCount} Offline)
          </h2>
          <div className="space-y-3">
            {controllers.map((controller) => (
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
                    className={`font-semibold ${
                      controller.is_online
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {controller.is_online ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
