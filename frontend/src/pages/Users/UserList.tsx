import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../../components/Badge";
import Table, { type Column } from "../../components/Table";
import TableSkeleton from "../../components/TableSkeleton";
import { useDepartments } from "../../api/departments";
import { useCreateUser, useDeleteUser, useUsers, type ApiUser } from "../../api/users";
import { useUiStore } from "../../store/uiStore";
import AddUserModal, { type NewUserInput } from "./AddUserModal";
import CsvUploadModal from "./CsvUploadModal";

const PAGE_SIZE = 10;

export default function UserList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  const { search, departmentId: filterDepartmentId } = useUiStore((state) => state.userListFilter);
  const setUserListFilter = useUiStore((state) => state.setUserListFilter);

  const departmentsQuery = useDepartments();
  const usersQuery = useUsers({
    search: search || undefined,
    department_id: filterDepartmentId ?? undefined,
    page,
    page_size: PAGE_SIZE,
  });
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  const departments = departmentsQuery.data ?? [];
  const users = usersQuery.data?.items ?? [];
  const total = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function departmentName(departmentId: number | null): string {
    if (departmentId === null) return "—";
    return departments.find((d) => d.id === departmentId)?.nama ?? "—";
  }

  function handleAddUser(input: NewUserInput) {
    createUser.mutate(
      { kartu: input.kartu, nama: input.nama, department_id: input.departmentId },
      {
        onSuccess: () => {
          setAddModalOpen(false);
          setPage(1);
        },
      },
    );
  }

  function handleDelete(uid: number) {
    if (!confirm("Hapus user ini?")) return;
    deleteUser.mutate(uid);
  }

  const columns: Column<ApiUser>[] = [
    { header: "#", render: (u) => u.uid },
    {
      header: "Nama",
      render: (u) => (
        <button
          onClick={() => navigate(`/users/${u.uid}`)}
          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {u.nama}
        </button>
      ),
    },
    { header: "Kartu", render: (u) => <span className="font-mono">{u.kartu}</span> },
    { header: "Department", render: (u) => departmentName(u.department_id) },
    {
      header: "Akses",
      render: (u) => (
        <Badge tone={u.is_custom_access ? "yellow" : "blue"}>
          {u.is_custom_access ? "Custom" : "Dept"}
        </Badge>
      ),
    },
    {
      header: "",
      render: (u) => (
        <button
          onClick={() => handleDelete(u.uid)}
          disabled={deleteUser.isPending}
          className="flex items-center gap-1 text-gray-500 hover:text-red-600 disabled:opacity-40"
        >
          🗑️ <span className="text-xs">Hapus</span>
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          User Management
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setCsvModalOpen(true)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            📤 CSV
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Tambah User
          </button>
        </div>
      </div>

      {createUser.isError && (
        <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Gagal menambah user — kartu mungkin sudah terdaftar.
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Cari nama atau kartu..."
          value={search}
          onChange={(e) => {
            setUserListFilter({ search: e.target.value });
            setPage(1);
          }}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
        <select
          value={filterDepartmentId ?? ""}
          onChange={(e) => {
            setUserListFilter({ departmentId: e.target.value ? Number(e.target.value) : null });
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">Semua Department</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.nama}
            </option>
          ))}
        </select>
      </div>

      {usersQuery.isLoading ? (
        <TableSkeleton cols={6} />
      ) : (
        <Table
          columns={columns}
          rows={users}
          rowKey={(u) => u.uid}
          emptyMessage="Tidak ada user yang cocok dengan pencarian/filter."
        />
      )}

      <div className="mt-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
          Menampilkan {users.length} dari {total} user
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

      <AddUserModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddUser}
      />
      <CsvUploadModal open={csvModalOpen} onClose={() => setCsvModalOpen(false)} />
    </div>
  );
}
