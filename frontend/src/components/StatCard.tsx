import { useNavigate } from "react-router-dom";

export default function StatCard({
  label,
  value,
  hint,
  to,
}: {
  label: string;
  value: string | number;
  hint?: string;
  to?: string;
}) {
  const navigate = useNavigate();
  const clickable = Boolean(to);

  return (
    <div
      onClick={clickable ? () => navigate(to!) : undefined}
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${
        clickable
          ? "cursor-pointer transition hover:border-blue-300 hover:shadow-md dark:hover:border-blue-500"
          : ""
      }`}
    >
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</div>}
    </div>
  );
}
