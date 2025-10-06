
// src/components/CanvasTimeline.tsx
// ------------------------------------------------------------
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Scene } from '@/lib/types';

export function CanvasTimeline({ scenes, onReorder }: { scenes: Scene[]; onReorder: (s: Scene[]) => void; }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);

  const rowHeight = 64;
  const padding = 24;
  const boxWidth = 200;
  const boxHeight = 48;
  const gap = 16;

  const positioned = useMemo(() => {
    return [...scenes]
      .sort((a,b)=>a.order-b.order)
      .map((s, i) => ({ s, x: padding + i * (boxWidth + gap), y: padding }));
  }, [scenes]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) { return; }
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(positioned.length * (boxWidth + gap) + padding * 2, 600);
    const height = rowHeight + padding * 2;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d'); if (!ctx) { return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0,0,width,height);

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding + boxHeight + 8);
    ctx.lineTo(width - padding, padding + boxHeight + 8);
    ctx.stroke();

    positioned.forEach((p, i) => {
      const isDragging = dragIdx === i;
      const x = p.x + (isDragging ? offsetX : 0);
      const y = p.y;

      ctx.fillStyle = p.s.color;
      ctx.strokeStyle = '#bbb';
      roundRect(ctx, x, y, boxWidth, boxHeight, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#111';
      ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.textBaseline = 'middle';
      const title = p.s.title || 'Untitled';
      ctx.save();
      ctx.beginPath();
      ctx.rect(x+12, y+8, boxWidth-24, boxHeight-16);
      ctx.clip();
      ctx.fillText(title, x+12, y + boxHeight/2);
      ctx.restore();

      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(x + boxWidth - 14, y + 14, 10, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i+1), x + boxWidth - 14, y + 14);
      ctx.textAlign = 'left';
    });
  }, [positioned, dragIdx, offsetX]);

  const hit = (mx: number, my: number) => {
    for (let i=0;i<positioned.length;i++){
      const p = positioned[i];
      const x = p.x + (dragIdx===i?offsetX:0);
      if (mx>=x && mx<=x+boxWidth && my>=p.y && my<=p.y+boxHeight) return i;
    }
    return -1;
  };

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let startX = 0;

    const onDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const idx = hit(mx, my);
      if (idx>=0){ setDragIdx(idx); startX = mx; }
    };
    const onMove = (e: MouseEvent) => {
      if (dragIdx===null) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      setOffsetX(mx - startX);
    };
    const onUp = () => {
      if (dragIdx===null) return;
      const dx = offsetX;
      const slots = positioned.map((_,i)=> i * (boxWidth + gap));
      const from = dragIdx;
      const fromX = slots[from];
      const toX = Math.max(0, fromX + dx);
      let to = 0; let best = Infinity;
      slots.forEach((sx,i)=>{ const d = Math.abs(sx - toX); if (d < best){ best = d; to = i; } });
      const next = [...scenes].sort((a,b)=>a.order-b.order);
      const [moved] = next.splice(from,1);
      next.splice(to,0,moved);
      const reindexed = next.map((s, i) => ({ ...s, order: i }));
      onReorder(reindexed);
      setDragIdx(null); setOffsetX(0);
    };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragIdx, offsetX, positioned, scenes, onReorder]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Paradigm Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm opacity-70 mb-2">Drag boxes left/right to reorder scenes. Changes are saved automatically.</div>
        <canvas ref={canvasRef} className="w-full rounded-xl shadow-sm border" />
      </CardContent>
    </Card>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width/2, height/2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
