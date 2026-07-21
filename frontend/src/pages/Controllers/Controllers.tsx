import { isAxiosError } from "axios";
import { useState } from "react";
import Badge from "../../components/Badge";
import Table, { type Column } from "../../components/Table";
import TableSkeleton from "../../components/TableSkeleton";
import Toast from "../../components/Toast";
import { useControllers, useSyncController } from "../../api/controllers";
import { useToast } from "../../hooks/useToast";
import type { Controller } from "../../types";
import ControllerConfigModal from "./ControllerConfigModal";

export default function Controllers() {
  const controllersQuery = useControllers();
  const syncController = useSyncController();
  const [editing, setEditing] = useState<Controller | null>(null);
  const { toastMessage, showToast } = useToast();

  const controllers = controllersQuery.data ?? [];

  function handleSaved() {
    setEditing(null);
    showToast("Config tersimpan");
  }

  function handleFullSync(controller: Controller) {
    syncController.mutate(controller.id, {
      onSuccess: (result) => {
        showToast(
          result.status === "OK"
            ? `Full Sync ${controller.device_id} berhasil (${result.count} user)`
            : `Full Sync ${controller.device_id} gagal (${result.last ?? "SYNC_FAILED"})`,
        );
      },
      onError: (err) => {
        const detail = isAxiosError(err) ? err.response?.data?.detail : undefined;
        showToast(detail ?? `Full Sync ${controller.device_id} gagal`);
      },
    });
  }

  const columns: Column<Controller>[] = [
    { header: "Device ID", render: (c) => <span className="font-mono">{c.device_id}</span> },
    { header: "Nama", render: (c) => c.nama },
    { header: "Lokasi", render: (c) => c.lokasi },
    {
      header: "IP Address",
      render: (c) =>
        c.ip_address ? (
          <div>
            <a
              href={`http://${c.ip_address}:${c.web_port}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-blue-600 hover:underline dark:text-blue-400"
            >
              {c.ip_address}
            </a>
            <div className="text-xs uppercase text-gray-400 dark:text-gray-500">{c.ip_mode}</div>
          </div>
        ) : (
          <div>
            <span className="font-mono text-gray-400 dark:text-gray-500">—</span>
            <div className="text-xs uppercase text-gray-400 dark:text-gray-500">{c.ip_mode}</div>
          </div>
        ),
    },
    {
      header: "Status",
      render: (c) => (c.is_online ? <Badge tone="green">Online</Badge> : <Badge tone="red">Offline</Badge>),
    },
    {
      header: "Aksi",
      render: (c) => (
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(c)}
            className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
          >
            ⚙️ Config
          </button>
          <button
            onClick={() => handleFullSync(c)}
            disabled={syncController.isPending}
            className="text-gray-500 hover:text-green-600 disabled:opacity-40 dark:text-gray-400 dark:hover:text-green-400"
          >
            🔄 Full Sync
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Toast message={toastMessage} />

      <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
        Controller Management
      </h1>

      {controllersQuery.isLoading ? (
        <TableSkeleton cols={6} />
      ) : (
        <Table
          columns={columns}
          rows={controllers}
          rowKey={(c) => c.id}
          emptyMessage="Belum ada controller."
        />
      )}

      <ControllerConfigModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
        controller={editing}
      />
    </div>
  );
}
