import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useControllers, useSyncController } from "../../api/controllers";
import { useDepartments } from "../../api/departments";
import { useDoors } from "../../api/doors";
import { useUpdateUser, useUser } from "../../api/users";
import { useUiStore } from "../../store/uiStore";
import { accessToDoorIds } from "../../utils/access";

export default function UserDetail() {
  const { id } = useParams();
  const uid = Number(id);

  const userQuery = useUser(uid);
  const controllersQuery = useControllers();
  const doorsQuery = useDoors();
  const departmentsQuery = useDepartments();
  const updateUser = useUpdateUser(uid);
  const syncController = useSyncController();

  const accessMode = useUiStore((state) => state.userDetailAccessMode);
  const setAccessMode = useUiStore((state) => state.setUserDetailAccessMode);

  const [customDoorIds, setCustomDoorIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const user = userQuery.data;
  const controllers = controllersQuery.data ?? [];
  const doors = doorsQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];

  const ready =
    userQuery.isSuccess && controllersQuery.isSuccess && doorsQuery.isSuccess && departmentsQuery.isSuccess;

  // Set ulang mode & seed checkbox custom tiap kali user yang dibuka (atau datanya) berganti.
  useEffect(() => {
    if (!ready || !user) return;
    setAccessMode(user.is_custom_access ? "custom" : "department");
    const seed = user.is_custom_access ? accessToDoorIds(user.access, controllers, doors) : [];
    setCustomDoorIds(new Set(seed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user]);

  const department = departments.find((d) => d.id === user?.department_id);
  const deptDoorIds = useMemo(() => new Set(department?.door_ids ?? []), [department]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  if (userQuery.isLoading || !ready) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">Memuat...</p>;
  }
  if (userQuery.isError || !user) {
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

  async function handleSaveSync() {
    const isCustom = accessMode === "custom";
    updateUser.mutate(
      { is_custom_access: isCustom, door_ids: isCustom ? Array.from(customDoorIds) : [] },
      {
        onSuccess: async () => {
          const results = await Promise.allSettled(
            controllers.map((c) => syncController.mutateAsync(c.id)),
          );
          const brokerOffline = results.some(
            (r) => r.status === "rejected" && isAxiosError(r.reason) && r.reason.response?.status === 503,
          );
          const failed = results.filter(
            (r) => r.status === "rejected" || (r.status === "fulfilled" && r.value.status !== "OK"),
          ).length;

          if (brokerOffline) {
            showToast("Tersimpan. Sync belum aktif (broker MQTT offline).");
          } else if (failed > 0) {
            showToast(`Tersimpan. ${failed} controller gagal sync (TIMEOUT/MISMATCH).`);
          } else {
            showToast("Tersimpan & tersinkron ke semua controller.");
          }
        },
        onError: (err) => {
          const detail = isAxiosError(err) ? err.response?.data?.detail : undefined;
          showToast(detail ?? "Gagal menyimpan akses");
        },
      },
    );
  }

  const deptName = department?.nama ?? "—";
  const isChecked = (doorId: number) =>
    accessMode === "department" ? deptDoorIds.has(doorId) : customDoorIds.has(doorId);
  const saving = updateUser.isPending || syncController.isPending;

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
            disabled={saving}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "💾 Simpan & Sync ke Controller"}
          </button>
        </div>

        {/* Sisi kanan: Log Aktivitas — dikawal Prompt B7 (GET /api/logs belum wired sampai saat itu) */}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">📜 Log Aktivitas</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Log aktivitas kartu ini akan tampil di sini setelah Prompt B7 (Access Logs) selesai
            diwire ke <span className="font-mono">GET /api/logs</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
