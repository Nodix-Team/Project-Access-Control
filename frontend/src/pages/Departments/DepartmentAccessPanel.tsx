import { useEffect, useState } from "react";
import type { ApiDepartment } from "../../api/departments";
import type { Controller, Door } from "../../types";

export default function DepartmentAccessPanel({
  department,
  controllers,
  doors,
  onSaveInfo,
  onSaveAccess,
  onSyncAll,
}: {
  department: ApiDepartment | null;
  controllers: Controller[];
  doors: Door[];
  onSaveInfo: (nama: string, deskripsi: string) => void;
  onSaveAccess: (doorIds: number[]) => void;
  onSyncAll: () => void;
}) {
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [selectedDoorIds, setSelectedDoorIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setNama(department?.nama ?? "");
    setDeskripsi(department?.deskripsi ?? "");
    setSelectedDoorIds(new Set(department?.door_ids ?? []));
  }, [department]);

  if (!department) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400 dark:border-gray-600 dark:text-gray-500">
        Pilih "Manage" pada salah satu department di tabel untuk kelola aksesnya di sini.
      </div>
    );
  }

  function toggleDoor(doorId: number) {
    setSelectedDoorIds((prev) => {
      const next = new Set(prev);
      if (next.has(doorId)) next.delete(doorId);
      else next.add(doorId);
      return next;
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Access Department
        </h2>
        <button
          onClick={onSyncAll}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          🔄 Sync All
        </button>
      </div>

      <div className="mb-4 space-y-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Nama Department
          </label>
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            onBlur={() => onSaveInfo(nama.trim(), deskripsi.trim())}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Deskripsi
          </label>
          <input
            type="text"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            onBlur={() => onSaveInfo(nama.trim(), deskripsi.trim())}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
        Default Akses Pintu
      </p>
      <div className="space-y-3">
        {controllers.map((controller) => {
          const controllerDoors = doors
            .filter((d) => d.controller_id === controller.id)
            .sort((a, b) => a.door_number - b.door_number);
          return (
            <div key={controller.id}>
              <p className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {controller.nama} — {controller.device_id}
              </p>
              {controllerDoors.map((door) => (
                <label
                  key={door.id}
                  className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedDoorIds.has(door.id)}
                    onChange={() => toggleDoor(door.id)}
                  />
                  Pintu {door.door_number} — {door.nama}
                </label>
              ))}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => onSaveAccess(Array.from(selectedDoorIds))}
        className="mt-4 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        💾 Simpan Akses
      </button>
    </div>
  );
}
