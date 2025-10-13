// src/components/SlugTimeOfDayToggle.tsx
import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import type { SlugTimeOfDay } from "@/lib/types";

export function SlugTimeOfDayToggle({
  value,
  onChange,
}: {
  value: SlugTimeOfDay | undefined;
  onChange: (loc: SlugTimeOfDay) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const current = value ?? "DAY";
  const next = current === "DAY" ? "NIGHT" : "DAY";

  const icon = hovered
    ? next === "DAY"
      ? <Sun className="h-4 w-4" />
      : <Moon className="h-4 w-4" />
    : current === "DAY"
      ? <Sun className="h-4 w-4" />
      : <Moon className="h-4 w-4" />;

  const label = hovered ? next : current;

  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="px-3 h-9 inline-flex items-center gap-2 rounded-xl border hover:bg-neutral-100 transition-colors"
      title={current}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}