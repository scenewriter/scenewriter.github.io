// src/lib/exportDocx.ts
import {
  AlignmentType,
  Document,
  Header,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  TextRun,
} from "docx";
import { saveAs } from "file-saver";

const INCH = 1440;

export type SceneLike = {
  id: string;
  title: string;
  content: string;
  loc?: "INT" | "EXT";
  tod?: "DAY" | "NIGHT";
  order: number;
};

export type SeasonLike = { title: string; order: number };
export type EpisodeLike = { title: string; order: number };

type Opts = {
  projectTitle: string;
  userName?: string | null;
  season?: SeasonLike | null;
  episode?: EpisodeLike | null;
  scenes: SceneLike[];
};

export async function createScriptDocx({
  projectTitle,
  userName,
  season,
  episode,
  scenes,
}: Opts) {
  // Build cover page
  const cover: Paragraph[] = buildCoverPage({
    projectTitle,
    userName: userName || " ",
    season,
    episode,
  });

  // Build body: slug lines + content blocks with dialogue formatting
  const body: Paragraph[] = [];
  const ordered = scenes.slice().sort((a, b) => a.order - b.order);

  ordered.forEach((s, idx) => {
    // Scene heading (slugline), e.g., "INT - Kitchen" (bold)
    body.push(sceneSlugParagraph(s));
    body.push(blankLine());

    // Scene content (action & dialogue)
    body.push(...parseSceneContentToParagraphs(s.content));

    // Add a little whitespace between scenes (but not after the last)
    if (idx < ordered.length - 1) {
      //body.push(blankLine());
    }
  });

  const pageBreak = new Paragraph({
    children: [new PageBreak()],
  });

  const headerRightPageDot = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          // Page number, then a literal period
          new TextRun({ children: [PageNumber.CURRENT] }),
          new TextRun("."),
        ],
      }),
    ],
  });

  const doc = new Document({
    creator: userName || undefined,
    description: "Screenplay created by Paradigm SceneWriter",
    title: projectTitle,
    styles: {
      default: {
        document: {
          run: {
            font: "Courier New",
            size: 24, // Half-points: 24 = 12pt
          },
        },
      },
      paragraphStyles: [
        {
          id: "CoverTitle",
          name: "CoverTitle",
          run: { size: 24 }, // 12pt
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
          },
        },
        {
          id: "CoverBy",
          name: "CoverBy",
          run: { size: 24 },
          paragraph: {
            alignment: AlignmentType.CENTER,
            //spacing: { after: 120 },
          },
        },
        {
          id: "SceneSlug",
          name: "SceneSlug",
          run: { size: 24 },
          paragraph: {
            //spacing: { before: 240, after: 120 },
            indent: { left: 0 }, // flush left within page margins
          },
        },
        {
          id: "Action",
          name: "Action",
          run: { size: 24 },
          paragraph: {
            //spacing: { after: 120 },
            // action is flush left (page left margin 1.5")
            indent: { left: 0 },
          },
        },
        {
          id: "Character",
          name: "Character",
          run: { size: 24 },
          paragraph: {
            //spacing: { before: 120, after: 40 },
            // character 4.2"
            // Page left is 1.5", add 2.7"
            indent: { left: Math.round(2.7 * INCH) },
          },
        },
        {
          id: "Dialogue",
          name: "Dialogue",
          run: { size: 24 },
          paragraph: {
            //spacing: { after: 120 },
            // dialogue 2.9"
            // Page left is 1.5", add 1.4", and 1" on right
            indent: { left: Math.round(1.4 * INCH), right: Math.round(1.0 * INCH) },
          },
        },
        {
          id: "Parenthetical",
          name: "Parenthetical",
          run: { size: 24 },
          paragraph: {
            //spacing: { after: 40 },
            // parenthetical 3.6"
            // page left 1.5", add 2.1"
            indent: { left: Math.round(2.1 * INCH), right: Math.round(1.0 * INCH) },
          },
        },
      ],
    },
    sections: [
      // cover section
      {
        children: [
          ...cover,
          pageBreak
        ],
      },
      // scene section
      {
        headers: {
          default: headerRightPageDot
        },
        properties: {
          page: {
            pageNumbers: { start: 1 },
            margin: {
              top: INCH, // 1"
              bottom: INCH,
              left: Math.round(1.5 * INCH), // 1.5"
              right: INCH, // 1"
            },
          },
        },
        children: [
          // page break after cover //new Paragraph({ pageBreakBefore: true }),
          ...body,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = buildFileName(projectTitle, season, episode);
  saveAs(blob, fileName);
}

// ---------- Builders ----------

function buildCoverPage({
  projectTitle,
  userName,
  season,
  episode,
}: {
  projectTitle: string;
  userName: string;
  season?: SeasonLike | null;
  episode?: EpisodeLike | null;
}): Paragraph[] {
  const lines: Paragraph[] = [];

  // Vertical breathing room (push title toward page vertical center)
  lines.push(blankLine());
  lines.push(blankLine());
  lines.push(blankLine());
  lines.push(blankLine());

  // Title
  lines.push(
    new Paragraph({
      text: (projectTitle || "UNTITLED").toUpperCase(),
      style: "CoverTitle",
    })
  );

  // Optional Season/Episode
  if (season) {
    lines.push(
      new Paragraph({
        text: `Season ${season.order + 1}: ${season.title || "(Untitled Season)"}`,
        style: "CoverBy",
      })
    );
  }
  if (episode) {
    lines.push(
      new Paragraph({
        text: `Episode ${episode.order + 1}: ${episode.title || "(Untitled Episode)"}`,
        style: "CoverBy",
      })
    );
  }

  // Byline
  lines.push(blankLine());
  lines.push(
    new Paragraph({
      children: [new TextRun("Written by")],
      style: "CoverBy",
    })
  );
  lines.push(
    new Paragraph({
      text: userName || " ",
      style: "CoverBy",
    })
  );

  // Optional date at bottom-ish (simple spacing)
  lines.push(blankLine());
  lines.push(new Paragraph({ text: new Date().toLocaleDateString(), style: "CoverBy" }));

  return lines;
}

function sceneSlugParagraph(s: SceneLike): Paragraph {
  const loc = (s.loc ?? "INT").toUpperCase();
  const tod = (s.tod ?? "DAY").toUpperCase();
  const title = (s.title || "Untitled").toUpperCase();
  return new Paragraph({
    text: `${loc}. ${title} - ${tod}`,
    style: "SceneSlug",
  });
}

function blankLine(): Paragraph {
  return new Paragraph({ text: "" });
}

// Parse scene content. Dialogue blocks are delimited by:
//   @:Character Name
//   (dialogue possibly multiple lines)
//   :@
//
// Everything outside dialogue blocks is treated as Action.
//
// Parenthetical lines inside a dialogue block are detected if they look like:
//   (whispers)
// and get their own "Parenthetical" style.
function parseSceneContentToParagraphs(content: string): Paragraph[] {
  const paras: Paragraph[] = [];
  if (!content?.trim()) return paras;
  
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Dialogue start?
    const cueMatch = line.match(/^@:\s*(.+?)\s*$/);
    if (cueMatch) {
      const character = (cueMatch[1] || "").toUpperCase();
      i++;

      const dialogLines: string[] = [];
      while (i < lines.length && !lines[i].match(/^:@\s*$/)) {
        dialogLines.push(lines[i]);
        i++;
      }
      // Skip the :@ line if present
      if (i < lines.length && lines[i].match(/^:@\s*$/)) i++;

      // CHARACTER cue
      paras.push(
        new Paragraph({
          text: character || "CHARACTER",
          style: "Character",
        })
      );

      // Dialogue lines — split by blank lines to retain paragraphing
      const blocks = groupByBlankLines(dialogLines);
      blocks.forEach((block) => {
        if (block.length > 0) {
          block.forEach((piece) => {
              
            // Parenthetical-only line?
            if (piece && isParenthetical(piece)) {
              paras.push(
                new Paragraph({
                  text: piece.trim(),
                  style: "Parenthetical",
                })
              );
            } else {
              // Normal dialogue paragraph(s)
              const text = piece.trim();
              if (text) {
                paras.push(
                  new Paragraph({
                    style: "Dialogue",
                    children: textToRuns(text),
                  })
                );
              }
            }
          })
        }
      });

      continue;
    }

    // ACTION text (until next cue or EOF)
    const actionLines: string[] = [];
    while (i < lines.length && !lines[i].match(/^@:/)) {
      actionLines.push(lines[i]);
      i++;
    }
    const actionBlocks = groupByBlankLines(actionLines);
    actionBlocks.forEach((block) => {
      const text = block.join("\n").trim();
      if (text) {
        paras.push(
          new Paragraph({
            style: "Action",
            children: textToRuns(text),
          })
        );
        paras.push(blankLine());
      } else {
        // preserve intentional blank spacing
        paras.push(blankLine());
      }
    });
  }

  return paras;
}

// ---------- Helpers ----------

// Split lines into groups separated by blank lines
function groupByBlankLines(lines: string[]): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];
  for (const l of lines) {
    if (l.trim() === "") {
      if (current.length) {
        groups.push(current);
        current = [];
      } else {
        // consecutive blanks: keep as explicit empty block
        groups.push([]);
      }
    } else {
      current.push(l);
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

function isParenthetical(s: string): boolean {
  const trimmed = s.trim();
  return trimmed.startsWith("(") && trimmed.endsWith(")");
}

// Convert a block of text with line breaks into TextRuns so DOCX preserves them
function textToRuns(text: string): TextRun[] {
  const parts = text.split("\n");
  const runs: TextRun[] = [];
  parts.forEach((p, idx) => {
    runs.push(new TextRun(p.trim()));
    if (idx < parts.length - 1) { 
      runs.push(new TextRun({ text: "\n", break: 1 }));
    }
  });
  return runs;
}

function buildFileName(
  projectTitle: string,
  season?: SeasonLike | null,
  episode?: EpisodeLike | null
): string {
  const date = new Date().toISOString().slice(0, 10);
  const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  const parts = [
    "script",
    safe(projectTitle || "Project"),
    season ? `S${String(season.order + 1).padStart(2, "0")}` : null,
    episode ? `E${String(episode.order + 1).padStart(2, "0")}` : null,
    date,
  ].filter(Boolean);
  return `${parts.join("_")}.docx`;
}
