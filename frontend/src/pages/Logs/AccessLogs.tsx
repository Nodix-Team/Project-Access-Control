import { useMemo, useState } from "react";
import Badge from "../../components/Badge";
import Table, { type Column } from "../../components/Table";
import TableSkeleton from "../../components/TableSkeleton";
import { useAccessLogs, type ApiAccessLog } from "../../api/logs";
import { useControllers } from "../../api/controllers";
import { useDoors } from "../../api/doors";
import { useUiStore } from "../../store/uiStore";
import { formatDateTime } from "../../utils/format";
import { toCsv } from "../../utils/csv";

const PAGE_SIZE = 20;

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Preset rentang cepat, biar gampang export CSV rentang tertentu (mis. "2 hari terakhir")
// tanpa harus set tanggal manual satu-satu.
const RANGE_PRESETS: { label: string; days: number }[] = [
  { label: "Hari ini", days: 0 },
  { label: "2 hari terakhir", days: 1 },
  { label: "7 hari terakhir", days: 6 },
  { label: "30 hari terakhir", days: 29 },
];

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
  const [page, setPage] = useState(1);
  const filter = useUiStore((state) => state.logsFilter);
  const setLogsFilter = useUiStore((state) => state.setLogsFilter);

  const controllersQuery = useControllers();
  const doorsQuery = useDoors();
  const controllers = controllersQuery.data ?? [];
  const doors = doorsQuery.data ?? [];

  const availableDoors = useMemo(
    () => (filter.controllerId ? doors.filter((d) => d.controller_id === filter.controllerId) : doors),
    [filter.controllerId, doors],
  );

  const logsQuery = useAccessLogs({
    kartu: filter.kartu || undefined,
    controller_id: filter.controllerId ?? undefined,
    door_id: filter.doorId ?? undefined,
    result: filter.result !== "ALL" ? filter.result : undefined,
    date_from: filter.dateFrom ? `${filter.dateFrom}T00:00:00` : undefined,
    date_to: filter.dateTo ? `${filter.dateTo}T23:59:59` : undefined,
    is_replayed: filter.replayedOnly ? true : undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const logs = logsQuery.data?.items ?? [];
  const total = logsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function updateFilter(patch: Parameters<typeof setLogsFilter>[0]) {
    setLogsFilter(patch);
    setPage(1);
  }

  function handleExport() {
    // Export = data terfilter yang SEDANG tampil di tabel (halaman aktif), bukan seluruh histori.
    downloadCsv(toCsv(logs), `access_logs_${Date.now()}.csv`);
  }

  function applyRangePreset(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    updateFilter({ dateFrom: toDateInputValue(from), dateTo: toDateInputValue(to) });
  }

  const columns: Column<ApiAccessLog>[] = [
    { header: "Waktu", render: (l) => formatDateTime(l.server_ts) },
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
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Logs</h1>
        <button
          onClick={handleExport}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Rentang cepat:
        </span>
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => applyRangePreset(preset.days)}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {preset.label}
          </button>
        ))}
        {(filter.dateFrom || filter.dateTo) && (
          <button
            onClick={() => updateFilter({ dateFrom: null, dateTo: null })}
            className="text-xs text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
          >
            ✕ Reset rentang
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Cari kartu..."
          value={filter.kartu}
          onChange={(e) => updateFilter({ kartu: e.target.value })}
          className="w-48 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />

        <select
          value={filter.controllerId ?? ""}
          onChange={(e) =>
            updateFilter({
              controllerId: e.target.value ? Number(e.target.value) : null,
              doorId: null,
            })
          }
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
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
          onChange={(e) => updateFilter({ doorId: e.target.value ? Number(e.target.value) : null })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
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
          onChange={(e) => updateFilter({ result: e.target.value as "ALL" | "GRANTED" | "DENIED" })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="ALL">Semua Result</option>
          <option value="GRANTED">GRANTED</option>
          <option value="DENIED">DENIED</option>
        </select>

        <input
          type="date"
          value={filter.dateFrom ?? ""}
          onChange={(e) => updateFilter({ dateFrom: e.target.value || null })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
        <span className="self-center text-sm text-gray-400 dark:text-gray-500">s/d</span>
        <input
          type="date"
          value={filter.dateTo ?? ""}
          onChange={(e) => updateFilter({ dateTo: e.target.value || null })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />

        <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={filter.replayedOnly}
            onChange={(e) => updateFilter({ replayedOnly: e.target.checked })}
          />
          Hanya REPLAYED
        </label>
      </div>

      {logsQuery.isLoading ? (
        <TableSkeleton cols={7} />
      ) : (
        <>
          <Table
            columns={columns}
            rows={logs}
            rowKey={(l) => l.id}
            emptyMessage="Tidak ada log yang cocok dengan filter."
          />
          <div className="mt-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>
              Menampilkan {logs.length} dari {total} log
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-gray-300 px-2 py-1 disabled:opacity-40 dark:border-gray-600"
              >
                ← Prev
              </button>
              <span>
                Halaman {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-gray-300 px-2 py-1 disabled:opacity-40 dark:border-gray-600"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
