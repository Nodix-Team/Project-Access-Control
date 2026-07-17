import { departments } from "../mock/data";

// Placeholder - CRUD + editor default akses pintu dikerjakan di Prompt A5.
export default function Departments() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Department Management</h1>
      <p className="text-sm text-gray-400">
        {departments.length} department tersedia — CRUD lengkap segera hadir (Prompt A5).
      </p>
    </div>
  );
}
