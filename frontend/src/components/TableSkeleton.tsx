export default function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="animate-pulse divide-y divide-gray-100 bg-white">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <div
                key={colIdx}
                className="h-3 flex-1 rounded bg-gray-200"
                style={{ maxWidth: colIdx === 0 ? "3rem" : undefined }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
