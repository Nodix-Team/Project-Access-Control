import { useMemo } from "react";
import Badge from "../../components/Badge";
import Table, { type Column } from "../../components/Table";
import TableSkeleton from "../../components/TableSkeleton";
import { useSimulatedLoading } from "../../hooks/useSimulatedLoading";
import { accessLogs, controllers, doors } from "../../mock/data";
import { useUiStore } from "../../store/uiStore";
import type { AccessLog } from "../../types";

function toCsv(logs: AccessLog[]): string {
  const header = [
    "id",
    "server_ts",
    "kartu",
    "user_nama",
    "door_nama",
    "controller_id",
    "result",
    "reason",
    "is_replayed",
  ];
  const rows = logs.map((log) =>
    [
      log.id,
      log.server_ts,
      log.kartu,
      log.user_nama ?? "",
      log.door_nama ?? "",
      log.controller_id ?? "",
      log.result,
      log.reason ?? "",
      log.is_replayed,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AccessLogs() {
  const isLoading = useSimulatedLoading();
  const filter = useUiStore((state) => state.logsFilter);
  const setLogsFilter = useUiStore((state) => state.setLogsFilter);

  const availableDoors = useMemo(
    () => (filter.controllerId ? doors.filter((d) => d.controller_id === filter.controllerId) : doors),
    [filter.controllerId],
  );

  const filteredLogs = useMemo(() => {
    return accessLogs
      .filter((log) => {
        if (filter.kartu && !log.kartu.toLowerCase().includes(filter.kartu.toLowerCase())) {
          return false;
        }
        if (filter.controllerId !== null && log.controller_id !== filter.controllerId) {
          return false;
        }
        if (filter.doorId !== null && log.door_id !== filter.doorId) {
          return false;
        }
        if (filter.result !== "ALL" && log.result !== filter.result) {
          return false;
        }
        if (filter.dateFrom && new Date(log.server_ts) < new Date(filter.dateFrom)) {
          return false;
        }
        if (filter.dateTo && new Date(log.server_ts) > new Date(`${filter.dateTo}T23:59:59`)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.server_ts < b.server_ts ? 1 : -1));
  }, [filter]);

  function handleExport() {
    downloadCsv(toCsv(filteredLogs), `access_logs_${Date.now()}.csv`);
  }

  const columns: Column<AccessLog>[] = [
    { header: "Waktu", render: (l) => new Date(l.server_ts).toLocaleString("id-ID") },
    { header: "Nama", render: (l) => l.user_nama ?? "Unknown" },
    { header: "Pintu", render: (l) => l.door_nama ?? "—" },
    {
      header: "Controller",
      render: (l) => controllers.find((c) => c.id === l.controller_id)?.device_id ?? "—",
    },
    {
      header: "Result",
      render: (l) => <Badge tone={l.result === "GRANTED" ? "green" : "red"}>{l.result}</Badge>,
    },
    { header: "Reason", render: (l) => l.reason ?? "—" },
    {
      header: "Replay",
      render: (l) => (l.is_replayed ? <Badge tone="yellow">REPLAYED</Badge> : null),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Access Logs</h1>
        <button
          onClick={handleExport}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Cari kartu..."
          value={filter.kartu}
          onChange={(e) => setLogsFilter({ kartu: e.target.value })}
          className="w-48 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <select
          value={filter.controllerId ?? ""}
          onChange={(e) =>
            setLogsFilter({
              controllerId: e.target.value ? Number(e.target.value) : null,
              doorId: null,
            })
          }
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Semua Controller</option>
          {controllers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.device_id}
            </option>
          ))}
        </select>

        <select
          value={filter.doorId ?? ""}
          onChange={(e) => setLogsFilter({ doorId: e.target.value ? Number(e.target.value) : null })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Semua Pintu</option>
          {availableDoors.map((d) => (
            <option key={d.id} value={d.id}>
              Pintu {d.door_number} — {d.nama}
            </option>
          ))}
        </select>

        <select
          value={filter.result}
          onChange={(e) =>
            setLogsFilter({ result: e.target.value as "ALL" | "GRANTED" | "DENIED" })
          }
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="ALL">Semua Result</option>
          <option value="GRANTED">GRANTED</option>
          <option value="DENIED">DENIED</option>
        </select>

        <input
          type="date"
          value={filter.dateFrom ?? ""}
          onChange={(e) => setLogsFilter({ dateFrom: e.target.value || null })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <span className="self-center text-sm text-gray-400">s/d</span>
        <input
          type="date"
          value={filter.dateTo ?? ""}
          onChange={(e) => setLogsFilter({ dateTo: e.target.value || null })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {isLoading ? (
        <TableSkeleton cols={7} />
      ) : (
        <>
          <Table
            columns={columns}
            rows={filteredLogs}
            rowKey={(l) => l.id}
            emptyMessage="Tidak ada log yang cocok dengan filter."
          />
          <p className="mt-2 text-xs text-gray-400">
            Menampilkan {filteredLogs.length} dari {accessLogs.length} log.
          </p>
        </>
      )}
    </div>
  );
}
