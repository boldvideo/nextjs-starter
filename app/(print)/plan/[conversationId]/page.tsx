import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getTenantContext } from "@/lib/get-tenant-context";
import { gymMeta, GYM_BASE_URL, GYM_PUBLIC_HOST } from "@/lib/gym-meta";
import { parseMove, plainText, refsIn, splitPlan, stepTarget, stripStepLabel } from "@/lib/gym-plan-parse";
import { coachForVideo, coachLabel, type Coach } from "@/components/gym/gym-coaches-data";
import { PrintButton } from "./print-button";
import { CopyButton } from "./copy-button";
import { cn } from "@/lib/utils";

/**
 * A conversation as a Playbook: the thing a founder keeps next to the
 * keyboard on the call. Per question ("play"):
 *   the take        what the coaches say, in one or two sentences
 *   on the call     the moves in order with the exact words to use (copyable)
 *   why it works    the coaching per move, the coach's own words, and a QR
 *                   code to that minute of the session
 *   this week       the next step, a score line from its count, and a QR
 *                   back to the conversation to report how it went
 * Older answers (no move names, no words) still print: the card falls back
 * to each move's first sentence. Read-only and shareable like the game.
 */

interface StoredSource {
  id: string;
  videoId: string;
  playbackId?: string;
  muxPlaybackId?: string;
  title?: string;
  videoTitle?: string;
  text?: string;
  timestamp?: number;
  timestampSeconds?: number;
}

interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  insertedAt?: string;
  sources?: StoredSource[];
}

interface Clip {
  id: string;
  title: string;
  seconds: number;
  quote: string;
  coach: Coach | null;
  url: string;
  qr: string;
}

interface PlayMove {
  name: string;
  body: string;
  say: string[];
  clip: Clip | null;
}

interface Play {
  question: string;
  take: string[];
  moves: PlayMove[];
  step: string | null;
  target: number | null;
}

function formatTime(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function firstSentence(text: string): string {
  return text.split(/(?<=[.!?])\s+/)[0] ?? text;
}

// Medium error correction + a 2-module quiet zone on white: survives a laser
// printer and a phone camera at arm's length
function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: { dark: "#17121f", light: "#ffffff" },
  });
}

async function loadPlaybook(conversationId: string) {
  const context = await getTenantContext();
  if (!context) return null;

  type StoredConversation = { messages?: StoredMessage[]; metadata?: { originalQuery?: string } };
  let conversation: StoredConversation | null = null;
  try {
    conversation = (await context.client.ai.getConversation(conversationId)) as unknown as StoredConversation;
  } catch {
    return null;
  }
  const messages = [...(conversation?.messages ?? [])].sort((a, b) => {
    const ta = a.insertedAt ? Date.parse(a.insertedAt) : 0;
    const tb = b.insertedAt ? Date.parse(b.insertedAt) : 0;
    if (ta !== tb) return ta - tb;
    return a.role === b.role ? 0 : a.role === "user" ? -1 : 1;
  });
  if (!messages.some((m) => m.role === "assistant")) return null;

  // Which coach leads each session, and each session's short id (citations
  // carry the internal UUID; the short id keeps QR codes small and scannable)
  const coachByVideo = new Map<string, Coach>();
  const shortIdByVideo = new Map<string, string>();
  try {
    const res = await context.client.videos.list({ page: 1 });
    for (const v of res?.data ?? []) {
      const coach = coachForVideo(v);
      const internalId = (v as typeof v & { internalId?: string }).internalId;
      if (!internalId) continue;
      shortIdByVideo.set(internalId, v.id);
      if (coach) coachByVideo.set(internalId, coach);
    }
  } catch {
    /* the playbook still prints without coach faces */
  }

  const toClip = async (s: StoredSource): Promise<Clip> => {
    const seconds = Math.floor(s.timestampSeconds ?? s.timestamp ?? 0);
    const url = `${GYM_BASE_URL}/v/${shortIdByVideo.get(s.videoId) ?? s.videoId}?t=${seconds}`;
    return {
      id: s.id,
      title: s.videoTitle || s.title || "Session",
      seconds,
      quote: (s.text ?? "").trim(),
      coach: coachByVideo.get(s.videoId) ?? null,
      url,
      qr: await qrSvg(url),
    };
  };

  const plays: Play[] = [];
  let pendingQuestion = conversation?.metadata?.originalQuery ?? "";
  for (const m of messages) {
    if (m.role === "user") {
      pendingQuestion = m.content;
      continue;
    }
    const parts = splitPlan(m.content);
    const sources = m.sources ?? [];
    const shown = new Set<string>();
    const pick = async (text: string) => {
      const s = refsIn(text, sources).find((x) => !shown.has(x.id));
      if (!s) return null;
      shown.add(s.id);
      return toClip(s);
    };
    // The take's clip goes to the moves first: every move should carry proof
    const moves = await Promise.all(
      parts.drills.map(async (d) => {
        const move = parseMove(d);
        const body = plainText(move.body);
        return {
          name: move.name ? plainText(move.name) : firstSentence(body),
          body: move.name ? body : body.slice(firstSentence(body).length).trim(),
          say: move.say.map((l) => l.replace(/\*\*(.+?)\*\*/g, "$1")),
          clip: await pick(d),
        };
      })
    );
    const step = parts.set ? plainText(stripStepLabel(parts.set)) : null;
    plays.push({
      question: pendingQuestion,
      take: [...parts.intro, ...parts.notes].map(plainText).filter(Boolean),
      moves,
      step,
      target: step ? stepTarget(step) : null,
    });
    pendingQuestion = "";
  }

  // The coaches whose sessions back this playbook, most-cited first
  const counts = new Map<Coach, number>();
  for (const play of plays) {
    for (const mv of play.moves) {
      if (mv.clip?.coach) counts.set(mv.clip.coach, (counts.get(mv.clip.coach) ?? 0) + 1);
    }
  }
  const coaches = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  const askUrl = `${GYM_BASE_URL}/ask/${conversationId}`;
  return { plays, coaches, askUrl, askQr: await qrSvg(askUrl) };
}

/** The whole playbook as plain text, for pasting into a doc or CRM. */
function playbookText(plays: Play[], askUrl: string): string {
  const out: string[] = [];
  for (const play of plays) {
    if (play.question) out.push(play.question.toUpperCase(), "");
    out.push(...play.take, "");
    play.moves.forEach((mv, i) => {
      out.push(`${i + 1}. ${mv.name}`);
      if (mv.say.length) out.push(...mv.say.map((l) => (l ? `   ${l}` : "")));
      if (mv.body) out.push(`   Why: ${mv.body}`);
      if (mv.clip) out.push(`   Watch: ${mv.clip.url}`);
      out.push("");
    });
    if (play.step) out.push(`This week: ${play.step}`, "");
  }
  out.push(`Made with The GTM Game by FounderWell. Continue: ${askUrl}`);
  return out.join("\n");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}): Promise<Metadata> {
  const { conversationId } = await params;
  const book = await loadPlaybook(conversationId);
  const question = book?.plays[0]?.question;
  return gymMeta({
    title: question ? `Playbook: ${question}` : "Playbook",
    shareTitle: question ? `Playbook: “${question}”` : "A GTM Game playbook",
    description:
      "A printable playbook from The GTM Game: the moves, the exact words to use, and a QR code to the minute of FounderWell coaching behind each one.",
    path: `/plan/${conversationId}`,
    image: question ? `/og?q=${encodeURIComponent(question)}` : undefined,
    type: "article",
  });
}

export default async function PlaybookPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const book = await loadPlaybook(conversationId);
  if (!book) notFound();

  const { plays, coaches, askUrl, askQr } = book;
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const lead = coaches[0] ?? null;

  return (
    <main className="min-h-screen px-3 py-6 md:py-10 print:p-0 print:min-h-0">
      {/* Screen-only controls */}
      <div className="no-print mx-auto max-w-[820px] mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/ask/${conversationId}`} className="text-sm font-semibold text-[#f6f0ff]/80 hover:text-white">
          ← Back to the game
        </Link>
        <div className="flex items-center gap-2">
          <CopyButton
            text={playbookText(plays, askUrl)}
            label="Copy as text"
            className="border-[#f6f0ff]/40 bg-transparent text-[#f6f0ff] hover:bg-[#f6f0ff] hover:text-[#0b0618]"
          />
          <PrintButton />
        </div>
      </div>

      <article className="sheet relative mx-auto max-w-[820px] rounded-lg bg-[var(--paper)] shadow-[0_30px_80px_-20px_rgba(255,46,166,0.45)] overflow-hidden">
        <div className="sunset-bar h-2.5" />

        {/* Masthead */}
        <header className="px-5 sm:px-10 md:px-12 print:px-8 pt-6 print:pt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/gym/game/logo.webp" alt="" width={40} height={40} className="h-10 w-10" />
            <p className="leading-tight">
              <span className="font-display text-[15px]">The GTM Game</span>
              <span className="block text-[12.5px] text-[var(--ink-soft)]">Playbook by FounderWell</span>
            </p>
          </div>
          <p className="font-osd text-[18px] leading-none text-[var(--ink-soft)]">{today}</p>
        </header>

        {plays.map((play, p) => (
          <PlaySection
            key={p}
            play={play}
            index={p}
            total={plays.length}
            coaches={p === 0 ? coaches : []}
            askUrl={askUrl}
            askQr={askQr}
          />
        ))}

        {/* Credits */}
        <footer className="avoid-break mx-5 sm:mx-10 md:mx-12 print:mx-8 mt-4 print:mt-1 mb-8 print:mb-4 pt-5 print:pt-3 border-t border-[var(--rule)] grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-5 print:gap-3 items-end">
          <div className="text-[13px] print:text-[11.5px] leading-relaxed print:leading-snug text-[var(--ink-soft)] max-w-[52ch] print:max-w-none">
            <p>
              Every move comes from a FounderWell coaching session. Scan a code to watch the coach make the point; the
              full sessions live in the FounderWell program.
            </p>
            <p className="mt-2 print:mt-1 font-semibold text-[var(--ink)]">Make your own playbook at {GYM_PUBLIC_HOST}</p>
          </div>
          {lead && (
            <div className="flex items-center gap-2.5 sm:justify-end">
              <Image src={`/gym/game/cast/${lead.slug}.webp`} alt="" width={44} height={44} className="h-11 w-11 print:h-8 print:w-8" />
              <p className="font-hand text-[30px] print:text-[24px] leading-none">{coachLabel(lead)}</p>
            </div>
          )}
        </footer>
        <div className="sunset-bar h-2.5" />
      </article>
    </main>
  );
}

function PlaySection({
  play,
  index,
  total,
  coaches,
  askUrl,
  askQr,
}: {
  play: Play;
  index: number;
  total: number;
  coaches: Coach[];
  askUrl: string;
  askQr: string;
}) {
  const hasWords = play.moves.some((m) => m.say.length > 0);
  const callWords = play.moves
    .filter((m) => m.say.length)
    .map((m) => m.say.join("\n"))
    .join("\n\n");
  const proof = play.moves.filter((m) => m.body || m.clip);

  return (
    <section className={cn("px-5 sm:px-10 md:px-12 print:px-8", index > 0 && "mt-6 pt-8 border-t-[3px] border-[var(--ink)] break-before-page")}>
      {/* The question, printed like a cartridge-manual headline */}
      <div className="avoid-break pt-7 print:pt-5">
        {total > 1 && <p className="font-osd text-[20px] leading-none text-[var(--pink)] mb-2">Play {index + 1} of {total}</p>}
        <h1
          className={cn(
            "playbook-title font-display leading-[1.02] text-[var(--ink)] max-w-[18ch]",
            index === 0 ? "text-[34px] sm:text-[46px] md:text-[54px] print:text-[38px]" : "text-[30px] sm:text-[38px] print:text-[32px]"
          )}
        >
          {play.question || "Your next go-to-market move"}
        </h1>
        {play.take.map((t, i) => (
          <p
            key={i}
            className={cn(
              "max-w-[60ch]",
              i === 0 ? "mt-6 print:mt-4 text-[19px] sm:text-[21px] print:text-[17px] font-medium leading-[1.45]" : "mt-3 print:mt-2 text-[16px] print:text-[14px] leading-relaxed text-[var(--ink)]/80"
            )}
          >
            {t}
          </p>
        ))}
        {coaches.length > 0 && (
          <div className="mt-5 print:mt-3 flex items-center gap-3">
            <span className="flex -space-x-2">
              {coaches.slice(0, 3).map((c) => (
                <Image key={c.slug} src={`/gym/game/cast/${c.slug}.webp`} alt="" width={36} height={36} className="h-9 w-9" />
              ))}
            </span>
            <p className="text-[13.5px] text-[var(--ink-soft)]">
              From the sessions of{" "}
              <span className="font-semibold text-[var(--ink)]">{coaches.slice(0, 3).map((c) => c.name).join(" & ")}</span>
            </p>
          </div>
        )}
      </div>

      {/* On the call: the card you keep next to the keyboard */}
      {play.moves.length > 0 && (
        <div className="avoid-break relative mt-9 print:mt-7 rounded-2xl border-2 border-dashed border-[var(--ink)]/70 p-5 sm:p-7 print:p-5">
          {/* Scissors ride the card, so they never strand at a page bottom */}
          <span aria-hidden className="absolute -top-[13px] left-6 bg-[var(--paper)] px-1.5 text-[18px] leading-none text-[var(--ink)]/70">
            ✂
          </span>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-bold leading-tight">On the call</h2>
              <p className="mt-0.5 text-[13.5px] text-[var(--ink-soft)]">
                {hasWords ? "The moves in order, with the words to use. Keep it next to your keyboard." : "The moves in order. Keep it next to your keyboard."}
              </p>
            </div>
            {hasWords && <CopyButton text={callWords} label="Copy the words" />}
          </div>
          <ol className="mt-5 print:mt-4 space-y-5 print:space-y-3.5">
            {play.moves.map((mv, i) => (
              <li key={i} className="grid grid-cols-[38px_1fr] gap-x-3">
                <span className="font-display text-[24px] leading-none text-[var(--cyan)] pt-0.5">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-[17px] font-bold leading-snug">{mv.name}</p>
                  {mv.say.length > 0 && (
                    <div className="mt-2 print:mt-1.5 border-l-[3px] border-[var(--pink)] pl-3.5 space-y-1 text-[16px] print:text-[14.5px] leading-[1.55] print:leading-[1.45]">
                      {mv.say.map((line, j) => (line.trim() ? <p key={j}>{line}</p> : <div key={j} className="h-1.5" />))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Why it works: the coaching, the coach's words, the minute to watch */}
      {proof.length > 0 && (
        <div className="mt-10 print:mt-6">
          <div>
            {play.moves.map((mv, i) =>
              mv.body || mv.clip ? (
                <div
                  key={i}
                  className="avoid-break grid grid-cols-[38px_1fr] sm:grid-cols-[38px_1fr_auto] gap-x-3 gap-y-3 py-5 print:py-3 border-b border-[var(--rule)] last:border-b-0"
                >
                  {/* The heading rides the first row so print never strands it */}
                  {mv === proof[0] && (
                    <h2 className="col-span-full -mb-1 text-[20px] print:text-[18px] font-bold leading-tight">Why each move works</h2>
                  )}
                  <span className="font-display text-[18px] leading-none text-[var(--ink)]/35 pt-1">{i + 1}</span>
                  <div className="min-w-0 max-w-[58ch]">
                    <p className="text-[15.5px] font-bold leading-snug">{mv.name}</p>
                    {mv.body && <p className="mt-1.5 text-[15px] print:text-[13.5px] leading-relaxed print:leading-normal text-[var(--ink)]/85">{mv.body}</p>}
                    {mv.clip?.quote && (
                      <blockquote className="mt-3 print:mt-2 text-[14.5px] print:text-[13px] leading-snug">
                        <p className="italic text-[var(--ink)]">&ldquo;{mv.clip.quote}&rdquo;</p>
                        <footer className="mt-1 text-[12.5px] text-[var(--ink-soft)]">
                          {mv.clip.coach ? `${coachLabel(mv.clip.coach)} in ` : "From "}
                          &ldquo;{mv.clip.title.split(/:\s/)[0]}&rdquo;
                        </footer>
                      </blockquote>
                    )}
                  </div>
                  {mv.clip && (
                    <a
                      href={mv.clip.url}
                      className="col-start-2 sm:col-start-3 flex sm:flex-col items-center gap-2.5 sm:gap-1 self-start rounded-md focus-visible:outline-2 focus-visible:outline-[var(--cyan)]"
                    >
                      <span
                        className="block h-[84px] w-[84px] [&>svg]:h-full [&>svg]:w-full"
                        // qrcode renders a self-contained SVG string
                        dangerouslySetInnerHTML={{ __html: mv.clip.qr }}
                      />
                      <span className="font-osd text-[16px] leading-none text-[var(--cyan)]">▶ Watch {formatTime(mv.clip.seconds)}</span>
                    </a>
                  )}
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* This week */}
      {play.step && (
        <div className="avoid-break mt-8 print:mt-5 mb-6 print:mb-4 rounded-2xl bg-[var(--ink)] text-[var(--paper)] p-5 sm:p-7 print:p-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6">
          <div className="min-w-0">
            <h2 className="font-display text-[15px] text-[var(--yellow)]">This week</h2>
            <p className="mt-2 text-[19px] sm:text-[21px] print:text-[17px] font-semibold leading-snug max-w-[44ch] print:max-w-[52ch]">{play.step}</p>
            {play.target && (
              <p className="mt-5 print:mt-3 flex items-end gap-2 text-[15px]">
                <span className="text-[var(--paper)]/70">Your score</span>
                <span className="inline-block w-16 border-b-2 border-[var(--paper)]/60 translate-y-[-3px]" />
                <span className="font-display text-[22px] leading-none">/ {play.target}</span>
              </p>
            )}
          </div>
          {index === total - 1 && (
            <a href={askUrl} className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 self-end">
              <span
                className="block h-[88px] w-[88px] shrink-0 rounded-md overflow-hidden [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: askQr }}
              />
              <span className="text-[13px] leading-snug text-[var(--paper)]/80 sm:text-right max-w-[22ch]">
                Done? Tell the Game Master how it went.
              </span>
            </a>
          )}
        </div>
      )}
    </section>
  );
}
