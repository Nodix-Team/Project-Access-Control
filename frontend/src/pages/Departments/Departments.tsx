import { useState } from "react";
import Table, { type Column } from "../../components/Table";
import TableSkeleton from "../../components/TableSkeleton";
import Toast from "../../components/Toast";
import { useToast } from "../../hooks/useToast";
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useUpdateDepartment,
  type ApiDepartment,
} from "../../api/departments";
import { useControllers, useSyncController } from "../../api/controllers";
import { useDoors } from "../../api/doors";
import { useUiStore } from "../../store/uiStore";
import DepartmentAccessPanel from "./DepartmentAccessPanel";
import DepartmentModal, { type DepartmentFormResult } from "./DepartmentModal";

export default function Departments() {
  const departmentsQuery = useDepartments();
  const controllersQuery = useControllers();
  const doorsQuery = useDoors();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const syncController = useSyncController();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const { toastMessage, showToast } = useToast();

  const selectedId = useUiStore((state) => state.selectedDepartmentId);
  const setSelectedId = useUiStore((state) => state.setSelectedDepartmentId);

  const departments = departmentsQuery.data ?? [];
  const doors = doorsQuery.data ?? [];
  const controllers = controllersQuery.data ?? [];
  const selectedDept = departments.find((d) => d.id === selectedId) ?? null;

  function handleAdd(result: DepartmentFormResult) {
    createDepartment.mutate(
      { nama: result.nama, deskripsi: result.deskripsi || null },
      { onSuccess: () => setAddModalOpen(false) },
    );
  }

  function handleDelete(id: number) {
    if (!confirm("Hapus department ini?")) return;
    deleteDepartment.mutate(id, {
      onSuccess: () => {
        if (selectedId === id) setSelectedId(null);
      },
    });
  }

  function handleSaveInfo(nama: string, deskripsi: string) {
    if (!selectedDept || !nama) return;
    updateDepartment.mutate({
      id: selectedDept.id,
      payload: { nama, deskripsi: deskripsi || null, door_ids: selectedDept.door_ids },
    });
  }

  function handleSaveAccess(doorIds: number[]) {
    if (!selectedDept) return;
    updateDepartment.mutate(
      {
        id: selectedDept.id,
        payload: { nama: selectedDept.nama, deskripsi: selectedDept.deskripsi, door_ids: doorIds },
      },
      { onSuccess: () => showToast("Akses department tersimpan") },
    );
  }

  async function handleSyncAll() {
    if (!selectedDept) return;
    const controllerIds = [
      ...new Set(
        doors.filter((d) => selectedDept.door_ids.includes(d.id)).map((d) => d.controller_id),
      ),
    ];
    if (controllerIds.length === 0) {
      showToast("Tidak ada controller yang relevan (belum ada akses pintu diatur)");
      return;
    }
    const results = await Promise.allSettled(
      controllerIds.map((id) => syncController.mutateAsync(id)),
    );
    const failed = results.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && r.value.status !== "OK"),
    ).length;
    showToast(
      failed === 0
        ? `Sync berhasil ke ${controllerIds.length} controller`
        : `Sync selesai, ${failed}/${controllerIds.length} controller gagal (offline/timeout)`,
    );
  }

  const columns: Column<ApiDepartment>[] = [
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
                ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300"
                : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
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
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Department Management
        </h1>
        <button
          onClick={() => setAddModalOpen(true)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Tambah Department
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          {departmentsQuery.isLoading ? (
            <TableSkeleton cols={3} />
          ) : (
            <Table
              columns={columns}
              rows={departments}
              rowKey={(d) => d.id}
              emptyMessage="Belum ada department."
            />
          )}
        </div>

        <DepartmentAccessPanel
          department={selectedDept}
          controllers={controllers}
          doors={doors}
          onSaveInfo={handleSaveInfo}
          onSaveAccess={handleSaveAccess}
          onSyncAll={handleSyncAll}
        />
      </div>

      <DepartmentModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onSave={handleAdd} />
    </div>
  );
}
