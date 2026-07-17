import { useParams } from "react-router-dom";
import { users } from "../mock/data";

// Placeholder - resolusi akses (dept vs custom), checkbox per controller dikerjakan di Prompt A4.
export default function UserDetail() {
  const { id } = useParams();
  const user = users.find((u) => u.uid === Number(id));

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">User Detail</h1>
      <p className="text-sm text-gray-400">
        {user ? `${user.nama} (${user.kartu})` : "User tidak ditemukan"} — detail lengkap
        segera hadir (Prompt A4).
      </p>
    </div>
  );
}
