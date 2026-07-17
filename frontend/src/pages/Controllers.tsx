import { controllers } from "../mock/data";

// Placeholder - badge online/offline, panel config, full sync dikerjakan di Prompt A6.
export default function Controllers() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Controller Management</h1>
      <p className="text-sm text-gray-400">
        {controllers.length} controller tersedia — panel config segera hadir (Prompt A6).
      </p>
    </div>
  );
}
