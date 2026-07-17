import { isAxiosError } from "axios";
import { useState } from "react";
import Modal from "../../components/Modal";
import { useUploadUsersCsv, type CsvUploadResponse } from "../../api/users";

// Fase B: TIDAK ada validasi CSV di client sama sekali (beda dari Fase A) - file dikirim mentah,
// backend (process_user_csv) yang jadi satu-satunya sumber kebenaran validasi. Ini sengaja,
// bukan disederhanakan asal - lihat catatan dampak revisi Prompt A9 soal utils/csv.ts.
export default function CsvUploadModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [result, setResult] = useState<CsvUploadResponse | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const uploadCsv = useUploadUsersCsv();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setResult(null);
    setFileError(null);

    uploadCsv.mutate(file, {
      onSuccess: (data) => setResult(data),
      onError: (err) => {
        // Error seluruh file (header salah / nama mengandung koma) -> HTTPException 400 {detail}.
        const detail = isAxiosError(err) ? err.response?.data?.detail : undefined;
        setFileError(detail ?? "Gagal upload CSV");
      },
    });

    event.target.value = "";
  }

  function handleClose() {
    setResult(null);
    setFileError(null);
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
        disabled={uploadCsv.isPending}
        className="mb-4 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-300 dark:file:bg-blue-900/40 dark:file:text-blue-300"
      />

      {uploadCsv.isPending && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Memproses di server...</p>
      )}

      {fileError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {fileError}
        </div>
      )}

      {result && (
        <div>
          <div className="mb-2 rounded-md bg-blue-50 p-3 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            {result.success_count} valid, {result.error_count} ditolak
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
