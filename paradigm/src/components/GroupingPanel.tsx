
// src/components/GroupingPanel.tsx (manage seasons & episodes when enabled)
// ------------------------------------------------------------
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Episode, GroupingMode, Season } from '@/lib/types';
import { Input } from '@/components/ui/input';

export function GroupingPanel({
  mode,
  seasons,
  episodes,
  onAddSeason,
  onAddEpisode,
  onUpdateSeason,
  onUpdateEpisode,
}: {
  mode: GroupingMode;
  seasons: Season[];
  episodes: Episode[];
  onAddSeason: () => void;
  onAddEpisode: (seasonId?: string | null) => void;
  onUpdateSeason: (id: string, title: string) => void;
  onUpdateEpisode: (id: string, title: string, seasonId?: string | null) => void;
}) {
  if (mode === 'none') { return null; }
  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle className="text-lg">Categorization</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {(mode === 'seasons' || mode === 'seasons-episodes') && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Seasons</div>
              <Button size="sm" onClick={onAddSeason} className="rounded-xl">Add Season</Button>
            </div>
            <div className="space-y-2">
              {seasons.sort((a,b)=>a.order-b.order).map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <Input value={s.title} onChange={(e)=>onUpdateSeason(s.id, e.target.value)} className="h-8 rounded-xl"/>
                  <span className="text-xs opacity-60">#{s.order+1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(mode === 'episodes' || mode === 'seasons-episodes') && (
          <div>
            <div className="flex items-center justify-between mb-2"><div className="font-semibold">Episodes</div>
              <Button size="sm" onClick={()=>onAddEpisode(undefined)} className="rounded-xl">Add Episode</Button>
            </div>
            <div className="space-y-2">
              {episodes.sort((a,b)=>a.order-b.order).map(ep => (
                <div key={ep.id} className="grid grid-cols-12 gap-2 items-center">
                  <Input value={ep.title} onChange={(e)=>onUpdateEpisode(ep.id, e.target.value, ep.seasonId)} className="h-8 rounded-xl col-span-7"/>
                  {mode === 'seasons-episodes' && (
                    <select className="border rounded-xl h-8 px-2 col-span-5" value={ep.seasonId ?? ''} onChange={(e)=>onUpdateEpisode(ep.id, ep.title, e.target.value || null)}>
                      <option value="">(no season)</option>
                      {seasons.sort((a,b)=>a.order-b.order).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
