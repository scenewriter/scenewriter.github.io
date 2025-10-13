// src/components/ParadigmBoard.tsx
import React from "react";
import type { Episode, GroupingMode, Scene, Season } from "@/lib/types";
import { CanvasTimeline } from "./CanvasTimeline";
import { Button } from "@/components/ui/button";
import { ChevronDown, Eye, EyeOff, FileText } from "lucide-react";

type Props = {
  mode: GroupingMode;
  projectTitle: string;
  userName?: string | null;
  seasons: Season[];
  episodes: Episode[];
  scenes: Scene[];
  onReorderScenes: (next: Scene[]) => void;
  onToggleSeasonHidden: (id: string, hidden: boolean) => void;
  onToggleEpisodeHidden: (id: string, hidden: boolean) => void;
};

export function ParadigmBoard({
  mode,
  projectTitle,
  userName,
  seasons,
  episodes,
  scenes,
  onReorderScenes,
  onToggleSeasonHidden,
  onToggleEpisodeHidden,
}: Props) {
  // --- Script generator for a specific subset (per timeline) ---
  const createScript = ({
    season,
    episode,
    subset,
  }: {
    season?: Season | null;
    episode?: Episode | null;
    subset: Scene[];
  }) => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10);
    const who = userName || "Unknown User";

    const header: string[] = [
      `PROJECT: ${projectTitle || "(untitled project)"}`,
      ...(season ? [`SEASON: ${season.title || `(Season ${season.order + 1})`}`] : []),
      ...(episode ? [`EPISODE: ${episode.title || `(Episode ${episode.order + 1})`}`] : []),
      `CREATED BY: ${who}`,
      `DATE: ${dateStr}`,
      ``,
      `----------------------------------------`,
      ``,
    ];

    const lines: string[] = [];
    const slug = (s: Scene) => `${(s.loc ?? "INT").toUpperCase()} - ${s.title || "Untitled"} - ${(s.tod ?? "DAY").toUpperCase()}`;

    const ordered = subset.slice().sort((a, b) => a.order - b.order);
    for (const s of ordered) {
      lines.push(slug(s));
      lines.push((s.content ?? "").trim());
      lines.push("");
    }

    const text = [...header, ...lines].join("\n").trim() + "\n";
    const fnParts = [
      projectTitle?.replace(/\s+/g, "_") || "project",
      season ? `S${String(season.order + 1).padStart(2, "0")}` : null,
      episode ? `E${String(episode.order + 1).padStart(2, "0")}` : null,
      dateStr,
    ].filter(Boolean);
    const filename = `script_${fnParts.join("_")}.txt`;
    downloadText(filename, text);
  };

  if (mode === "none") {
    return (
      <Section
        title="Timeline"
        actions={
          <div className="flex items-center gap-2">
            <Button
              className="rounded-xl inline-flex items-center gap-2"
              onClick={() => createScript({ subset: scenes })}
            >
              <FileText className="h-4 w-4" />
              Create Script
            </Button>
          </div>
        }
      >
        <CanvasTimeline scenes={scenes} onReorder={onReorderScenes} />
      </Section>
    );
  }

  if (mode === "episodes") {
    const eps = episodes.slice().sort((a, b) => a.order - b.order);
    return (
      <div className="space-y-6">
        {eps.map((ep) =>
          ep.hidden ? (
            <CollapsedHeader
              key={ep.id}
              title={`Episode ${ep.order + 1}: ${ep.title || "(untitled)"}`}
              hidden
              onToggle={() => onToggleEpisodeHidden(ep.id, false)}
            />
          ) : (
            <Section
              key={ep.id}
              title={`Episode ${ep.order + 1}: ${ep.title || "(untitled)"}`}
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    className="rounded-xl inline-flex items-center gap-2"
                    onClick={() =>
                      createScript({
                        episode: ep,
                        subset: scenes.filter((s) => s.episodeId === ep.id),
                      })
                    }
                  >
                    <FileText className="h-4 w-4" />
                    Create Script
                  </Button>
                  <HideToggle
                    hidden={false}
                    onClick={() => onToggleEpisodeHidden(ep.id, true)}
                    labelWhenVisible="Hide"
                  />
                </div>
              }
            >
              <CanvasTimeline
                scenes={scenes.filter((s) => s.episodeId === ep.id)}
                onReorder={(nextSubset) =>
                  mergeSubsetOrder(scenes, nextSubset, (s) => s.episodeId === ep.id, onReorderScenes)
                }
              />
            </Section>
          )
        )}
      </div>
    );
  }

  // seasons-episodes
  const ss = seasons.slice().sort((a, b) => a.order - b.order);
  const epsBySeason = new Map<string, Episode[]>();
  for (const ep of episodes) {
    const key = ep.seasonId || "__NOSEASON__";
    if (!epsBySeason.has(key)) epsBySeason.set(key, []);
    epsBySeason.get(key)!.push(ep);
  }
  for (const list of epsBySeason.values()) list.sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-8">
      {ss.map((s) =>
        s.hidden ? (
          <CollapsedHeader
            key={s.id}
            title={`Season ${s.order + 1}: ${s.title || "(untitled)"}`}
            hidden
            onToggle={() => onToggleSeasonHidden(s.id, false)}
          />
        ) : (
          <Section
            key={s.id}
            title={`Season ${s.order + 1}: ${s.title || "(untitled)"}`}
            actions={
              // Season header now also has a show/hide toggle
              <HideToggle
                hidden={false}
                onClick={() => onToggleSeasonHidden(s.id, true)}
                labelWhenVisible="Hide Season"
              />
            }
          >
            <div className="space-y-6">
              {(epsBySeason.get(s.id) || []).map((ep) =>
                ep.hidden ? (
                  <CollapsedHeader
                    key={ep.id}
                    level={2}
                    title={`Episode ${ep.order + 1}: ${ep.title || "(untitled)"}`}
                    hidden
                    onToggle={() => onToggleEpisodeHidden(ep.id, false)}
                  />
                ) : (
                  <Section
                    key={ep.id}
                    level={2}
                    title={`Episode ${ep.order + 1}: ${ep.title || "(untitled)"}`}
                    actions={
                      <div className="flex items-center gap-2">
                        <Button
                          className="rounded-xl inline-flex items-center gap-2"
                          onClick={() =>
                            createScript({
                              season: s,
                              episode: ep,
                              subset: scenes.filter((sc) => sc.episodeId === ep.id),
                            })
                          }
                        >
                          <FileText className="h-4 w-4" />
                          Create Script
                        </Button>
                        <HideToggle
                          hidden={false}
                          onClick={() => onToggleEpisodeHidden(ep.id, true)}
                          labelWhenVisible="Hide"
                        />
                      </div>
                    }
                  >
                    <CanvasTimeline
                      scenes={scenes.filter((sc) => sc.episodeId === ep.id)}
                      onReorder={(nextSubset) =>
                        mergeSubsetOrder(
                          scenes,
                          nextSubset,
                          (sc) => sc.episodeId === ep.id,
                          onReorderScenes
                        )
                      }
                    />
                  </Section>
                )
              )}
            </div>
          </Section>
        )
      )}
    </div>
  );
}

/** Merge subset ordering back into full scenes list, reindexing order within the subset only. */
function mergeSubsetOrder(
  all: Scene[],
  subsetNext: Scene[],
  inSubset: (s: Scene) => boolean,
  commit: (nextAll: Scene[]) => void
) {
  const subsetIds = new Set(subsetNext.map((s) => s.id));
  const next = all.map((s) => (subsetIds.has(s.id) ? subsetNext.find((x) => x.id === s.id)! : s));
  const resorted = next
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({ ...s, order: i }));
  commit(resorted);
}

function Section({
  title,
  children,
  actions,
  level = 1,
}: {
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  level?: 1 | 2;
}) {
  const TitleTag = level === 1 ? "h2" : "h3";
  return (
    <div className="border rounded-2xl p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <TitleTag className="font-semibold">
          <span className="inline-flex items-center gap-2">
            <ChevronDown className="h-4 w-4 rotate-0 opacity-60" />
            {title}
          </span>
        </TitleTag>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}

function CollapsedHeader({
  title,
  onToggle,
  hidden,
  level = 1,
}: {
  title: string;
  onToggle: () => void;
  hidden: boolean;
  level?: 1 | 2;
}) {
  const TitleTag = level === 1 ? "h2" : "h3";
  return (
    <div className="border rounded-2xl p-3 bg-white flex items-center justify-between">
      <TitleTag className="font-semibold opacity-70">{title}</TitleTag>
      <HideToggle hidden={hidden} onClick={onToggle} />
    </div>
  );
}

function HideToggle({
  hidden,
  onClick,
  labelWhenVisible = "Hide",
}: {
  hidden: boolean;
  onClick: () => void;
  labelWhenVisible?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-xl inline-flex items-center gap-2"
      onClick={onClick}
      title={hidden ? "Show" : labelWhenVisible}
    >
      {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      {hidden ? "Show" : labelWhenVisible}
    </Button>
  );
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
