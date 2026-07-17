import { type FormEvent, useState } from "react";
import Modal from "../../components/Modal";
import { departments } from "../../mock/data";
import { normalizeKartu } from "../../utils/kartu";

export interface NewUserInput {
  kartu: string;
  nama: string;
  departmentId: number | null;
}

export default function AddUserModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (input: NewUserInput) => void;
}) {
  const [kartu, setKartu] = useState("");
  const [nama, setNama] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");

  function reset() {
    setKartu("");
    setNama("");
    setDepartmentId("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!kartu.trim() || !nama.trim()) return;

    onAdd({
      kartu: normalizeKartu(kartu),
      nama: nama.trim(),
      departmentId: departmentId ? Number(departmentId) : null,
    });
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Tambah User"
      onClose={() => {
        reset();
        onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="add-kartu">
            Kartu
          </label>
          <input
            id="add-kartu"
            type="text"
            value={kartu}
            onChange={(e) => setKartu(e.target.value)}
            placeholder="mis. 123456 atau AABBCCDD"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="add-nama">
            Nama
          </label>
          <input
            id="add-nama"
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="add-dept">
            Department
          </label>
          <select
            id="add-dept"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">— Tanpa department —</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.nama}
              </option>
            ))}
          </select>
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
