// src/components/ProjectPanel.tsx
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GroupingMode, Project, Season, Episode } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { Trash2, Plus } from "lucide-react";

const MODES: GroupingMode[] = ["none", "episodes", "seasons-episodes"]; // "seasons", 

export function ProjectPanel({
  open,
  projects,
  currentId,
  seasons,
  episodes,
  onToggle,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onModeChange,
  onAddSeason,
  onAddEpisode,
  onUpdateSeason,
  onUpdateEpisode,
}: {
  open: boolean;
  projects: Project[];
  currentId: string | null;
  seasons: Season[];
  episodes: Episode[];
  onToggle: () => void;
  onSelect: (id: string) => void;
  onCreate: (p: Project) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onModeChange: (id: string, mode: GroupingMode) => void;
  onAddSeason: () => void;
  onAddEpisode: (seasonId?: string | null) => void;
  onUpdateSeason: (id: string, title: string) => void;
  onUpdateEpisode: (id: string, title: string, seasonId?: string | null) => void;
}) {
  const [createName, setCreateName] = useState("");
  const [rename, setRename] = useState<string>("");
  const current = useMemo(
    () => projects.find((p) => p.id === currentId) || null,
    [projects, currentId]
  );
  React.useEffect(() => {
    setRename(current?.name || "");
  }, [currentId]);

  const doCreate = () => {
    const now = new Date().toISOString();
    const p: Project = {
      id: uuidv4(),
      name: createName || `Project ${projects.length + 1}`,
      createdAt: now,
      updatedAt: now,
      grouping: "none",
    };
    onCreate(p);
    setCreateName("");
  };

  return (
    
    <Card className={`rounded-2xl transition-all duration-300 ${open ? "" : ""}`}>
      <CardHeader className="py-3 flex justify-between">
        <div className="flex gap-2">
          <CardTitle className="text-lg">
            {open ? "Project Settings" : `Project: ${current?.name}`}
          </CardTitle>          
        </div>
      </CardHeader>

      {!open ? null : (
        <CardContent className="space-y-6">
          {/* Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm opacity-70">Select Active Project:</div>
            <select
              className="border rounded-xl h-9 px-2"
              value={currentId ?? ""}
              onChange={(e) => onSelect(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rename + Delete */}
          {current && (
            <div className="grid md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <div className="text-sm font-medium mb-1">Project name</div>
                <Input
                  value={rename}
                  onChange={(e) => setRename(e.target.value)}
                  className="rounded-xl"
                  placeholder="New name"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => onRename(current.id, rename)}
                  className="rounded-xl h-9"
                >
                  Save Name
                </Button>
                <Button
                  variant="destructive"
                  className="rounded-xl h-9"
                  onClick={() => onDelete(current.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Grouping mode */}
          {current && (
            <div className="grid md:grid-cols-3 gap-3 items-end">
              <div>
                <div className="text-sm font-medium mb-1">Grouping mode</div>
                <select
                  className="border rounded-xl h-9 px-2 w-full"
                  value={current.grouping}
                  onChange={(e) => onModeChange(current.id, e.target.value as GroupingMode)}
                >
                  {MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Seasons */}
          {current &&
            (current.grouping === "seasons" ||
              current.grouping === "seasons-episodes") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Seasons</div>
                  <Button size="sm" onClick={onAddSeason} className="rounded-xl">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Season
                  </Button>
                </div>
                <div className="space-y-2">
                  {seasons
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((s) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <Input
                          value={s.title}
                          onChange={(e) => onUpdateSeason(s.id, e.target.value)}
                          className="h-8 rounded-xl"
                        />
                        <span className="text-xs opacity-60">#{s.order + 1}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

          {/* Episodes */}
          {current &&
            (current.grouping === "episodes" ||
              current.grouping === "seasons-episodes") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Episodes</div>
                  <Button
                    size="sm"
                    onClick={() => onAddEpisode(undefined)}
                    className="rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Episode
                  </Button>
                </div>
                <div className="space-y-2">
                  {episodes
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((ep) => (
                      <div key={ep.id} className="grid grid-cols-12 gap-2 items-center">
                        <Input
                          value={ep.title}
                          onChange={(e) =>
                            onUpdateEpisode(ep.id, e.target.value, ep.seasonId)
                          }
                          className="h-8 rounded-xl col-span-7"
                        />
                        {current.grouping === "seasons-episodes" && (
                          <select
                            className="border rounded-xl h-8 px-2 col-span-5"
                            value={ep.seasonId ?? ""}
                            onChange={(e) =>
                              onUpdateEpisode(ep.id, ep.title, e.target.value || null)
                            }
                          >
                            <option value="">(no season)</option>
                            {seasons
                              .slice()
                              .sort((a, b) => a.order - b.order)
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.title}
                                </option>
                              ))}
                          </select>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

          {/* Create new project */}
          <div className="grid md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <div className="text-sm font-medium mb-1">Create new project</div>
              <Input
                placeholder="Project name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button onClick={doCreate} className="rounded-xl h-9">
              Create
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
