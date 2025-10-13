// src/components/CanvasTimeline.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Scene, SlugLocation, SlugTimeOfDay } from "@/lib/types";

type Props = {
  scenes: Scene[];
  onReorder: (next: Scene[]) => void;
};

const BOX_W = 220;          // scene card width (CSS px)
const BOX_H = 80;           // scene card height
const GAP_X = 24;           // horizontal gap
const PAD = 16;             // canvas padding

export function CanvasTimeline({ scenes, onReorder }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [grabOffsetX, setGrabOffsetX] = useState(0); // cursor offset inside box
  const [ghostX, setGhostX] = useState<number | null>(null); // transient x for the dragged box (CSS px)

  // Sorted by order to define the lane positions
  const sorted = useMemo(() => scenes.slice().sort((a, b) => a.order - b.order), [scenes]);

  // Layout helpers (all in CSS pixels)
  const colX = (idx: number) => PAD + idx * (BOX_W + GAP_X);
  const idxFromX = (x: number) => {
    const i = Math.round((x - PAD) / (BOX_W + GAP_X));
    return clamp(i, 0, Math.max(0, sorted.length - 1));
  };
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  // Canvas sizing + DPR scale
  useEffect(() => {
    const canvas = canvasRef.current!;
    const parent = canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `220px`; // fixed lane height
      canvas.width = Math.max(rect.width, PAD * 2 + sorted.length * (BOX_W + GAP_X)) * dpr;
      canvas.height = 220 * dpr;
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS px
      draw(ctx);
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      // bg
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // timeline baseline
      ctx.strokeStyle = "#e5e5e5";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 140);
      ctx.lineTo(canvas.width, 140);
      ctx.stroke();

      // boxes
      for (let i = 0; i < sorted.length; i++) {
        const s = sorted[i];
        const x = dragId === s.id && ghostX != null ? ghostX : colX(i);
        const y = 80;

        // card
        ctx.fillStyle = s.color || "hsl(200 70% 85%)";
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        roundRect(ctx, x, y, BOX_W, BOX_H, 12);
        ctx.fill();
        ctx.stroke();

        // title
        ctx.fillStyle = "#111827";
        ctx.font = "600 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.textBaseline = "top";
        ctx.fillText(truncate(s.title || "Untitled", 32), x + 12, y + 10);

        // meta row
        ctx.fillStyle = "#6b7280";
        ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        const meta = `#${i + 1}${s.durationMin ? ` • ${s.durationMin}m` : ""}`;
        ctx.fillText(meta, x + 12, y + BOX_H - 24);

        // location icon badge
        drawLocationBadge(ctx, x, y, s.loc ?? "INT");
        // time of day icon badge
        drawTimeOfDayBadge(ctx, x, y, s.tod ?? "DAY");
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [sorted, dragId, ghostX]);

  // Pointer hit test (CSS px)
  const hitTest = (x: number, y: number) => {
    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      const bx = colX(i);
      const by = 80;
      if (x >= bx && x <= bx + BOX_W && y >= by && y <= by + BOX_H) return s.id;
    }
    return null;
  };

  // Overlay events (so we don't fight the canvas)
  useEffect(() => {
    const overlay = overlayRef.current!;

    const onPointerDown = (e: PointerEvent) => {
      const rect = overlay.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const id = hitTest(x, y);
      if (!id) return;
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);

      // compute grab offset inside the box (so we don't jump)
      const idx = sorted.findIndex((s) => s.id === id);
      const bx = colX(idx);
      setGrabOffsetX(x - bx);
      setDragId(id);
      setGhostX(bx); // start at current position
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragId) return;
      const rect = overlay.getBoundingClientRect();
      const x = e.clientX - rect.left;

      // position follows cursor without cumulative deltas
      const newX = x - grabOffsetX;
      setGhostX(newX);

      // live reordering preview (snap to nearest index)
      const targetIdx = idxFromX(newX + BOX_W / 2);
      const currIdx = sorted.findIndex((s) => s.id === dragId);
      if (targetIdx !== currIdx) {
        const next = sorted.slice();
        const [moved] = next.splice(currIdx, 1);
        next.splice(targetIdx, 0, moved);
        // write back orders but do not commit to props directly; call onReorder
        onReorder(next.map((s, i) => ({ ...s, order: i })));
      }
    };

    const endDrag = (e: PointerEvent) => {
      if (!dragId) return;
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      setDragId(null);
      setGhostX(null);
    };

    overlay.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      overlay.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [sorted, dragId, grabOffsetX, onReorder]);

  return (
    <div className="relative w-full">
      <canvas ref={canvasRef} className="w-full block rounded-2xl border" />
      <div ref={overlayRef} className="absolute inset-0" />
    </div>
  );
}

// ---------- helpers ----------
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
// draw a small badge with an emoji icon for INT/EXT
function drawLocationBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loc: SlugLocation //"INT" | "EXT"
) {
  const badgeW = 32;
  const badgeH = 32;
  const pad = 8;
  const bx = x + BOX_W - badgeW - pad; // top-right inside the card
  const by = y + pad;

  // background
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  roundRect(ctx, bx, by, badgeW, badgeH, 4);
  ctx.fill();
  ctx.stroke();

  // icon
  const icon = loc === "EXT" ? "🌲" : "🏠";
  ctx.font = "16px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(icon, bx + 6, by + badgeH / 2);
}

// draw a small badge with an emoji icon for DAY/NIGHT
function drawTimeOfDayBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tod: SlugTimeOfDay
) {
  const badgeW = 32;
  const badgeH = 32;
  const pad = 8;
  const bx = x + BOX_W - badgeW - pad; // top-right inside the card
  const by = y + BOX_H - badgeH - pad;

  // background
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  roundRect(ctx, bx, by, badgeW, badgeH, 4);
  ctx.fill();
  ctx.stroke();

  // icon
  const icon = tod === "DAY" ? "🌞" : "🌙";
  ctx.font = "16px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(icon, bx + 6, by + badgeH / 2);
}
