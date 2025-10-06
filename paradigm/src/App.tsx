// src/App.tsx (integrates projects + grouping)
// ------------------------------------------------------------
import React, { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Download, Layout, PenTool, Plus, Save, Trash2, Upload } from 'lucide-react';
import { niceTime, randomPastel } from './lib/utils';
import type { Episode, GroupingMode, Project, ProjectBundle, Scene, SceneVersion, Season } from './lib/types';
import { CanvasTimeline } from './components/CanvasTimeline';
import AuthPanel from './components/AuthPanel';
import { ProjectBar } from './components/ProjectBar';
import { GroupingPanel } from './components/GroupingPanel';
import { StorageService } from './lib/storage';

export default function App() {
  // ---------- Projects ----------
  const [projects, setProjects] = useState<Project[]>(() => StorageService.loadProjects());
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(projects[0]?.id ?? null);
  const currentProject = useMemo(() => projects.find(p => p.id === currentProjectId) ?? null, [projects, currentProjectId]);

  useEffect(() => { StorageService.saveProjects(projects); }, [projects]);

  const ensureFirstProject = () => {
    if (!projects.length) {
      const now = new Date().toISOString();
      const p: Project = {
        id: uuidv4(),
        name: 'My Project',
        createdAt: now,
        updatedAt: now,
        grouping: 'none'
      };
      setProjects([p]); 
      setCurrentProjectId(p.id);
      const bundle: ProjectBundle = { project: p, seasons: [], episodes: [], scenes: [] };
      StorageService.saveBundle(p.id, bundle);
    }
  };
  useEffect(ensureFirstProject, []);
  // ---------- Active bundle ----------
  const [bundle, setBundle] = useState<ProjectBundle | null>(() => currentProjectId ? StorageService.loadBundle(currentProjectId) : null);
  // cur proj id
  useEffect(() => { 
    setBundle(currentProjectId ? StorageService.loadBundle(currentProjectId) : null); 
  }, [currentProjectId]);
  // bundle
  useEffect(() => { 
    if (bundle && currentProjectId) {
      StorageService.saveBundle(currentProjectId, bundle);
    }
  }, [bundle, currentProjectId]);
  // derived lists
  const scenes = bundle?.scenes ?? [];
  const seasons = bundle?.seasons ?? [];
  const episodes = bundle?.episodes ?? [];
  // ---------- Project mutations ----------
  const handleCreateProject = (p: Project) => {
    setProjects(prev => [...prev, p]);
    const newBundle: ProjectBundle = { project: p, seasons: [], episodes: [], scenes: [] };
    StorageService.saveBundle(p.id, newBundle);
    setCurrentProjectId(p.id);
  };

  const handleSelectProject = (id: string) => setCurrentProjectId(id);

  const handleModeChange = (id: string, mode: GroupingMode) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, grouping: mode, updatedAt: new Date().toISOString() } : p));
    if (bundle && currentProjectId === id) {
      setBundle({ ...bundle, project: { ...bundle.project, grouping: mode, updatedAt: new Date().toISOString() } });
    }
  };
  // ---------- Scenes CRUD ----------
  const setScenes = (next: Scene[]) => bundle && setBundle({ ...bundle, scenes: next });
  const activeIdInit = scenes[0]?.id ?? null;
  const [activeId, setActiveId] = useState<string | null>(activeIdInit);
  useEffect(() => { setActiveId(scenes[0]?.id ?? null); }, [currentProjectId]);

  const activeScene = useMemo(() => scenes.find(s => s.id === activeId) ?? null, [scenes, activeId]);
  const [filter, setFilter] = useState('');
  const filteredScenes = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) { return scenes; }
    return scenes.filter(s => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q));
  }, [scenes, filter]);

  const createScene = () => {
    if (!bundle || !currentProject) { return; }
    const now = new Date().toISOString();
    const newScene: Scene = {
      id: uuidv4(), 
      projectId: currentProject.id, 
      title: `New Scene ${scenes.length + 1}`, 
      content: '', 
      versions: [], 
      color: randomPastel(), 
      order: scenes.length, 
      createdAt: now, 
      updatedAt: now
    };
    setScenes([...(scenes), newScene]);
    setActiveId(newScene.id);
  };

  const deleteScene = (id: string) => {
    const next = scenes.filter(s => s.id !== id).map((s, idx) => ({ ...s, order: idx }));
    setScenes(next); 
    if (activeId === id) { setActiveId(next[0]?.id ?? null); }
  };

  const updateActive = (updates: Partial<Scene>) => {
    if (!activeScene) { return; }
    const now = new Date().toISOString();
    setScenes(scenes.map(s => s.id === activeScene.id ? { ...s, ...updates, updatedAt: now } : s));
  };

  const saveVersion = () => {
    if (!activeScene) { return; }
    const v: SceneVersion = { id: uuidv4(), createdAt: new Date().toISOString(), content: activeScene.content };
    setScenes(scenes.map(s => s.id === activeScene.id ? { ...s, versions: [v, ...s.versions] } : s));
  };

  const restoreVersion = (vid: string) => {
    if (!activeScene) { return; }
    const v = activeScene.versions.find(x => x.id === vid);
    if (!v) { return; }
    updateActive({ content: v.content });
  };

  // ---------- Grouping CRUD ----------
  const addSeason = () => {
    if (!bundle || !currentProject) { return; }
    const now = new Date().toISOString();
    const s: Season = {
      id: uuidv4(),
      projectId: currentProject.id,
      title: `Season ${seasons.length + 1}`,
      order: seasons.length,
      createdAt: now,
      updatedAt: now
    };
    setBundle({ ...bundle, seasons: [...seasons, s] });
  };

  const addEpisode = (seasonId?: string | null) => {
    if (!bundle || !currentProject) { return; }
    const now = new Date().toISOString();
    const e: Episode = { 
      id: uuidv4(), 
      projectId: currentProject.id, 
      seasonId: seasonId ?? null, 
      title: `Episode ${episodes.length + 1}`, 
      order: episodes.length, 
      createdAt: now, 
      updatedAt: now 
    };
    setBundle({ ...bundle, episodes: [...episodes, e] });
  };

  const updateSeason = (id: string, title: string) => {
    if (!bundle) { return; }
    setBundle({ ...bundle, seasons: seasons.map(s => s.id === id ? { ...s, title, updatedAt: new Date().toISOString() } : s) });
  };

  const updateEpisode = (id: string, title: string, seasonId?: string | null) => {
    if (!bundle) { return; }
    setBundle({ ...bundle, episodes: episodes.map(e => e.id === id ? { ...e, title, seasonId: seasonId ?? e.seasonId, updatedAt: new Date().toISOString() } : e) });
  };
  // ---------- Cloud Sync ----------
  const uploadCloud = async () => { 
    if (currentProjectId && bundle) {
      await StorageService.uploadBundle(currentProjectId, bundle);
    }
  };

  const downloadCloud = async () => { 
    if (!currentProjectId) { return; }
    const remote = await StorageService.downloadBundle(currentProjectId); if (remote) setBundle(remote); 
  };

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900 p-6">
      <div className="max-w-7xl mx-auto grid gap-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-3xl font-semibold tracking-tight">Paradigm SceneWriter</h1>
          <AuthPanel />
        </header>

        <ProjectBar
          projects={projects}
          currentId={currentProjectId}
          onSelect={handleSelectProject}
          onCreate={handleCreateProject}
          onModeChange={handleModeChange}
        />

        {currentProject && bundle && (
          <GroupingPanel
            mode={currentProject.grouping}
            seasons={seasons}
            episodes={episodes}
            onAddSeason={addSeason}
            onAddEpisode={addEpisode}
            onUpdateSeason={updateSeason}
            onUpdateEpisode={updateEpisode}
          />
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={createScene} className="rounded-2xl"><Plus className="mr-2 h-4 w-4" />New Scene</Button>
            <Button variant="outline" onClick={() => {
              const data = JSON.stringify(scenes, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob); const a = document.createElement('a');
              a.href = url; a.download = `scenes-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
            }} className="rounded-2xl"><Download className="mr-2 h-4 w-4" />Export</Button>
            <label className="inline-flex items-center">
              <Input type="file" accept="application/json" onChange={async (e) => { const f = e.target.files?.[0]; if (!f || !bundle) return; const text = await f.text(); const imported: Scene[] = JSON.parse(text); setScenes(imported.map((s, i) => ({ ...s, order: i }))); }} className="hidden" id="import-json" />
              <Button asChild variant="outline" className="rounded-2xl cursor-pointer">
                <label htmlFor="import-json"><Upload className="mr-2 h-4 w-4" />Import</label>
              </Button>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={uploadCloud} className="rounded-2xl">Cloud Up</Button>
            <Button variant="ghost" onClick={downloadCloud} className="rounded-2xl">Cloud Down</Button>
          </div>
        </div>

        {/* Writing & Paradigm modes */}
        <Tabs defaultValue="write" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md rounded-2xl">
            <TabsTrigger value="write" className="flex gap-2"><PenTool className="h-4 w-4" />Writing Mode</TabsTrigger>
            <TabsTrigger value="paradigm" className="flex gap-2"><Layout className="h-4 w-4" />Paradigm Mode</TabsTrigger>
          </TabsList>

          {/* Writing */}
          <TabsContent value="write">
            <div className="grid grid-cols-12 gap-4">
              <Card className="col-span-4 rounded-2xl">
                <CardHeader><CardTitle className="text-lg">Scenes</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl" />
                  <div className="max-h-[60vh] overflow-auto space-y-2 pr-1">
                    {filteredScenes.map((s) => (
                      <button key={s.id} onClick={() => setActiveId(s.id)}
                        className={`w-full text-left p-3 rounded-xl border transition ${activeId === s.id ? 'bg-neutral-100 border-neutral-300' : 'hover:bg-neutral-50 border-transparent'}`}
                        style={{ background: activeId === s.id ? s.color : undefined }}>
                        <div className="font-medium truncate">{s.title || 'Untitled'}</div>
                        <div className="text-xs opacity-70">Updated {niceTime(s.updatedAt)}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-8 rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <Input value={activeScene?.title ?? ''} onChange={(e) => updateActive({ title: e.target.value })} placeholder="Scene title" className="rounded-xl text-xl font-semibold" />
                    <div className="flex gap-2">
                      <Button onClick={saveVersion} variant="secondary" className="rounded-2xl"><Save className="mr-2 h-4 w-4" />Save Version</Button>
                      {activeScene && (
                        <Button onClick={() => deleteScene(activeScene.id)} variant="destructive" className="rounded-2xl"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-12 gap-4">
                  <div className="col-span-8 space-y-3">
                    <Textarea placeholder="Free write here…" className="min-h-[50vh] rounded-2xl" value={activeScene?.content ?? ''} onChange={(e) => updateActive({ content: e.target.value })} />
                    {/* Categorization selectors (show based on mode) */}
                    {currentProject && currentProject?.grouping !== 'none' && activeScene && (
                      <div className="flex gap-2 items-center text-sm">
                        {['seasons', 'seasons-episodes'].includes(currentProject.grouping) && (
                          <select className="border rounded-xl h-8 px-2" value={activeScene.seasonId ?? ''} onChange={(e) => updateActive({ seasonId: e.target.value || null })}>
                            <option value="">(no season)</option>
                            {seasons.sort((a, b) => a.order - b.order).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                          </select>
                        )}
                        {['episodes', 'seasons-episodes'].includes(currentProject.grouping) && (
                          <select className="border rounded-xl h-8 px-2" value={activeScene.episodeId ?? ''} onChange={(e) => updateActive({ episodeId: e.target.value || null })}>
                            <option value="">(no episode)</option>
                            {episodes
                              .filter(ep => currentProject.grouping === 'seasons-episodes' ? (!activeScene.seasonId || ep.seasonId === activeScene.seasonId) : true)
                              .sort((a, b) => a.order - b.order)
                              .map(ep => <option key={ep.id} value={ep.id}>{ep.title}</option>)}
                          </select>
                        )}
                      </div>
                    )}
                    <div className="text-xs opacity-70">Created {niceTime(activeScene?.createdAt)} • Updated {niceTime(activeScene?.updatedAt)}</div>
                  </div>
                  <div className="col-span-4">
                    <h3 className="text-sm font-semibold mb-2">Versions</h3>
                    <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
                      {activeScene?.versions.length ? (
                        activeScene.versions.map((v) => (
                          <div key={v.id} className="border rounded-xl p-2">
                            <div className="text-xs mb-1">{niceTime(v.createdAt)}</div>
                            <div className="text-xs line-clamp-4 whitespace-pre-wrap opacity-80">{v.content}</div>
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => restoreVersion(v.id)}>Restore</Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm opacity-60">No versions yet. Click <em>Save Version</em> to snapshot the current text.</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Paradigm timeline */}
          <TabsContent value="paradigm">
            <CanvasTimeline scenes={scenes} onReorder={(next) => setScenes(next)} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
