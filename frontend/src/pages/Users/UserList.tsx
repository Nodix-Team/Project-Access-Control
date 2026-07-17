import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../../components/Badge";
import Table, { type Column } from "../../components/Table";
import { departmentAccess, departments, doors, users as seedUsers } from "../../mock/data";
import { useUiStore } from "../../store/uiStore";
import type { Department, Door, User } from "../../types";
import AddUserModal, { type NewUserInput } from "./AddUserModal";
import CsvUploadModal from "./CsvUploadModal";
import type { CsvValidUser } from "../../utils/csv";

const PAGE_SIZE = 10;

function doorIdsToResolvedAccess(doorIds: number[], allDoors: Door[]): Record<number, number[]> {
  const byController: Record<number, number[]> = {};
  for (const doorId of doorIds) {
    const door = allDoors.find((d) => d.id === doorId);
    if (!door) continue;
    byController[door.controller_id] = byController[door.controller_id] ?? [];
    byController[door.controller_id].push(door.door_number);
  }
  return byController;
}

function departmentDoorIds(departmentId: number | null): number[] {
  if (departmentId === null) return [];
  return departmentAccess.filter((da) => da.department_id === departmentId).map((da) => da.door_id);
}

function departmentName(departments_: Department[], departmentId: number | null): string {
  if (departmentId === null) return "—";
  return departments_.find((d) => d.id === departmentId)?.nama ?? "—";
}

export default function UserList() {
  const navigate = useNavigate();
  const [userList, setUserList] = useState<User[]>(seedUsers);
  const [page, setPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  const { search, departmentId: filterDepartmentId } = useUiStore((state) => state.userListFilter);
  const setUserListFilter = useUiStore((state) => state.setUserListFilter);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return userList.filter((user) => {
      const matchesSearch =
        term === "" ||
        user.nama.toLowerCase().includes(term) ||
        user.kartu.toLowerCase().includes(term);
      const matchesDept = filterDepartmentId === null || user.department_id === filterDepartmentId;
      return matchesSearch && matchesDept;
    });
  }, [userList, search, filterDepartmentId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function nextUid(): number {
    return userList.reduce((max, u) => Math.max(max, u.uid), 0) + 1;
  }

  function handleAddUser(input: NewUserInput) {
    const newUser: User = {
      uid: nextUid(),
      kartu: input.kartu,
      nama: input.nama,
      department_id: input.departmentId,
      is_custom_access: false,
      resolved_access: doorIdsToResolvedAccess(departmentDoorIds(input.departmentId), doors),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setUserList((prev) => [...prev, newUser]);
    setPage(1);
  }

  function handleCsvImport(imported: CsvValidUser[]) {
    setUserList((prev) => {
      let uidCounter = prev.reduce((max, u) => Math.max(max, u.uid), 0);
      const byKartu = new Map(prev.map((u) => [u.kartu, u]));

      for (const row of imported) {
        const doorIds = row.isCustomAccess ? row.doorIds : departmentDoorIds(row.departmentId);
        const existing = byKartu.get(row.kartu);
        const user: User = {
          uid: existing?.uid ?? ++uidCounter,
          kartu: row.kartu,
          nama: row.nama,
          department_id: row.departmentId,
          is_custom_access: row.isCustomAccess,
          resolved_access: doorIdsToResolvedAccess(doorIds, doors),
          created_at: existing?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        byKartu.set(row.kartu, user);
      }
      return Array.from(byKartu.values());
    });
    setPage(1);
  }

  function handleDelete(uid: number) {
    if (!confirm("Hapus user ini?")) return;
    setUserList((prev) => prev.filter((u) => u.uid !== uid));
  }

  const columns: Column<User>[] = [
    { header: "#", render: (u) => u.uid },
    { header: "Kartu", render: (u) => <span className="font-mono">{u.kartu}</span> },
    { header: "Nama", render: (u) => u.nama },
    { header: "Department", render: (u) => departmentName(departments, u.department_id) },
    {
      header: "Akses",
      render: (u) => (
        <Badge tone={u.is_custom_access ? "yellow" : "blue"}>
          {u.is_custom_access ? "Custom" : "Dept"}
        </Badge>
      ),
    },
    {
      header: "Aksi",
      render: (u) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/users/${u.uid}`)}
            className="text-gray-500 hover:text-blue-600"
            aria-label="Detail"
          >
            👁️
          </button>
          <button
            onClick={() => handleDelete(u.uid)}
            className="text-gray-500 hover:text-red-600"
            aria-label="Hapus"
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
        <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setCsvModalOpen(true)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
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

      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Cari nama atau kartu..."
          value={search}
          onChange={(e) => {
            setUserListFilter({ search: e.target.value });
            setPage(1);
          }}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={filterDepartmentId ?? ""}
          onChange={(e) => {
            setUserListFilter({ departmentId: e.target.value ? Number(e.target.value) : null });
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Semua Department</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.nama}
            </option>
          ))}
        </select>
      </div>

      <Table columns={columns} rows={pageRows} rowKey={(u) => u.uid} emptyMessage="Tidak ada user." />

      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
        <span>
          Menampilkan {pageRows.length} dari {filtered.length} user
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-gray-300 px-2 py-1 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span>
            Halaman {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-gray-300 px-2 py-1 disabled:opacity-40"
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
      <CsvUploadModal
        open={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onImport={handleCsvImport}
      />
    </div>
  );
}
