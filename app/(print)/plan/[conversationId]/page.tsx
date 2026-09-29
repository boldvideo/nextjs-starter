import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getTenantContext } from "@/lib/get-tenant-context";
import { gymMeta, GYM_BASE_URL } from "@/lib/gym-meta";
import { plainText, refsIn, splitPlan } from "@/lib/gym-plan-parse";
import { coachForVideo, coachLabel, COACHES, type Coach } from "@/components/gym/gym-coaches-data";
import { PrintButton } from "./print-button";

/**
 * A conversation, printed like a personal trainer's program sheet: goal,
 * coach's note, drills with blanks for sets × reps and a QR code to the
 * exact clip, this week's workout with a tick box per day, gym rules, and
 * the coach's signature. Read-only and shareable like the thread itself.
 */

interface StoredSource {
  id: string;
  videoId: string;
  playbackId?: string;
  muxPlaybackId?: string;
  title?: string;
  videoTitle?: string;
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
  videoId: string;
  title: string;
  seconds: number;
  coach: Coach | null;
  qr: string;
}

interface Rep {
  question: string;
  intro: string[];
  introClip: Clip | null;
  drills: { text: string; clip: Clip | null }[];
  notes: string[];
  set: string | null;
}

const RULES = [
  ["Light weight, more reps.", "Twenty small experiments beat one big launch."],
  ["Form before weight.", "Fix the positioning before you scale the spend."],
  ["Warm-up sets.", "Test the message on 20 prospects before 2,000."],
  ["Progressive overload.", "Raise the volume a little every week."],
  ["Don't skip leg day.", "Everyone skips positioning. It shows."],
  ["No ego lifting.", "Seed stage doesn't need an enterprise playbook."],
  ["Rest days count.", "Let the data land before you change the campaign."],
  ["Log your PRs.", "Write down what worked, or you'll never repeat it."],
];

function formatTime(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

async function loadPlan(conversationId: string) {
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

  // Which coach leads each session, by internal video id
  const coachByVideo = new Map<string, Coach>();
  try {
    const res = await context.client.videos.list({ page: 1 });
    for (const v of res?.data ?? []) {
      const coach = coachForVideo(v);
      const internalId = (v as typeof v & { internalId?: string }).internalId;
      if (coach && internalId) coachByVideo.set(internalId, coach);
    }
  } catch {
    /* plan still prints without coach faces */
  }

  const toClip = async (s: StoredSource): Promise<Clip> => {
    const seconds = Math.floor(s.timestampSeconds ?? s.timestamp ?? 0);
    const url = `${GYM_BASE_URL}/v/${s.videoId}?t=${seconds}`;
    return {
      id: s.id,
      videoId: s.videoId,
      title: s.videoTitle || s.title || "Session",
      seconds,
      coach: coachByVideo.get(s.videoId) ?? null,
      qr: await QRCode.toString(url, { type: "svg", margin: 0, color: { dark: "#17121f", light: "#00000000" } }),
    };
  };

  const reps: Rep[] = [];
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
    reps.push({
      question: pendingQuestion,
      intro: parts.intro.map(plainText).filter(Boolean),
      introClip: await pick(parts.intro.join("\n\n")),
      drills: await Promise.all(parts.drills.map(async (d) => ({ text: plainText(d), clip: await pick(d) }))),
      notes: parts.notes.map(plainText).filter(Boolean),
      set: parts.set ? plainText(parts.set) : null,
    });
    pendingQuestion = "";
  }

  // The lead coach signs the sheet: whoever's tape backs the most clips
  const counts = new Map<Coach, number>();
  for (const rep of reps) {
    for (const c of [rep.introClip, ...rep.drills.map((d) => d.clip)]) {
      if (c?.coach) counts.set(c.coach, (counts.get(c.coach) ?? 0) + 1);
    }
  }
  const lead = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { reps, lead };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}): Promise<Metadata> {
  const { conversationId } = await params;
  const plan = await loadPlan(conversationId);
  const question = plan?.reps[0]?.question;
  return gymMeta({
    title: question ? `Training plan: ${question}` : "Training plan",
    shareTitle: question ? `Training plan: “${question}”` : "A GTM Gym training plan",
    description: "A printable GTM training plan from The GTM Gym, with a QR code to the exact minute of FounderWell training behind every drill.",
    path: `/plan/${conversationId}`,
    image: question ? `/og?q=${encodeURIComponent(question)}` : undefined,
    type: "article",
  });
}

export default async function PlanPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const plan = await loadPlan(conversationId);
  if (!plan) notFound();

  const { reps, lead } = plan;
  const planNo = conversationId.slice(0, 6).toUpperCase();
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const rules = [0, 1, 2].map((i) => RULES[(hash(conversationId) + i * 3) % RULES.length]);
  const coach = lead ?? null;

  return (
    <main className="min-h-screen px-3 py-6 md:py-10">
      {/* Screen-only controls */}
      <div className="no-print mx-auto max-w-[860px] mb-4 flex items-center justify-between gap-3">
        <Link href={`/ask/${conversationId}`} className="text-sm font-semibold text-[#f6f0ff]/80 hover:text-white">
          ← Back to the set
        </Link>
        <PrintButton />
      </div>

      <article className="sheet relative mx-auto max-w-[860px] rounded-lg bg-[var(--paper)] shadow-[0_30px_80px_-20px_rgba(255,46,166,0.45)] overflow-hidden">
        <div className="sunset-bar h-2.5" />

        {/* Letterhead */}
        <header className="px-6 md:px-10 pt-6 pb-5 flex items-start justify-between gap-6 border-b-2 border-[var(--ink)]">
          <div className="flex items-center gap-3">
            <Image src="/gym/logo.webp" alt="" width={64} height={64} className="h-16 w-16" />
            <div>
              <p className="font-display text-[22px] leading-none">THE GTM GYM</p>
              <p className="mt-1 text-[12px] text-[var(--ink-soft)]">by FounderWell · gym.bold.video</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-[26px] md:text-[30px] leading-none text-[var(--pink)]">TRAINING PLAN</p>
            <p className="mt-1.5 font-osd text-[18px] leading-none text-[var(--ink-soft)]">
              No. {planNo} · {today.toUpperCase()}
            </p>
          </div>
        </header>

        {/* Athlete / coach */}
        <section className="px-6 md:px-10 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-[var(--rule)]">
          <div>
            <p className="font-display text-[11px] tracking-wider text-[var(--ink-soft)]">ATHLETE</p>
            <div className="mt-3 border-b-2 border-dotted border-[var(--ink-soft)] h-7" />
          </div>
          <div className="flex items-center gap-3">
            <Image
              src={coach ? `/gym/coaches/${coach.slug}.webp` : "/gym/coach.webp"}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14"
            />
            <div>
              <p className="font-display text-[11px] tracking-wider text-[var(--ink-soft)]">YOUR COACH</p>
              <p className="font-display text-[17px] leading-tight">{coach ? coach.name : "The GTM Gym Coach"}</p>
              <p className="text-[12px] text-[var(--ink-soft)]">{coach ? `${coach.title} · ${coach.role}` : "On call 24/7"}</p>
            </div>
          </div>
        </section>

        {reps.map((rep, r) => (
          <section key={r} className="px-6 md:px-10 pt-6 pb-2">
            {/* Goal */}
            <div className="avoid-break">
              <p className="font-display text-[12px] tracking-wider text-[var(--cyan)]">
                REP {String(r + 1).padStart(2, "0")} · THE GOAL
              </p>
              <p className="font-hand text-[34px] md:text-[40px] leading-[1.05] mt-1 text-[var(--ink)]">
                {rep.question || "Get better at go-to-market"}
              </p>
            </div>

            {/* Coach's note */}
            {rep.intro.length > 0 && (
              <div className="avoid-break mt-5 grid grid-cols-[1fr_auto] gap-5 items-start">
                <div>
                  <p className="font-display text-[12px] tracking-wider text-[var(--pink)]">COACH&apos;S NOTE</p>
                  {rep.intro.map((p, i) => (
                    <p key={i} className={i === 0 ? "mt-1.5 text-[16px] font-semibold leading-snug" : "mt-2 text-[14px] leading-relaxed text-[var(--ink)]/85"}>
                      {p}
                    </p>
                  ))}
                </div>
                {rep.introClip && <ProofCode clip={rep.introClip} />}
              </div>
            )}

            {/* Drills */}
            {rep.drills.length > 0 && (
              <div className="mt-6">
                <div className="grid grid-cols-[44px_1fr_120px_96px_36px] gap-3 pb-1.5 border-b-2 border-[var(--ink)] font-display text-[10.5px] tracking-wider text-[var(--ink-soft)]">
                  <span>#</span>
                  <span>DRILL</span>
                  <span className="text-center">SETS × REPS</span>
                  <span className="text-center">PROOF</span>
                  <span className="text-center">✓</span>
                </div>
                {rep.drills.map((d, i) => (
                  <div
                    key={i}
                    className="avoid-break grid grid-cols-[44px_1fr_120px_96px_36px] gap-3 py-3 border-b border-[var(--rule)] items-center"
                  >
                    <span className="font-display text-[22px] text-[var(--cyan)] leading-none">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="text-[14.5px] leading-snug">{d.text}</p>
                      {d.clip?.coach && (
                        <p className="mt-1 font-osd text-[15px] leading-none text-[var(--ink-soft)]">
                          WITH {coachLabel(d.clip.coach).toUpperCase()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-end justify-center gap-1.5 font-hand text-[22px] text-[var(--ink-soft)]">
                      <span className="inline-block w-8 border-b-2 border-[var(--ink-soft)] h-6" />×
                      <span className="inline-block w-8 border-b-2 border-[var(--ink-soft)] h-6" />
                    </div>
                    <div className="flex justify-center">{d.clip ? <ProofCode clip={d.clip} small /> : <span className="text-[var(--rule)]">—</span>}</div>
                    <div className="flex justify-center">
                      <span className="h-6 w-6 rounded-md border-2 border-[var(--ink)]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {rep.notes.map((n, i) => (
              <p key={i} className="avoid-break mt-4 text-[14px] leading-relaxed">{n}</p>
            ))}

            {/* This week's workout */}
            {rep.set && (
              <div className="avoid-break mt-6 mb-4 rounded-xl border-[3px] border-[var(--ink)] p-4 md:p-5 relative">
                <p className="font-display text-[13px] tracking-wider text-[var(--pink)]">THIS WEEK&apos;S WORKOUT</p>
                <p className="mt-1.5 text-[15.5px] font-semibold leading-snug">{rep.set}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <span key={i} className="flex flex-col items-center gap-1">
                      <span className="font-display text-[10px] text-[var(--ink-soft)]">{d}</span>
                      <span className="h-7 w-7 rounded-md border-2 border-[var(--ink)]" />
                    </span>
                  ))}
                </div>
                <span className="absolute -top-4 right-4 rotate-[-6deg] rounded-md border-[3px] border-[var(--pink)] bg-[var(--paper)] px-2.5 py-1 font-display text-[13px] text-[var(--pink)]">
                  COACH APPROVED
                </span>
              </div>
            )}
          </section>
        ))}

        {/* House rules + signature */}
        <footer className="avoid-break px-6 md:px-10 pt-4 pb-7 mt-2 border-t-2 border-[var(--ink)] grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
          <div>
            <p className="font-display text-[12px] tracking-wider text-[var(--orange)]">HOUSE RULES</p>
            <ul className="mt-2 space-y-1.5">
              {rules.map(([rule, why]) => (
                <li key={rule} className="text-[13.5px] leading-snug">
                  <span className="font-bold">{rule}</span> <span className="text-[var(--ink-soft)]">{why}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-osd text-[16px] leading-tight text-[var(--ink-soft)]">
              SCAN ANY CODE TO WATCH THE PROOF · MORE REPS AT GYM.BOLD.VIDEO
            </p>
          </div>
          <div className="md:text-right md:self-end">
            <p className="font-hand text-[38px] leading-none text-[var(--ink)]">
              {coach ? `— ${coachLabel(coach)}` : "— Coach"}
            </p>
            <div className="mt-1 md:ml-auto w-48 border-t border-[var(--ink-soft)]" />
            <p className="mt-1 font-display text-[10px] tracking-wider text-[var(--ink-soft)]">COACH&apos;S SIGNATURE</p>
          </div>
        </footer>
        <div className="sunset-bar h-2.5" />
      </article>

      <p className="no-print mx-auto max-w-[860px] mt-4 text-center text-[12px] text-[#f6f0ff]/50">
        Powered by FounderWell training and Bold. {COACHES.length} coaches on staff.
      </p>
    </main>
  );
}

function ProofCode({ clip, small }: { clip: Clip; small?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={small ? "h-[58px] w-[58px]" : "h-[76px] w-[76px]"}
        // qrcode renders a self-contained SVG string
        dangerouslySetInnerHTML={{ __html: clip.qr }}
      />
      <span className="font-osd text-[14px] leading-none text-[var(--ink-soft)]">▶ {formatTime(clip.seconds)}</span>
    </div>
  );
}
