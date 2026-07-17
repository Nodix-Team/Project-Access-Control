type BadgeTone = "green" | "red" | "gray" | "yellow" | "blue";

const toneClasses: Record<BadgeTone, string> = {
  green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

export default function Badge({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
