// src/components/ProjectBar.tsx (switch/create projects + grouping mode)
// ------------------------------------------------------------
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import type { GroupingMode, Project } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const MODES: GroupingMode[] = ["none", "episodes", "seasons", "seasons-episodes"];

export function ProjectBar({
  projects,
  currentId,
  onSelect,
  onCreate,
  onModeChange,
}: {
  projects: Project[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onCreate: (p: Project) => void;
  onModeChange: (id: string, mode: GroupingMode) => void;
}) {
  const [name, setName] = useState("");
  const current = useMemo(() => projects.find(p => p.id === currentId) || null, [projects, currentId]);

  const create = () => {
    const now = new Date().toISOString();
    const p: Project = {
      id: uuidv4(),
      name: name || `Project ${projects.length + 1}`,
      createdAt: now,
      updatedAt: now,
      grouping: "none"
    };
    onCreate(p);
    setName("");
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="py-3 flex gap-3 items-center flex-wrap">
        <div className="text-sm opacity-70">Project:</div>
        <select className="border rounded-xl h-9 px-2" value={currentId ?? ''} onChange={(e) => onSelect(e.target.value)}>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {current && (
          <select className="border rounded-xl h-9 px-2" value={current.grouping} onChange={(e) => onModeChange(current.id, e.target.value as GroupingMode)}>
            {MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Input placeholder="New project name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-xl w-56" />
          <Button onClick={create} className="rounded-xl h-9">Create</Button>
        </div>
      </CardContent>
    </Card>
  );
}