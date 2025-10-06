// src/lib/storage.ts
// ------------------------------------------------------------
import { supabase } from "./supabase";
import type { Episode, Project, ProjectBundle, Scene, Season } from "./types";


const LS_PROJECTS = "paradigm_projects_v1"; // [{id,name,...}]
// Each project data persisted separately to allow lazy loading
const LS_BUNDLE = (projectId: string) => `paradigm_project_${projectId}_bundle_v1`;
const BUCKET = "paradigm-scenes";

async function userPrefix() {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id ?? "anon"; // dev path when not signed in
  return `${uid}`;
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
