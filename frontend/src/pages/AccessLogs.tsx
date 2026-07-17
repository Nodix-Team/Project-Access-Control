import { accessLogs } from "../mock/data";

// Placeholder - filter, badge REPLAYED, export CSV dikerjakan di Prompt A8.
export default function AccessLogs() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Access Logs</h1>
      <p className="text-sm text-gray-400">
        {accessLogs.length} log tersedia di data dummy — tabel & filter segera hadir (Prompt A8).
      </p>
    </div>
  );
}
