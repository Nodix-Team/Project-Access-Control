import { users } from "../mock/data";

// Placeholder - tabel, search, filter, tambah user, upload CSV dikerjakan di Prompt A3.
export default function UserList() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">User Management</h1>
      <p className="text-sm text-gray-400">
        {users.length} user tersedia di data dummy — tabel lengkap segera hadir (Prompt A3).
      </p>
    </div>
  );
}
