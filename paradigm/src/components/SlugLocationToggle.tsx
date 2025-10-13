// src/components/SlugLocationToggle.tsx
import { useState } from "react";
import { Home, TreePine } from "lucide-react";
import type { SlugLocation } from "@/lib/types";

export function SlugLocationToggle({
  value,
  onChange,
}: {
  value: SlugLocation | undefined;
  onChange: (loc: SlugLocation) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const current = value ?? "INT";
  const next = current === "INT" ? "EXT" : "INT";

  const icon = hovered
    ? next === "INT"
      ? <Home className="h-4 w-4" />
      : <TreePine className="h-4 w-4" />
    : current === "INT"
      ? <Home className="h-4 w-4" />
      : <TreePine className="h-4 w-4" />;

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