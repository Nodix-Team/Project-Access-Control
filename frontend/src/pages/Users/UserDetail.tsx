import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Badge from "../../components/Badge";
import {
  accessLogs,
  controllers,
  departmentAccess,
  departments,
  doors,
  users,
} from "../../mock/data";
import { useUiStore } from "../../store/uiStore";
import type { Door } from "../../types";

function departmentDoorIds(departmentId: number | null): number[] {
  if (departmentId === null) return [];
  return departmentAccess.filter((da) => da.department_id === departmentId).map((da) => da.door_id);
}

// resolved_access (per-controller door_number) -> daftar door_id, buat inisialisasi checkbox custom.
function resolvedAccessToDoorIds(
  resolvedAccess: Record<number, number[]> | undefined,
  allDoors: Door[],
): number[] {
  if (!resolvedAccess) return [];
  const ids: number[] = [];
  for (const [controllerIdStr, doorNumbers] of Object.entries(resolvedAccess)) {
    const controllerId = Number(controllerIdStr);
    for (const doorNumber of doorNumbers) {
      const door = allDoors.find(
        (d) => d.controller_id === controllerId && d.door_number === doorNumber,
      );
      if (door) ids.push(door.id);
    }
  }
  return ids;
}

export default function UserDetail() {
  const { id } = useParams();
  const user = users.find((u) => u.uid === Number(id));

  const activeTab = useUiStore((state) => state.userDetailTab);
  const setActiveTab = useUiStore((state) => state.setUserDetailTab);
  const accessMode = useUiStore((state) => state.userDetailAccessMode);
  const setAccessMode = useUiStore((state) => state.setUserDetailAccessMode);

  const [customDoorIds, setCustomDoorIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  // Set ulang mode & seed checkbox custom tiap kali user yang dibuka berganti.
  useEffect(() => {
    if (!user) return;
    setAccessMode(user.is_custom_access ? "custom" : "department");
    const seed = user.is_custom_access
      ? resolvedAccessToDoorIds(user.resolved_access, doors)
      : departmentDoorIds(user.department_id);
    setCustomDoorIds(new Set(seed));
  }, [user, setAccessMode]);

  const liveDeptDoorIds = useMemo(
    () => new Set(departmentDoorIds(user?.department_id ?? null)),
    [user?.department_id],
  );

  const userLogs = useMemo(
    () => (user ? accessLogs.filter((log) => log.kartu === user.kartu) : []),
    [user],
  );

  if (!user) {
    return <p className="text-sm text-gray-400">User tidak ditemukan.</p>;
  }

  function toggleDoor(doorId: number) {
    if (accessMode !== "custom") return;
    setCustomDoorIds((prev) => {
      const next = new Set(prev);
      if (next.has(doorId)) next.delete(doorId);
      else next.add(doorId);
      return next;
    });
  }

  function handleSaveSync() {
    setToast("Tersimpan (mock)");
    setTimeout(() => setToast(null), 2500);
  }

  const deptName = departments.find((d) => d.id === user.department_id)?.nama ?? "—";
  const isChecked = (doorId: number) =>
    accessMode === "department" ? liveDeptDoorIds.has(doorId) : customDoorIds.has(doorId);

  return (
    <div>
      {toast && (
        <div className="fixed right-6 top-6 z-50 rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">{user.nama}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kartu: <span className="font-mono">{user.kartu}</span> · Department: {deptName} ·
          Sumber akses: {accessMode === "department" ? "Ikut Department" : "Custom"}
        </p>
      </div>

      <div className="mb-4 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("akses")}
          className={`px-3 py-2 text-sm font-medium ${
            activeTab === "akses"
              ? "border-b-2 border-blue-600 text-blue-700"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📋 User Access
        </button>
        <button
          onClick={() => setActiveTab("log")}
          className={`px-3 py-2 text-sm font-medium ${
            activeTab === "log"
              ? "border-b-2 border-blue-600 text-blue-700"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📜 Log Aktivitas
        </button>
      </div>

      {activeTab === "akses" && (
        <div>
          <div className="mb-4 flex items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={accessMode === "department"}
                onChange={() => setAccessMode("department")}
              />
              ● Ikut Department
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={accessMode === "custom"}
                onChange={() => setAccessMode("custom")}
              />
              ○ Custom
            </label>
          </div>

          <div className="space-y-4">
            {controllers.map((controller) => {
              const controllerDoors = doors
                .filter((d) => d.controller_id === controller.id)
                .sort((a, b) => a.door_number - b.door_number);

              return (
                <div
                  key={controller.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">
                    {controller.nama} — {controller.device_id}
                  </h3>
                  <div className="space-y-1">
                    {controllerDoors.map((door) => (
                      <label
                        key={door.id}
                        className={`flex items-center gap-2 text-sm ${
                          accessMode === "department" ? "text-gray-400" : "text-gray-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked(door.id)}
                          disabled={accessMode === "department"}
                          onChange={() => toggleDoor(door.id)}
                        />
                        Pintu {door.door_number} — {door.nama}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSaveSync}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            💾 Simpan & Sync ke Controller
          </button>
        </div>
      )}

      {activeTab === "log" && (
        <div className="space-y-1">
          {userLogs.length === 0 && (
            <p className="text-sm text-gray-400">Belum ada log aktivitas untuk kartu ini.</p>
          )}
          {userLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-sm"
            >
              <span>
                {new Date(log.server_ts).toLocaleString("id-ID")} · {log.door_nama}
              </span>
              <span className="flex items-center gap-2">
                <Badge tone={log.result === "GRANTED" ? "green" : "red"}>{log.result}</Badge>
                {log.is_replayed && <Badge tone="yellow">REPLAYED</Badge>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
