import { type FormEvent, useEffect, useState } from "react";
import Modal from "../../components/Modal";
import { controllers } from "../../mock/data";
import type { Door } from "../../types";

export interface DoorFormResult {
  controllerId: number;
  doorNumber: number;
  nama: string;
  lokasi: string;
}

export default function DoorModal({
  open,
  onClose,
  onSave,
  initial,
  isDuplicate,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (result: DoorFormResult) => void;
  initial?: Door | null;
  isDuplicate: (controllerId: number, doorNumber: number) => boolean;
}) {
  const [controllerId, setControllerId] = useState<number>(controllers[0]?.id ?? 0);
  const [doorNumber, setDoorNumber] = useState(1);
  const [nama, setNama] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setControllerId(initial?.controller_id ?? controllers[0]?.id ?? 0);
    setDoorNumber(initial?.door_number ?? 1);
    setNama(initial?.nama ?? "");
    setLokasi(initial?.lokasi ?? "");
    setError(null);
  }, [open, initial]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isDuplicate(controllerId, doorNumber)) {
      setError(
        `Controller ini sudah punya pintu nomor ${doorNumber} — nomor pintu harus unik per controller.`,
      );
      return;
    }

    setError(null);
    onSave({ controllerId, doorNumber, nama: nama.trim(), lokasi: lokasi.trim() });
  }

  return (
    <Modal open={open} title={initial ? "Edit Pintu" : "Tambah Pintu"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="door-controller">
            Controller
          </label>
          <select
            id="door-controller"
            value={controllerId}
            onChange={(e) => setControllerId(Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            {controllers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama} — {c.device_id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="door-number">
            Nomor Pintu (lokal)
          </label>
          <input
            id="door-number"
            type="number"
            min={1}
            value={doorNumber}
            onChange={(e) => setDoorNumber(Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="door-nama">
            Nama
          </label>
          <input
            id="door-nama"
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="door-lokasi">
            Lokasi
          </label>
          <input
            id="door-lokasi"
            type="text"
            value={lokasi}
            onChange={(e) => setLokasi(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

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
