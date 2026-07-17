import { useState } from "react";
import Table, { type Column } from "../../components/Table";
import TableSkeleton from "../../components/TableSkeleton";
import { useControllers } from "../../api/controllers";
import { useDeleteDoor, useDoors } from "../../api/doors";
import type { Door } from "../../types";
import DoorModal from "./DoorModal";

export default function Doors() {
  const doorsQuery = useDoors();
  const controllersQuery = useControllers();
  const deleteDoor = useDeleteDoor();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Door | null>(null);

  const doors = doorsQuery.data ?? [];
  const controllers = controllersQuery.data ?? [];

  function openAddModal() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEditModal(door: Door) {
    setEditing(door);
    setModalOpen(true);
  }

  function handleDelete(id: number) {
    if (!confirm("Hapus pintu ini?")) return;
    deleteDoor.mutate(id);
  }

  const columns: Column<Door>[] = [
    {
      header: "Controller",
      render: (d) => controllers.find((c) => c.id === d.controller_id)?.nama ?? "—",
    },
    { header: "Nomor Pintu (lokal)", render: (d) => d.door_number },
    { header: "Nama", render: (d) => d.nama },
    { header: "Lokasi", render: (d) => d.lokasi },
    {
      header: "Aksi",
      render: (d) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEditModal(d)}
            className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
          >
            ✏️
          </button>
          <button
            onClick={() => handleDelete(d.id)}
            className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
          >
            🗑️
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Door Management
        </h1>
        <button
          onClick={openAddModal}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Tambah Pintu
        </button>
      </div>

      {doorsQuery.isLoading ? (
        <TableSkeleton cols={5} />
      ) : (
        <Table
          columns={columns}
          rows={[...doors].sort(
            (a, b) => a.controller_id - b.controller_id || a.door_number - b.door_number,
          )}
          rowKey={(d) => d.id}
          emptyMessage="Belum ada pintu."
        />
      )}

      <DoorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setModalOpen(false)}
        initial={editing}
        controllers={controllers}
      />
    </div>
  );
}
