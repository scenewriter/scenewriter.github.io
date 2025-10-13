// src/lib/types.ts
export type ID = string;
export type GroupingMode = "none" | "episodes" | "seasons" | "seasons-episodes"; // seasons-episodes => scenes can belong to season and episode (episode references a season)
export type SlugLocation = "INT" | "EXT"; // Scene slug line location
export type SlugTimeOfDay = "DAY" | "NIGHT"; // Scene slug line time of day

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
  hidden?: boolean;
};

export type Episode = {
  id: ID;
  projectId: ID;
  seasonId?: ID | null; // present when grouping is seasons-episodes
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  hidden?: boolean;
};

export type SceneVersion = { 
  id: ID; 
  createdAt: string; // ISO
  content: string 
};

export type Scene = {
  id: ID;
  projectId: ID; // 🔗 belongs to a project
  loc?: SlugLocation; // INT/EXT
  title: string;
  tod?: SlugTimeOfDay; // DAY/NIGHT
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

export type Note = {
  id: ID;
  projectId: ID; // 🔗 belongs to a project
  title: string;
  content: string;
  order: number;
  topicId?: ID | null; // optional categorization
  createdAt: string;
  updatedAt: string;
};

export type Topic = {
  id: ID;
  projectId: ID;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  hidden?: boolean;
};

export type ProjectBundle = {
  project: Project;
  seasons: Season[];
  episodes: Episode[];
  scenes: Scene[];
  notes: Note[];
  topics: Topic[];
};
