import { useState } from "react";
import Badge from "../../components/Badge";
import Table, { type Column } from "../../components/Table";
import Toast from "../../components/Toast";
import { useToast } from "../../hooks/useToast";
import { controllers as seedControllers } from "../../mock/data";
import { isControllerOnline } from "../../utils/controllerStatus";
import type { Controller } from "../../types";
import ControllerConfigModal, { type ControllerConfigResult } from "./ControllerConfigModal";

export default function Controllers() {
  const [controllerList, setControllerList] = useState<Controller[]>(seedControllers);
  const [editing, setEditing] = useState<Controller | null>(null);
  const { toastMessage, showToast } = useToast();

  function handleSaveConfig(result: ControllerConfigResult) {
    if (!editing) return;
    setControllerList((prev) =>
      prev.map((c) =>
        c.id === editing.id
          ? {
              ...c,
              heartbeat_s: result.heartbeat_s,
              wifi_ssid: result.wifi_ssid,
              ip_mode: result.ip_mode,
              ip_address: result.ip_mode === "static" ? result.ip_address : null,
              mqtt_broker: result.mqtt_broker,
              updated_at: new Date().toISOString(),
            }
          : c,
      ),
    );
    setEditing(null);
    showToast("Config tersimpan (mock)");
  }

  function handleFullSync(controller: Controller) {
    showToast(`Full Sync ${controller.device_id} dimulai (mock)`);
  }

  const columns: Column<Controller>[] = [
    { header: "Device ID", render: (c) => <span className="font-mono">{c.device_id}</span> },
    { header: "Nama", render: (c) => c.nama },
    { header: "Lokasi", render: (c) => c.lokasi },
    {
      header: "Status",
      render: (c) =>
        isControllerOnline(c) ? (
          <Badge tone="green">Online</Badge>
        ) : (
          <Badge tone="red">Offline</Badge>
        ),
    },
    {
      header: "Aksi",
      render: (c) => (
        <div className="flex gap-2">
          <button onClick={() => setEditing(c)} className="text-gray-500 hover:text-blue-600">
            ⚙️ Config
          </button>
          <button
            onClick={() => handleFullSync(c)}
            className="text-gray-500 hover:text-green-600"
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

      <h1 className="mb-4 text-xl font-semibold text-gray-900">Controller Management</h1>

      <Table
        columns={columns}
        rows={controllerList}
        rowKey={(c) => c.id}
        emptyMessage="Belum ada controller."
      />

      <ControllerConfigModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSave={handleSaveConfig}
        controller={editing}
      />
    </div>
  );
}
