// src/App.tsx 
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Download, Layout, PenTool, Plus, Save, Trash2, Upload, Copy as CopyIcon, ChevronDown, Notebook, PlusCircle } from 'lucide-react';
import { niceTime, randomPastel } from './lib/utils';
import type { Episode, GroupingMode, Project, ProjectBundle, Scene, SceneVersion, Season, Note, Topic } from './lib/types';
import { ParadigmBoard } from "@/components/ParadigmBoard";
import AuthPanel from './components/AuthPanel';
import { ProjectPanel } from './components/ProjectPanel';
import { StorageService, normalizeBundle } from "./lib/storage";
import { SlugLocationToggle } from "@/components/SlugLocationToggle";
import { SlugTimeOfDayToggle } from "@/components/SlugTimeOfDayToggle";

export default function App() {
  // ---------- Projects ----------
  const [projects, setProjects] = useState<Project[]>(() => StorageService.loadProjects());
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(projects[0]?.id ?? null);
  const currentProject = useMemo(() => projects.find(p => p.id === currentProjectId) ?? null, [projects, currentProjectId]);
  // state – start collapsed
  const [showProjectPanel, setShowProjectPanel] = useState(false);

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
      const bundle: ProjectBundle = { project: p, seasons: [], episodes: [], scenes: [], notes: [], topics: [] };
      StorageService.saveBundle(p.id, bundle);
    }
  };
  useEffect(ensureFirstProject, []);
  // ---------- Active bundle ----------
  const [bundle, setBundle] = useState<ProjectBundle | null>(() => 
    currentProjectId ? StorageService.loadBundle(currentProjectId) : null);
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
  const scenes: Scene[] = bundle?.scenes ?? [];
  const seasons: Season[] = bundle?.seasons ?? [];
  const episodes: Episode[] = bundle?.episodes ?? [];
  const notes: Note[] = bundle?.notes ?? [];
  const topics: Topic[] = bundle?.topics ?? [];
  // ---------- Project mutations ----------
  const handleCreateProject = (p: Project) => {
    setProjects(prev => [...prev, p]);
    const newBundle: ProjectBundle = { project: p, seasons: [], episodes: [], scenes: [], notes: [], topics: [] };
    StorageService.saveBundle(p.id, newBundle);
    setCurrentProjectId(p.id);
  };
  //
  const handleSelectProject = (id: string) => setCurrentProjectId(id);
  //
  const handleModeChange = (id: string, mode: GroupingMode) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, grouping: mode, updatedAt: new Date().toISOString() } : p));
    if (bundle && currentProjectId === id) {
      setBundle({ ...bundle, project: { ...bundle.project, grouping: mode, updatedAt: new Date().toISOString() } });
    }
  };
  //
  const handleRenameProject = (id: string, name: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p));
    if (bundle && currentProjectId === id) setBundle({ ...bundle, project: { ...bundle.project, name, updatedAt: new Date().toISOString() } });
  };
  //
  const handleDeleteProject = (id: string) => {
    if (!confirm('Delete this project? This removes its local bundle.')) return;
    // Remove project and its local bundle
    StorageService.deleteBundle(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    // Choose new current
    if (currentProjectId === id) {
      const remaining = projects.filter(p => p.id !== id);
      if (remaining.length) {
        setCurrentProjectId(remaining[0].id);
      } else {
        const now = new Date().toISOString();
        const p: Project = { id: uuidv4(), name: 'New Project', createdAt: now, updatedAt: now, grouping: 'none' };
        setProjects([p]);
        const newBundle: ProjectBundle = { project: p, seasons: [], episodes: [], scenes: [], notes: [], topics: [] };
        StorageService.saveBundle(p.id, newBundle);
        setCurrentProjectId(p.id);
      }
    }
  };
  // ---------- Topics CRUD ----------
  const setTopics = (next: Topic[]) => bundle && setBundle({ ...bundle, topics: next });
  const addTopic = () => {
    if (!bundle || !currentProject) return;
    const now = new Date().toISOString();
    const t: Topic = {
      id: uuidv4(),
      projectId: currentProject.id,
      title: `Topic ${topics.length + 1}`,
      order: topics.length,
      createdAt: now,
      updatedAt: now,
    };
    setTopics([...(topics || []), t]);
  };
  const updateTopicTitle = (id: string, title: string) => {
    if (!bundle) return;
    setTopics(topics.map(t => t.id === id ? { ...t, title, updatedAt: new Date().toISOString() } : t));
  };
  const deleteTopic = (id: string) => {
    if (!bundle) return;
    // remove topic and clear topicId from notes using it
    const remaining = topics.filter(t => t.id !== id).map((t, i) => ({ ...t, order: i }));
    const cleanedNotes = notes.map(n => n.topicId === id ? { ...n, topicId: null } : n);
    setBundle({ ...bundle, topics: remaining, notes: cleanedNotes });
  };
  // ---------- Notes CRUD ----------
  const setNotes = (next: Note[]) => bundle && setBundle({ ...bundle, notes: next });
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes[0]?.id ?? null);
  useEffect(() => { setActiveNoteId((bundle?.notes ?? [])[0]?.id ?? null); }, [currentProjectId]);

  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId) ?? null, [notes, activeNoteId]);

  const [noteFilter, setNoteFilter] = useState("");
  const filteredNotes = useMemo(() => {
    const q = noteFilter.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  }, [notes, noteFilter]);

  const createNote = () => {
    if (!bundle || !currentProject) { return; }
    const now = new Date().toISOString();
    const n: Note = {
      id: uuidv4(),
      projectId: currentProject.id,
      title: `Note ${notes.length + 1}`,
      content: '',
      topicId: null,
      order: notes.length,
      createdAt: now,
      updatedAt: now
    };
    setNotes([...(notes || []), n]);
    setActiveNoteId(n.id);
  }
  
  const deleteNote = (id: string) => {
    const next = notes.filter(s => s.id !== id).map((s, idx) => ({ ...s, order: idx }));
    setNotes(next); 
    if (activeNoteId === id) { setActiveNoteId(next[0]?.id ?? null); }
  };

  const updateActiveNote = (updates: Partial<Note>) => {
    if (!activeNote) { return; }
    const now = new Date().toISOString();
    setNotes(notes.map(s => s.id === activeNote.id ? { ...s, ...updates, updatedAt: now } : s));
  };

  const copyToScene = () => {
    if (!bundle || !currentProject || !activeNote) { return; }
    const now = new Date().toISOString();
    const noteScene: Scene = {
      id: uuidv4(), 
      projectId: currentProject.id, 
      title: `${activeNote.title} [Scene ${scenes.length + 1}]`, 
      content: activeNote.content, 
      versions: [], 
      color: randomPastel(), 
      order: scenes.length,
      loc: "INT",
      tod: "DAY",
      createdAt: now, 
      updatedAt: now
    };
    setScenes([...(scenes), noteScene]);
    setActiveId(noteScene.id);
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
      loc: "INT",
      tod: "DAY",
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
  // ---------- Copy Scene (to another or new project) ----------
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTargetId, setCopyTargetId] = useState<string | 'NEW'>(currentProjectId || 'NEW');
  const [newProjectName, setNewProjectName] = useState('Copied Project');

  const doCopyScene = () => {
    if (!activeScene) return;
    let targetId = copyTargetId;
    let targetProjects = projects;

    if (copyTargetId === 'NEW') {
      const now = new Date().toISOString();
      const p: Project = { id: uuidv4(), name: newProjectName || 'New Project', createdAt: now, updatedAt: now, grouping: 'none' };
      targetProjects = [...projects, p];
      setProjects(targetProjects);
      StorageService.saveBundle(p.id, { project: p, seasons: [], episodes: [], scenes: [], notes: [], topics: [] });
      targetId = p.id;
    }

    // Load target bundle
    const tBundle = StorageService.loadBundle(targetId as string) || null;
    if (!tBundle) return;

    const cloned: Scene = {
      ...activeScene,
      id: uuidv4(),
      projectId: targetId as string,
      title: activeScene.title + ' (copy)',
      order: (tBundle.scenes?.length || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextBundle: ProjectBundle = { ...tBundle, scenes: [...(tBundle.scenes || []), cloned] };
    StorageService.saveBundle(targetId as string, nextBundle);

    // If copying into current project, reflect in UI
    if (targetId === currentProjectId && bundle) {
      setBundle({ ...bundle, scenes: [...bundle.scenes, cloned] });
    }

    setCopyOpen(false);
  };
  // ---------- Cloud Sync ----------
  const uploadCloud = async () => { 
    if (currentProjectId && bundle) {
      await StorageService.uploadBundle(currentProjectId, bundle);
    }
  };
  //
  const downloadCloud = async () => { 
    if (!currentProjectId) { return; }
    const remote = await StorageService.downloadBundle(currentProjectId); if (remote) setBundle(remote); 
  };
  // ---------- Bundle Import / Export ----------
  const exportBundle = () => {
    if (!bundle) return;
    const data = JSON.stringify(bundle, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bundle-${bundle.project.name.replace(/\s+/g, "_")}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
  };

  const importBundle = async (file: File) => {
    const text = await file.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      alert("Invalid JSON"); 
      return;
    }

    const normalized = normalizeBundle(parsed);
    if (!normalized) {
      alert("Invalid bundle shape");
      return;
    }

    const incoming = normalized;
    const exists = projects.some((p) => p.id === incoming.project.id);

    if (exists) {
      // Replace existing project’s bundle + metadata
      setProjects((prev) =>
        prev.map((p) => (p.id === incoming.project.id ? { ...p, ...incoming.project } : p))
      );
      StorageService.saveBundle(incoming.project.id, incoming);
      setCurrentProjectId(incoming.project.id);
      setBundle(incoming);
    } else {
      // Add as a new project
      setProjects((prev) => [...prev, incoming.project]);
      StorageService.saveBundle(incoming.project.id, incoming);
      setCurrentProjectId(incoming.project.id);
      setBundle(incoming);
    }
  };
  
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    // Try to pick a friendly name first, fallback to email
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const name =
        (user?.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) ||
        user?.email ||
        null;
      setUserName(name);
    })();
  }, []);

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900 p-6">
      <div className="max-w-7xl mx-auto grid gap-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-3xl font-semibold tracking-tight">Paradigm SceneWriter</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              className="rounded-xl"
              onClick={() => setShowProjectPanel((v) => !v)}
            >
              <span>
                {showProjectPanel ? "Hide" : "Show"} 
                &nbsp;
                Project Settings
              </span>
              <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showProjectPanel ? "" : "-rotate-90"}`} />
            </Button>
            <AuthPanel />
          </div>
        </header>

        <ProjectPanel
          open={showProjectPanel}
          projects={projects}
          currentId={currentProjectId}
          seasons={seasons}
          episodes={episodes}
          onToggle={() => setShowProjectPanel((v) => !v)}
          onSelect={handleSelectProject}
          onCreate={handleCreateProject}
          onRename={handleRenameProject}
          onDelete={handleDeleteProject}
          onModeChange={handleModeChange}
          onAddSeason={() => {
            if (!currentProject || !bundle) return;
            const now = new Date().toISOString();
            const s: Season = {
              id: uuidv4(),
              projectId: currentProject.id,
              title: `Season ${seasons.length + 1}`,
              order: seasons.length,
              createdAt: now,
              updatedAt: now,
            };
            setBundle({ ...bundle, seasons: [...seasons, s] });
          }}
          onAddEpisode={(seasonId) => {
            if (!currentProject || !bundle) return;
            const now = new Date().toISOString();
            const e: Episode = {
              id: uuidv4(),
              projectId: currentProject.id,
              seasonId: seasonId ?? null,
              title: `Episode ${episodes.length + 1}`,
              order: episodes.length,
              createdAt: now,
              updatedAt: now,
            };
            setBundle({ ...bundle, episodes: [...episodes, e] });
          }}
          onUpdateSeason={(id, title) => {
            if (!bundle) return;
            setBundle({
              ...bundle,
              seasons: seasons.map((s) =>
                s.id === id ? { ...s, title, updatedAt: new Date().toISOString() } : s
              ),
            });
          }}
          onUpdateEpisode={(id, title, seasonId) => {
            if (!bundle) return;
            setBundle({
              ...bundle,
              episodes: episodes.map((e) =>
                e.id === id
                  ? {
                      ...e,
                      title,
                      seasonId: seasonId ?? e.seasonId,
                      updatedAt: new Date().toISOString(),
                    }
                  : e
              ),
            });
          }}
        />

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button onClick={createScene} className="rounded-2xl"><Plus className="mr-2 h-4 w-4" />New Scene</Button>
            <Button variant="outline" onClick={() => {
              const data = JSON.stringify(scenes, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob); const a = document.createElement('a');
              a.href = url; 
              a.download = `scenes-${new Date().toISOString().slice(0, 10)}.json`; 
              a.click(); 
              URL.revokeObjectURL(url);
            }} className="rounded-2xl"><Download className="mr-2 h-4 w-4" />Export Scenes</Button>
            <label className="inline-flex items-center">
              <Input type="file" accept="application/json" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f || !bundle) { return; }
                const text = await f.text();
                const imported: Scene[] = JSON.parse(text);
                const orderedScenes = imported.map((s, i) => ({ ...s, order: i }));
                setScenes(orderedScenes);
              }} className="hidden" id="import-json" />
              <Button asChild variant="outline" className="rounded-2xl cursor-pointer">
                <label htmlFor="import-json"><Upload className="mr-2 h-4 w-4" />Import Scenes</label>
              </Button>
            </label>
            {/* NEW: Bundle export/import */}
            <Button variant="secondary" onClick={exportBundle} className="rounded-2xl">
              <Download className="mr-2 h-4 w-4" /> Export Bundle
            </Button>
            <label className="inline-flex items-center">
              <Input
                type="file"
                accept="application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importBundle(f);
                }}
                className="hidden"
                id="import-bundle"
              />
              <Button asChild variant="secondary" className="rounded-2xl cursor-pointer">
                <label htmlFor="import-bundle">
                  <Upload className="mr-2 h-4 w-4" /> Import Bundle
                </label>
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
          <TabsList className="grid grid-cols-3 w-full max-w-lg rounded-2xl">
            <TabsTrigger value="write" className="flex gap-2"><PenTool className="h-4 w-4" />SceneWriter</TabsTrigger>
            <TabsTrigger value="notebook" className="flex gap-2"><Notebook className="h-4 w-4" />Notebook</TabsTrigger>
            <TabsTrigger value="paradigm" className="flex gap-2"><Layout className="h-4 w-4" />Timeline</TabsTrigger>
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
                    <SlugLocationToggle value={activeScene?.loc} onChange={(loc) => updateActive({ loc: loc })} />
                    <Input value={activeScene?.title ?? ''} onChange={(e) => updateActive({ title: e.target.value })} placeholder="Scene title" className="rounded-xl text-xl font-semibold" />
                    <SlugTimeOfDayToggle value={activeScene?.tod} onChange={(tod) => updateActive({ tod: tod })} /> 
                    <div className="flex gap-2">
                      <Button onClick={saveVersion} variant="secondary" className="rounded-2xl"><Save className="mr-2 h-4 w-4" />Save Version</Button>
                      {activeScene && (
                        <>
                          <Button onClick={() => setCopyOpen(true)} variant="outline" className="rounded-2xl"><CopyIcon className="mr-2 h-4 w-4"/>Copy Scene</Button>
                          <Button onClick={() => deleteScene(activeScene.id)} variant="destructive" className="rounded-2xl"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                        </>
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

          {/* Notebook: notes and topics */}
          <TabsContent value="notebook">
            <div className="grid grid-cols-12 gap-4">
              <Card className="col-span-4 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Notes</span>
                    <Button size="sm" className="rounded-xl" onClick={createNote}>
                      <PlusCircle className="h-4 w-4 mr-1" /> New
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Filter…" value={noteFilter} onChange={(e) => setNoteFilter(e.target.value)} className="rounded-xl" />
                  <div className="max-h-[60vh] overflow-auto space-y-2 pr-1">
                    {filteredNotes.map((s) => (
                      <button key={s.id} onClick={() => setActiveNoteId(s.id)}
                        className={`w-full text-left p-3 rounded-xl border transition ${activeNoteId === s.id ? 'bg-neutral-100 border-neutral-300' : 'hover:bg-neutral-50 border-transparent'}`}
                        style={{ background: activeNoteId === s.id ? '#bada55' : undefined }}>
                        <div className="font-medium truncate">{s.title || 'Untitled'}</div>
                        <div className="text-xs opacity-70">
                          {topics.find(t => t.id === s.topicId)?.title ?? "No Topic"}
                        </div>
                        <div className="text-xs opacity-70">Updated {niceTime(s.updatedAt)}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Editor + Topic picker */}
              <Card className="col-span-8 rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <Input value={activeNote?.title ?? ''} onChange={(e) => updateActiveNote({ title: e.target.value })} placeholder="Note title" className="rounded-xl text-xl font-semibold" />
                    <div className="flex gap-2">
                      {activeNote && (
                        <>
                          <Button onClick={() => updateActiveNote({})} variant="secondary" className="rounded-2xl"><CopyIcon className="mr-2 h-4 w-4"/>Save</Button>
                          <Button onClick={copyToScene} variant="secondary" className="rounded-2xl"><CopyIcon className="mr-2 h-4 w-4"/>To Scene</Button>
                          <Button onClick={() => deleteNote(activeNote.id)} variant="outline" className="rounded-2xl"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                        </>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-12 gap-4">
                  <div className="col-span-8 space-y-3">
                    <Textarea placeholder="Write your note…" className="min-h-[50vh] rounded-2xl" value={activeNote?.content ?? ''} onChange={(e) => updateActiveNote({ content: e.target.value })} />
                    <div className="text-xs opacity-70">
                      Created {niceTime(activeNote?.createdAt)} • Updated {niceTime(activeNote?.updatedAt)}
                    </div>
                  </div>
                  <div className="col-span-4 space-y-3">
                    <div>
                      <div className="text-sm font-semibold mb-1">Topic</div>
                      <select
                        className="border rounded-xl h-9 px-2 w-full"
                        value={activeNote?.topicId ?? ""}
                        onChange={(e)=>updateActiveNote({ topicId: e.target.value || null })}
                      >
                        <option value="">(No Topic)</option>
                        {topics.slice().sort((a,b)=>a.order-b.order).map(t=>(
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="border rounded-2xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Topics</div>
                        <Button size="sm" className="rounded-xl" onClick={addTopic}>
                          <PlusCircle className="h-4 w-4 mr-1" /> Add
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-[30vh] overflow-auto pr-1">
                        {topics.slice().sort((a,b)=>a.order-b.order).map(t=>(
                          <div key={t.id} className="flex items-center gap-2">
                            <Input
                              value={t.title}
                              onChange={(e)=>updateTopicTitle(t.id, e.target.value)}
                              className="h-8 rounded-xl"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={()=>deleteTopic(t.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {!topics.length && <div className="text-sm opacity-60">No topics yet.</div>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Paradigm timeline */}
          <TabsContent value="paradigm">
            <ParadigmBoard
              mode={currentProject?.grouping ?? "none"}
              projectTitle={currentProject?.name ?? 'Untitled Project'}
              userName={userName}
              seasons={seasons}
              episodes={episodes}
              scenes={scenes}
              onReorderScenes={(next) => setScenes(next)}
              onToggleSeasonHidden={(id, hidden) => {
                if (!bundle) return;
                setBundle({
                  ...bundle,
                  seasons: seasons.map((s) =>
                    s.id === id ? { ...s, hidden, updatedAt: new Date().toISOString() } : s
                  ),
                });
              }}
              onToggleEpisodeHidden={(id, hidden) => {
                if (!bundle) return;
                setBundle({
                  ...bundle,
                  episodes: episodes.map((e) =>
                    e.id === id ? { ...e, hidden, updatedAt: new Date().toISOString() } : e
                  ),
                });
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
      {/* Copy Scene Modal */}
      {copyOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[92vw] max-w-md p-5">
            <div className="text-lg font-semibold mb-2">Copy scene to…</div>
            <div className="space-y-3">
              <select className="border rounded-xl h-10 px-2 w-full" value={copyTargetId} onChange={(e)=>setCopyTargetId(e.target.value as any)}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="NEW">➕ New Project…</option>
              </select>
              {copyTargetId === 'NEW' && (
                <Input value={newProjectName} onChange={(e)=>setNewProjectName(e.target.value)} placeholder="New project name" className="rounded-xl"/>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" className="rounded-xl" onClick={()=>setCopyOpen(false)}>Cancel</Button>
              <Button className="rounded-xl" onClick={doCopyScene}>Copy</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
