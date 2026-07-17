import { useState } from "react";
import Modal from "../../components/Modal";
import { departments, doors } from "../../mock/data";
import { validateUserCsv, type CsvValidUser, type CsvRowError } from "../../utils/csv";

export default function CsvUploadModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (users: CsvValidUser[]) => void;
}) {
  const [result, setResult] = useState<
    { validUsers: CsvValidUser[]; errors: CsvRowError[] } | { fileError: string } | null
  >(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    const parsed = validateUserCsv(content, departments, doors);
    setResult(parsed);

    if (!("fileError" in parsed) && parsed.validUsers.length > 0) {
      onImport(parsed.validUsers);
    }

    event.target.value = "";
  }

  function handleClose() {
    setResult(null);
    onClose();
  }

  return (
    <Modal open={open} title="Upload CSV User" onClose={handleClose}>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Format: <code>kartu,nama,department,doors</code> — kolom <code>doors</code> dipisah{" "}
        <code>|</code>, kosong berarti ikut akses department.
      </p>

      <input
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="mb-4 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-300 dark:file:bg-blue-900/40 dark:file:text-blue-300"
      />

      {result && "fileError" in result && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {result.fileError}
        </div>
      )}

      {result && !("fileError" in result) && (
        <div>
          <div className="mb-2 rounded-md bg-blue-50 p-3 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            {result.validUsers.length} valid, {result.errors.length} ditolak
          </div>

          {result.errors.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-600">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/60">
                  <tr>
                    <th className="px-2 py-1 text-left text-gray-500 dark:text-gray-400">
                      Baris
                    </th>
                    <th className="px-2 py-1 text-left text-gray-500 dark:text-gray-400">
                      Kartu
                    </th>
                    <th className="px-2 py-1 text-left text-gray-500 dark:text-gray-400">
                      Alasan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {result.errors.map((err, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-1 text-gray-700 dark:text-gray-200">{err.row}</td>
                      <td className="px-2 py-1 text-gray-700 dark:text-gray-200">
                        {err.kartu || "-"}
                      </td>
                      <td className="px-2 py-1 text-red-600 dark:text-red-400">{err.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
