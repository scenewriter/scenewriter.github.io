// src/lib/types.ts
// ------------------------------------------------------------
export type ID = string;

export type GroupingMode = "none" | "episodes" | "seasons" | "seasons-episodes"; // seasons-episodes => scenes can belong to season and episode (episode references a season)

export type Project = {
  id: ID;
  name: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  grouping: GroupingMode; // controls which grouping UIs are active
};

export type Season = {
  id: ID;
  projectId: ID;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type Episode = {
  id: ID;
  projectId: ID;
  seasonId?: ID | null; // present when grouping is seasons-episodes
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type SceneVersion = { 
  id: ID; 
  createdAt: string; // ISO
  content: string 
};

export type Scene = {
  id: ID;
  projectId: ID; // 🔗 belongs to a project
  title: string;
  content: string;
  versions: SceneVersion[];
  color: string;
  order: number; // position on timeline within its container
  seasonId?: ID | null; // optional categorization
  episodeId?: ID | null; // optional categorization
  durationMin?: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectBundle = {
  project: Project;
  seasons: Season[];
  episodes: Episode[];
  scenes: Scene[];
};
