import { doors } from "../mock/data";

// Placeholder - CRUD + validasi keunikan (controller_id, door_number) dikerjakan di Prompt A7.
export default function Doors() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Door Management</h1>
      <p className="text-sm text-gray-400">
        {doors.length} pintu tersedia — CRUD lengkap segera hadir (Prompt A7).
      </p>
    </div>
  );
}
