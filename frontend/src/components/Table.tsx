export interface Column<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

export default function Table<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "Tidak ada data.",
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400 dark:border-gray-600 dark:text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/60">
          <tr>
            {columns.map((col) => (
              <th
                key={col.header}
                className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={`px-4 py-2 text-gray-700 dark:text-gray-200 ${col.className ?? ""}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
