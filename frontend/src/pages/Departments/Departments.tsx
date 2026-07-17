import { useState } from "react";
import Table, { type Column } from "../../components/Table";
import TableSkeleton from "../../components/TableSkeleton";
import Toast from "../../components/Toast";
import { useSimulatedLoading } from "../../hooks/useSimulatedLoading";
import { useToast } from "../../hooks/useToast";
import { departmentAccess as seedDepartmentAccess, departments as seedDepartments } from "../../mock/data";
import type { Department } from "../../types";
import DepartmentModal, { type DepartmentFormResult } from "./DepartmentModal";

function groupDoorIdsByDept(
  entries: { department_id: number; door_id: number }[],
): Record<number, number[]> {
  const map: Record<number, number[]> = {};
  for (const entry of entries) {
    map[entry.department_id] = map[entry.department_id] ?? [];
    map[entry.department_id].push(entry.door_id);
  }
  return map;
}

export default function Departments() {
  const isLoading = useSimulatedLoading();
  const [departmentList, setDepartmentList] = useState<Department[]>(seedDepartments);
  const [accessMap, setAccessMap] = useState<Record<number, number[]>>(() =>
    groupDoorIdsByDept(seedDepartmentAccess),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const { toastMessage, showToast } = useToast();

  function nextId(): number {
    return departmentList.reduce((max, d) => Math.max(max, d.id), 0) + 1;
  }

  function openAddModal() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEditModal(dept: Department) {
    setEditing(dept);
    setModalOpen(true);
  }

  function handleSave(result: DepartmentFormResult) {
    if (editing) {
      setDepartmentList((prev) =>
        prev.map((d) =>
          d.id === editing.id
            ? { ...d, nama: result.nama, deskripsi: result.deskripsi, updated_at: new Date().toISOString() }
            : d,
        ),
      );
      setAccessMap((prev) => ({ ...prev, [editing.id]: result.doorIds }));
    } else {
      const id = nextId();
      const newDept: Department = {
        id,
        nama: result.nama,
        deskripsi: result.deskripsi || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setDepartmentList((prev) => [...prev, newDept]);
      setAccessMap((prev) => ({ ...prev, [id]: result.doorIds }));
    }
    setModalOpen(false);
  }

  function handleDelete(id: number) {
    if (!confirm("Hapus department ini?")) return;
    setDepartmentList((prev) => prev.filter((d) => d.id !== id));
    setAccessMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleSync(dept: Department) {
    showToast(`Sync semua user di ${dept.nama} (mock)`);
  }

  const columns: Column<Department>[] = [
    { header: "Nama", render: (d) => d.nama },
    { header: "Deskripsi", render: (d) => d.deskripsi ?? "—" },
    { header: "Jumlah Pintu Default", render: (d) => accessMap[d.id]?.length ?? 0 },
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
          <button
            onClick={() => handleSync(d)}
            className="text-gray-500 hover:text-green-600"
            title="Sync semua user di dept ini"
          >
            🔄
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Toast message={toastMessage} />

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Department Management</h1>
        <button
          onClick={openAddModal}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Tambah Department
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : (
        <Table
          columns={columns}
          rows={departmentList}
          rowKey={(d) => d.id}
          emptyMessage="Belum ada department."
        />
      )}

      <DepartmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editing ? { department: editing, doorIds: accessMap[editing.id] ?? [] } : null}
      />
    </div>
  );
}
