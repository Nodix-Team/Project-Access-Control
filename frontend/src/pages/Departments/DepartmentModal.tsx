import { type FormEvent, useEffect, useState } from "react";
import Modal from "../../components/Modal";
import { controllers, doors } from "../../mock/data";
import type { Department } from "../../types";

export interface DepartmentFormResult {
  nama: string;
  deskripsi: string;
  doorIds: number[];
}

export default function DepartmentModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (result: DepartmentFormResult) => void;
  initial?: { department: Department; doorIds: number[] } | null;
}) {
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [doorIds, setDoorIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) return;
    setNama(initial?.department.nama ?? "");
    setDeskripsi(initial?.department.deskripsi ?? "");
    setDoorIds(new Set(initial?.doorIds ?? []));
  }, [open, initial]);

  function toggleDoor(doorId: number) {
    setDoorIds((prev) => {
      const next = new Set(prev);
      if (next.has(doorId)) next.delete(doorId);
      else next.add(doorId);
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nama.trim()) return;
    onSave({ nama: nama.trim(), deskripsi: deskripsi.trim(), doorIds: Array.from(doorIds) });
  }

  return (
    <Modal open={open} title={initial ? "Edit Department" : "Tambah Department"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="dept-nama">
            Nama
          </label>
          <input
            id="dept-nama"
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="dept-desc">
            Deskripsi
          </label>
          <input
            id="dept-desc"
            type="text"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Default Akses Pintu
          </span>
          <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border border-gray-200 p-3">
            {controllers.map((controller) => {
              const controllerDoors = doors
                .filter((d) => d.controller_id === controller.id)
                .sort((a, b) => a.door_number - b.door_number);
              return (
                <div key={controller.id}>
                  <p className="mb-1 text-xs font-semibold text-gray-500">
                    {controller.nama} — {controller.device_id}
                  </p>
                  {controllerDoors.map((door) => (
                    <label key={door.id} className="flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={doorIds.has(door.id)}
                        onChange={() => toggleDoor(door.id)}
                      />
                      Pintu {door.door_number} — {door.nama}
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Simpan
        </button>
      </form>
    </Modal>
  );
}
