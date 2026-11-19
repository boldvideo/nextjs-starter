// Builds the editorial layer for the Shift AI portal from the real transcripts:
//   lib/shiftai/briefs.json  per episode: "the brief" (move / numbers / what broke / do this week)
//   lib/shiftai/slugs.json   youtubeId -> Bold slug (for links inside chat answers)
//   <out>/roster.txt         one line per guest's business, for the assistant's background
//
// Claude Opus 5.5 reads each transcript once. Nothing it says about *where* something
// was said is trusted: every brief line carries a verbatim quote, and the timestamp
// comes from finding that quote in our own word timings. No match, no timestamp.
//
//   node --env-file=.env.local scripts/shiftai-briefs.mjs <out dir> [youtubeId ...]
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const [outDir, ...only] = process.argv.slice(2);
const ROOT = new URL("..", import.meta.url).pathname;
const show = readFileSync(`${ROOT}lib/shiftai/show.ts`, "utf8");
const marker = "export const EPISODES: ShowEpisode[] = ";
const EPISODES = JSON.parse(show.slice(show.indexOf(marker) + marker.length).replace(/;\s*$/, ""));

const Line = z.object({
  text: z.string().describe("One or two plain sentences, at most 28 words, British English, third person, guest by first name"),
  quote: z.string().describe("8 to 25 consecutive words copied character for character from one transcript paragraph that best supports the line"),
});
const Out = z.object({
  profile: z.object({
    what: z.string().describe("What the company sells, in at most 10 words"),
    kind: z.enum(["Transformer", "Builder", "Advisor"]).describe("Transformer = existing SaaS going AI-first; Builder = AI-native from the start; Advisor = consultancy, investor or lender"),
    stage: z.string().describe("ARR, headcount, funding or customers exactly as stated in the episode, at most 12 words; 'not stated' if absent"),
    buyer: z.string().describe("Who buys it, at most 8 words"),
    pricing: z.string().describe("Pricing model as stated (per-seat, usage, outcome, platform fee...), at most 10 words; 'not stated' if absent"),
    motion: z.string().describe("How they sell (self-serve, sales-led, outbound, events, founder-led...), at most 8 words; 'not stated' if absent"),
    decision: z.string().describe("The hard call this guest faced and what they did about it, at most 22 words"),
  }),
  brief: z.object({
    move: Line.describe("The decision or bet the guest made"),
    numbers: Line.describe("The most concrete figures given in the episode, stated plainly, nothing rounded up"),
    broke: Line.describe("What went wrong, what they got wrong, or what they are still unsure about"),
    advice: Line.describe("What the guest says a software founder should do now"),
  }),
});

const SYSTEM = `You write the editorial layer for The AI Revolution Show, Shift AI's interview podcast. Alex Theuma interviews founders and operators who are rebuilding B2B software companies for the AI era. Readers are European software founders at roughly 1M to 20M+ ARR. They want the decision, the numbers behind it, and an honest account of what broke.

From the transcript produce:

1. PROFILE: the guest's business as stated in this episode only. Never fill a field from outside knowledge; write "not stated" when the episode does not say.

2. THE BRIEF: four short lines in the shape of Shift AI's newsletter.
   - move: the decision or bet.
   - numbers: the concrete figures, as said.
   - broke: what went wrong or remains unresolved. If the guest admits nothing of the kind, use the risk or doubt they voice most clearly.
   - advice: what they tell founders to do.
   Each line comes with a quote: 8 to 25 consecutive words copied exactly from a single transcript paragraph, the passage where this is said. Copy it character for character, including small speech errors. Do not stitch words from different places.

Style: British English. Short declaratives. Real numbers. No hype, no exclamation marks, no em dashes, no "In this episode". Refer to the guest by first name after the profile.`;

const SENTENCE_END = /[.!?]["”’)]?$/;
const FILLER = /^(uh+|um+|uhm+|erm+|hmm+|mm+)[,.…?!-]*$/i;
const stamp = (s) => {
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};

function paragraphs(tx) {
  const names = tx.metadata?.speakers ?? {};
  const out = [];
  for (const u of tx.utterances ?? []) {
    const who = names[u.speaker] || `Speaker ${u.speaker}`;
    let buf = [], start = null, prevEnd = null;
    for (const w of u.words ?? []) {
      const tok = (w.word ?? w.text ?? "").trim();
      if (!tok) continue;
      if (start === null) { start = w.start; prevEnd = w.start; }
      const pause = w.start - prevEnd;
      const atEnd = buf.length > 0 && SENTENCE_END.test(buf[buf.length - 1]);
      if (buf.length && ((pause >= 1.5 && atEnd) || (buf.length >= 55 && atEnd && pause >= 0.35) || (buf.length >= 130 && atEnd))) {
        out.push({ speaker: who, start, text: buf.join(" ") });
        buf = []; start = w.start;
      }
      buf.push(tok); prevEnd = w.end;
    }
    if (buf.length) out.push({ speaker: who, start, text: buf.join(" ") });
  }
  return out;
}

const norm = (s) => (s.toLowerCase().replace(/’/g, "'").match(/[a-z0-9$%€£']+/g) ?? []);

/** Where a quote really is: exact word run first, then its first or last eight words. Fillers are ignored on both sides. */
function locate(quote, tx) {
  const flat = [], at = [];
  for (const u of tx.utterances ?? []) for (const w of u.words ?? []) {
    const raw = (w.word ?? w.text ?? "").trim();
    if (FILLER.test(raw)) continue;
    for (const t of norm(raw)) { flat.push(t); at.push(w.start); }
  }
  const q = norm(quote).filter((t) => !/^(uh+|um+|uhm+)$/.test(t));
  const find = (needle) => {
    if (needle.length < 5) return null;
    outer: for (let i = 0; i <= flat.length - needle.length; i++) {
      for (let k = 0; k < needle.length; k++) if (flat[i + k] !== needle[k]) continue outer;
      return at[i];
    }
    return null;
  };
  return find(q) ?? find(q.slice(0, 8)) ?? find(q.slice(2, 10)) ?? (find(q.slice(-8)) !== null ? Math.max(0, find(q.slice(-8)) - 6) : null);
}

const client = new Anthropic();
const res = await fetch("https://app.boldvideo.io/api/v1/videos?limit=60", { headers: { Authorization: `Bearer ${process.env.BOLD_API_KEY}` } });
const videos = (await res.json()).data;

const briefsPath = `${ROOT}lib/shiftai/briefs.json`;
const briefs = existsSync(briefsPath) ? JSON.parse(readFileSync(briefsPath, "utf8")) : {};
const rosterPath = `${outDir}/roster.json`;
const roster = existsSync(rosterPath) ? JSON.parse(readFileSync(rosterPath, "utf8")) : {};
const slugs = {};

async function one(ep) {
  const video = videos.find((v) => (v.thumbnail ?? "").includes(ep.youtubeId));
  if (!video) return { ep, status: "not imported" };
  slugs[ep.youtubeId] = video.slug || video.id;
  const url = video.transcript?.json?.url;
  if (!url) return { ep, status: "no transcript" };
  if (only.length ? !only.includes(ep.youtubeId) : briefs[ep.youtubeId]?.brief && roster[ep.youtubeId]) return { ep, status: "kept" };
  const tx = await (await fetch(url)).json();
  const paras = paragraphs(tx);
  const transcript = paras.map((p) => `[${stamp(p.start)}] ${p.speaker}: ${p.text}`).join("\n\n");
  const chapters = ep.chapters.map((c) => `${stamp(c.t)} ${c.title}`).join("\n");
  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Episode ${ep.number}: ${ep.title}\nGuest: ${ep.guest.name}, ${ep.guest.role}, ${ep.guest.company}. Host: Alex Theuma.\n\nThe show's own chapter list:\n${chapters || "(none)"}\n\nTRANSCRIPT\n\n${transcript}`,
      },
    ],
    output_config: { effort: "high", format: zodOutputFormat(Out) },
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) return { ep, status: `no output (${response.stop_reason})` };
  const out = response.parsed_output;
  const brief = {};
  let located = 0;
  for (const key of ["move", "numbers", "broke", "advice"]) {
    const t = locate(out.brief[key].quote, tx);
    if (t !== null) located++;
    brief[key] = { text: out.brief[key].text, at: t === null ? null : Math.floor(t), quote: out.brief[key].quote };
  }
  briefs[ep.youtubeId] = { ...(briefs[ep.youtubeId] ?? {}), brief };
  roster[ep.youtubeId] = { number: ep.number, guest: ep.guest.name, company: ep.guest.company, ...out.profile };
  return { ep, status: `ok, ${located}/4 quotes located`, usage: response.usage };
}

// Four at a time: fast enough, and well inside rate limits.
const queue = [...EPISODES];
const results = [];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let ep; (ep = queue.shift()); ) {
      try {
        results.push(await one(ep));
      } catch (e) {
        if (e instanceof Anthropic.RateLimitError) queue.push(ep);
        results.push({ ep, status: `error: ${e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : String(e)}`.slice(0, 200) });
      }
      writeFileSync(briefsPath, JSON.stringify(briefs, null, 2) + "\n");
      writeFileSync(rosterPath, JSON.stringify(roster, null, 2) + "\n");
    }
  })
);

writeFileSync(`${ROOT}lib/shiftai/slugs.json`, JSON.stringify(slugs, null, 2) + "\n");
const lines = Object.values(roster)
  .sort((a, b) => b.number - a.number)
  .map((r) => `${r.guest} (${r.company}), ${r.kind}: ${r.what} / stage: ${r.stage} / buyer: ${r.buyer} / pricing: ${r.pricing} / motion: ${r.motion} / decision: ${r.decision}`);
writeFileSync(`${outDir}/roster.txt`, lines.join("\n") + "\n");
for (const r of results.sort((a, b) => b.ep.number - a.ep.number)) console.log(String(r.ep.number).padStart(2, "0"), r.ep.guest.name.padEnd(24), r.status, r.usage ? `(${r.usage.input_tokens} in / ${r.usage.output_tokens} out)` : "");
console.log(`${Object.keys(roster).length} profiles, ${Object.keys(slugs).length} slugs, roster ${lines.join("\n").length} chars`);
