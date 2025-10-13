// src/lib/storage.ts
import { supabase } from "./supabase";
import type { Episode, Project, ProjectBundle, Scene, Season, Note, Topic } from "./types";

const LS_PROJECTS = "paradigm_projects_v1"; // [{id,name,...}]
// Each project data persisted separately to allow lazy loading
const LS_BUNDLE = (projectId: string) => `paradigm_project_${projectId}_bundle_v1`;
const BUCKET = "paradigm-scenes";

async function userPrefix() {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id ?? "anon"; // dev path when not signed in
  return `${uid}`;
}

// --- Utility: basic shape check and normalization for imported bundle ---
export function normalizeBundle(raw: any): ProjectBundle | null {
  try {
    if (!raw || typeof raw !== "object") return null;
    const project = raw.project as Project;
    const seasons = Array.isArray(raw.seasons) ? (raw.seasons as Season[]) : [];
    const episodes = Array.isArray(raw.episodes) ? (raw.episodes as Episode[]) : [];
    const scenes = Array.isArray(raw.scenes) ? (raw.scenes as Scene[]) : [];
    const notes = Array.isArray(raw.notes) ? (raw.notes as Note[]) : [];
    const topics = Array.isArray(raw.topics) ? (raw.topics as Topic[]) : [];

    if (!project?.id || !project?.name) return null;

    const now = new Date().toISOString();
    // defaults
    project.createdAt ||= now;
    project.updatedAt ||= now;
    // ts-expect-error tolerate missing grouping
    project.grouping ||= "none";

    // helper to reindex order
    const fixOrder = <T extends { order: number }>(arr: T[]) =>
      arr.map((x, i) => ({ ...x, order: i }));

    const pj = project.id;

    const normSeasons: Season[] = fixOrder(
      seasons.map((s) => ({
        ...s,
        projectId: pj,
        createdAt: s.createdAt || now,
        updatedAt: s.updatedAt || now,
      }))
    );

    const normEpisodes: Episode[] = fixOrder(
      episodes.map((e) => ({
        ...e,
        projectId: pj,
        createdAt: e.createdAt || now,
        updatedAt: e.updatedAt || now,
      }))
    );

    const normScenes: Scene[] = fixOrder(
      scenes.map((sc) => ({
        ...sc,
        projectId: pj,
        versions: Array.isArray(sc.versions) ? sc.versions : [],
        color: sc.color || "hsl(200 70% 85%)",
        createdAt: sc.createdAt || now,
        updatedAt: sc.updatedAt || now,
      }))
    );

    return { project, seasons: normSeasons, episodes: normEpisodes, scenes: normScenes, notes: notes, topics: topics };
  } catch {
    return null;
  }
}

export const StorageService = {
  // -------- Projects list (local-only list; each bundle can also live in cloud) --------
  loadProjects(): Project[] {
    try { 
      return JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]"); 
    } catch { return []; }
  },
  // 
  saveProjects(projects: Project[]) {
    localStorage.setItem(LS_PROJECTS, JSON.stringify(projects));
  },
  // -------- Single project bundle (scenes + seasons + episodes) --------
  loadBundle(projectId: string): ProjectBundle | null {
    try {
      const raw = localStorage.getItem(LS_BUNDLE(projectId));
      return raw ? (JSON.parse(raw) as ProjectBundle) : null;
    } catch { return null; }
  },
  // 
  saveBundle(projectId: string, bundle: ProjectBundle) {
    localStorage.setItem(LS_BUNDLE(projectId), JSON.stringify(bundle));
  },
  //
  deleteBundle(projectId: string) {
    localStorage.removeItem(LS_BUNDLE(projectId));
  },
  // -------- Cloud sync to Supabase Storage --------
  async uploadBundle(projectId: string, bundle: ProjectBundle) {
    const prefix = await userPrefix();
    const path = `${prefix}/projects/${projectId}/bundle.json`;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: "application/json",
    });
    if (error) { 
      console.warn(error);
      throw error; 
    }
    return { ok: true } as const;
  },
  // 
  async downloadBundle(projectId: string): Promise<ProjectBundle | null> {
    const prefix = await userPrefix();
    const path = `${prefix}/projects/${projectId}/bundle.json`;
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error) {
      console.warn(error);
      return null; 
    }
    const text = await data.text();
    return JSON.parse(text) as ProjectBundle;
  },
};
