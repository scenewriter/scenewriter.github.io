import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function niceTime(iso?: string): string {
  return iso ? new Date(iso).toLocaleString() : "";
}

export function randomPastel(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue} 70% 85%)`;
};
