import { useState } from "react";
import Table, { type Column } from "../../components/Table";
import TableSkeleton from "../../components/TableSkeleton";
import { useSimulatedLoading } from "../../hooks/useSimulatedLoading";
import { controllers, doors as seedDoors } from "../../mock/data";
import type { Door } from "../../types";
import DoorModal, { type DoorFormResult } from "./DoorModal";

export default function Doors() {
  const isLoading = useSimulatedLoading();
  const [doorList, setDoorList] = useState<Door[]>(seedDoors);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Door | null>(null);

  function nextId(): number {
    return doorList.reduce((max, d) => Math.max(max, d.id), 0) + 1;
  }

  function isDuplicate(controllerId: number, doorNumber: number): boolean {
    return doorList.some(
      (d) =>
        d.controller_id === controllerId &&
        d.door_number === doorNumber &&
        d.id !== editing?.id,
    );
  }

  function openAddModal() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEditModal(door: Door) {
    setEditing(door);
    setModalOpen(true);
  }

  function handleSave(result: DoorFormResult) {
    if (editing) {
      setDoorList((prev) =>
        prev.map((d) =>
          d.id === editing.id
            ? {
                ...d,
                controller_id: result.controllerId,
                door_number: result.doorNumber,
                nama: result.nama,
                lokasi: result.lokasi,
              }
            : d,
        ),
      );
    } else {
      const newDoor: Door = {
        id: nextId(),
        controller_id: result.controllerId,
        door_number: result.doorNumber,
        nama: result.nama,
        lokasi: result.lokasi,
      };
      setDoorList((prev) => [...prev, newDoor]);
    }
    setModalOpen(false);
  }

  function handleDelete(id: number) {
    if (!confirm("Hapus pintu ini?")) return;
    setDoorList((prev) => prev.filter((d) => d.id !== id));
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
          <button onClick={() => openEditModal(d)} className="text-gray-500 hover:text-blue-600">
            ✏️
          </button>
          <button onClick={() => handleDelete(d.id)} className="text-gray-500 hover:text-red-600">
            🗑️
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Door Management</h1>
        <button
          onClick={openAddModal}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Tambah Pintu
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : (
        <Table
          columns={columns}
          rows={[...doorList].sort(
            (a, b) => a.controller_id - b.controller_id || a.door_number - b.door_number,
          )}
          rowKey={(d) => d.id}
          emptyMessage="Belum ada pintu."
        />
      )}

      <DoorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editing}
        isDuplicate={isDuplicate}
      />
    </div>
  );
}
