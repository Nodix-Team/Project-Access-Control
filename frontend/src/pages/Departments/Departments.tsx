import { useState } from "react";
import Table, { type Column } from "../../components/Table";
import TableSkeleton from "../../components/TableSkeleton";
import Toast from "../../components/Toast";
import { useSimulatedLoading } from "../../hooks/useSimulatedLoading";
import { useToast } from "../../hooks/useToast";
import { departmentAccess as seedDepartmentAccess, departments as seedDepartments } from "../../mock/data";
import { useUiStore } from "../../store/uiStore";
import type { Department } from "../../types";
import DepartmentAccessPanel from "./DepartmentAccessPanel";
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
  const [addModalOpen, setAddModalOpen] = useState(false);
  const { toastMessage, showToast } = useToast();

  const selectedId = useUiStore((state) => state.selectedDepartmentId);
  const setSelectedId = useUiStore((state) => state.setSelectedDepartmentId);
  const selectedDept = departmentList.find((d) => d.id === selectedId) ?? null;

  function nextId(): number {
    return departmentList.reduce((max, d) => Math.max(max, d.id), 0) + 1;
  }

  function handleAdd(result: DepartmentFormResult) {
    const id = nextId();
    const newDept: Department = {
      id,
      nama: result.nama,
      deskripsi: result.deskripsi || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setDepartmentList((prev) => [...prev, newDept]);
    setAccessMap((prev) => ({ ...prev, [id]: [] }));
    setAddModalOpen(false);
  }

  function handleDelete(id: number) {
    if (!confirm("Hapus department ini?")) return;
    setDepartmentList((prev) => prev.filter((d) => d.id !== id));
    setAccessMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (selectedId === id) setSelectedId(null);
  }

  function handleSaveInfo(nama: string, deskripsi: string) {
    if (!selectedId || !nama) return;
    setDepartmentList((prev) =>
      prev.map((d) =>
        d.id === selectedId ? { ...d, nama, deskripsi: deskripsi || null, updated_at: new Date().toISOString() } : d,
      ),
    );
  }

  function handleSaveAccess(doorIds: number[]) {
    if (!selectedId) return;
    setAccessMap((prev) => ({ ...prev, [selectedId]: doorIds }));
    showToast("Akses department tersimpan (mock)");
  }

  function handleSyncAll() {
    if (!selectedDept) return;
    showToast(`Sync semua user di ${selectedDept.nama} (mock)`);
  }

  const columns: Column<Department>[] = [
    { header: "Nama", render: (d) => d.nama },
    { header: "Deskripsi", render: (d) => d.deskripsi ?? "—" },
    {
      header: "",
      render: (d) => (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedId(d.id)}
            className={`rounded-md border px-2 py-1 text-xs font-medium ${
              selectedId === d.id
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Manage
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
      <Toast message={toastMessage} />

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Department Management</h1>
        <button
          onClick={() => setAddModalOpen(true)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Tambah Department
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          {isLoading ? (
            <TableSkeleton cols={3} />
          ) : (
            <Table
              columns={columns}
              rows={departmentList}
              rowKey={(d) => d.id}
              emptyMessage="Belum ada department."
            />
          )}
        </div>

        <DepartmentAccessPanel
          department={selectedDept}
          doorIds={selectedId ? (accessMap[selectedId] ?? []) : []}
          onSaveInfo={handleSaveInfo}
          onSaveAccess={handleSaveAccess}
          onSyncAll={handleSyncAll}
        />
      </div>

      <DepartmentModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onSave={handleAdd} />
    </div>
  );
}
