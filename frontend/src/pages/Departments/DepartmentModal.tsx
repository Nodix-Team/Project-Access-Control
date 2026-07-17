import { type FormEvent, useState } from "react";
import Modal from "../../components/Modal";

export interface DepartmentFormResult {
  nama: string;
  deskripsi: string;
}

// Hanya dipakai untuk "+ Tambah Department" (nama + deskripsi). Akses pintu default diatur
// terpisah lewat panel "Access Department" di kanan (DepartmentAccessPanel) setelah department
// dibuat - dept baru selalu mulai tanpa akses pintu (aman default, sesuai revisi @danskiv).
export default function DepartmentModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (result: DepartmentFormResult) => void;
}) {
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");

  function reset() {
    setNama("");
    setDeskripsi("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nama.trim()) return;
    onSave({ nama: nama.trim(), deskripsi: deskripsi.trim() });
    reset();
  }

  return (
    <Modal
      open={open}
      title="Tambah Department"
      onClose={() => {
        reset();
        onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="dept-nama">
            Nama
          </label>
          <input
            id="dept-nama"
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="dept-desc">
            Deskripsi
          </label>
          <input
            id="dept-desc"
            type="text"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Akses pintu default diatur belakangan lewat "Manage" setelah department ini dibuat.
        </p>

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
