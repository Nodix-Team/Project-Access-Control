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
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${
        clickable ? "cursor-pointer transition hover:border-blue-300 hover:shadow-md" : ""
      }`}
    >
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
    </div>
  );
}
