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
import { formatDateTime } from "../../utils/format";
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
    return <p className="text-sm text-gray-400 dark:text-gray-500">User tidak ditemukan.</p>;
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

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{user.nama}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Kartu: <span className="font-mono">{user.kartu}</span> · Department: {deptName} ·
          Sumber akses: {accessMode === "department" ? "Ikut Department" : "Custom"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Sisi kiri: User Access */}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">📋 User Access</h2>

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
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {controller.nama} — {controller.device_id}
                  </h3>
                  <div className="space-y-1">
                    {controllerDoors.map((door) => (
                      <label
                        key={door.id}
                        className={`flex items-center gap-2 text-sm ${
                          accessMode === "department"
                            ? "text-gray-400 dark:text-gray-500"
                            : "text-gray-800 dark:text-gray-200"
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

        {/* Sisi kanan: Log Aktivitas */}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">📜 Log Aktivitas</h2>
          <div className="space-y-1">
            {userLogs.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Belum ada log aktivitas untuk kartu ini.
              </p>
            )}
            {userLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-md border border-gray-100 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300">
                  {formatDateTime(log.server_ts)} · {log.door_nama}
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={log.result === "GRANTED" ? "green" : "red"}>{log.result}</Badge>
                  {log.is_replayed && <Badge tone="yellow">REPLAYED</Badge>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
