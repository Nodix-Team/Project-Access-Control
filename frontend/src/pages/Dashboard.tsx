import StatCard from "../components/StatCard";
import { controllers, doors, users } from "../mock/data";

// Placeholder - StatCard sudah ambil dari mock/data.ts (bukti wiring jalan), live feed
// simulasi + WebSocket TODO dikerjakan di Prompt A2 / B1.
export default function Dashboard() {
  const online = controllers.filter((c) => c.is_online).length;
  const offline = controllers.length - online;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Users" value={users.length} />
        <StatCard label="Controllers" value={controllers.length} />
        <StatCard label="Doors" value={doors.length} />
        <StatCard label="Status" value={`${online} Online / ${offline} Offline`} />
      </div>
      <p className="mt-6 text-sm text-gray-400">
        🔴 Live Access Feed — segera hadir (Prompt A2).
      </p>
    </div>
  );
}
