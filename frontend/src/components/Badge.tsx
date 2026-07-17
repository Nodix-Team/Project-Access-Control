type BadgeTone = "green" | "red" | "gray" | "yellow" | "blue";

const toneClasses: Record<BadgeTone, string> = {
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  gray: "bg-gray-100 text-gray-700",
  yellow: "bg-yellow-100 text-yellow-800",
  blue: "bg-blue-100 text-blue-800",
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
