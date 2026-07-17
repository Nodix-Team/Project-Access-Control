export default function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-2 h-6 w-12 rounded bg-gray-300 dark:bg-gray-600" />
    </div>
  );
}
