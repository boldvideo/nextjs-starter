import Link from "next/link";
import type { Metadata } from "next";
import { CopyField } from "@/components/shiftai/copy-field";
import { EPISODES } from "@/lib/shiftai/show";

export const metadata: Metadata = {
  title: "Add Shift AI to Claude or ChatGPT",
  description: "Ask The AI Revolution Show library from the assistant you already use.",
};

const MCP_URL = "https://mcp.boldvideo.io/shiftai";

const clients = [
  {
    name: "Claude",
    where: "claude.ai or the desktop app",
    steps: ["Open Settings, then Connectors.", "Choose Add custom connector.", "Name it Shift AI and paste the address above."],
  },
  {
    name: "ChatGPT",
    where: "Plus, Pro, Business or Enterprise",
    steps: ["Open Settings, then Apps & Connectors.", "Turn on Developer mode under Advanced.", "Choose Create, name it Shift AI and paste the address above."],
  },
];

const tryThese = [
  "Using Shift AI: we're at €4M ARR on per-seat pricing. Who on the show moved off it, and what did they change first?",
  "Using Shift AI: compare how Des Traynor and Eléonore Crespo argue for rebuilding instead of bolting AI on.",
  "Using Shift AI: draft a one-page memo for my board on AI SDRs, citing what the guests found actually works.",
];

export default function ConnectPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <section className="relative overflow-hidden border-b border-border">
        <div className="sx-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="sx-glow pointer-events-none absolute -right-40 -top-56 h-[760px] w-[760px]" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1360px] px-5 pb-16 pt-14 md:px-8 lg:pb-20 lg:pt-20">
          <p className="sx-label sx-eyebrow">For members · MCP knowledge base</p>
          <h1 className="sx-display mt-7 max-w-[14ch] text-[clamp(52px,7.2vw,112px)]">
            The show, inside <span className="text-acid">your assistant.</span>
          </h1>
          <p className="mt-8 max-w-[40rem] text-[19px] leading-[1.65] text-muted-foreground md:text-xl">
            Add Shift AI to Claude or ChatGPT once. After that, any question you ask there can draw on all {EPISODES.length} episodes,
            with the guest named and a link to the second they said it.
          </p>

          <div className="mt-10 max-w-[720px] rounded-card border border-border bg-surface p-5 md:p-6">
            <p className="sx-label text-muted-foreground">The address</p>
            <div className="mt-3">
              <CopyField value={MCP_URL} label="the Shift AI connector address" what="url" />
            </div>
            <p className="mt-3 text-[14px] leading-[1.6] text-dim">
              This is a standard MCP server. Any assistant that supports custom connectors can use it.
            </p>
          </div>
        </div>
      </section>

      {/* How */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1360px] px-5 py-16 md:px-8 md:py-20">
          <p className="sx-label sx-eyebrow">Set it up</p>
          <h2 className="sx-display mt-6 text-[clamp(40px,5vw,72px)]">Two minutes. Once.</h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-card border border-border bg-border lg:grid-cols-3">
            {clients.map((c) => (
              <div key={c.name} className="bg-background p-6 md:p-8">
                <h3 className="sx-display text-[38px]">{c.name}</h3>
                <p className="sx-label mt-2 !text-[10px] text-dim">{c.where}</p>
                <ol className="mt-6">
                  {c.steps.map((s, i) => (
                    <li key={s} className="flex gap-4 border-t border-border py-3.5 text-[15px] leading-[1.55] text-muted-foreground">
                      <span className="font-mono text-[12px] leading-[1.9] text-acid">{String(i + 1).padStart(2, "0")}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            <div className="bg-background p-6 md:p-8">
              <h3 className="sx-display text-[38px]">Claude Code</h3>
              <p className="sx-label mt-2 !text-[10px] text-dim">Or any agent that speaks MCP</p>
              <p className="mt-6 border-t border-border pt-3.5 text-[15px] leading-[1.55] text-muted-foreground">Run this once in your terminal:</p>
              <div className="mt-3">
                <CopyField value={`claude mcp add --transport http shift-ai ${MCP_URL}`} label="the Claude Code command" what="claude-code" />
              </div>
              <p className="mt-4 text-[15px] leading-[1.55] text-muted-foreground">
                Your own agents can call it the same way, so the library can sit behind your Slack bot or your member directory.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Try */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-[1360px] gap-10 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <p className="sx-label sx-eyebrow">Then ask</p>
            <h2 className="sx-display mt-6 text-[clamp(40px,5vw,72px)]">
              Three to <span className="text-acid">try first.</span>
            </h2>
            <p className="mt-6 max-w-md text-[17px] leading-[1.65] text-muted-foreground">
              Start a message with “Using Shift AI” the first time, so the assistant knows where to look. Tap one to copy it.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {tryThese.map((q, i) => (
              <CopyField key={q} value={q} label={`question ${i + 1}`} what={`question-${i + 1}`} />
            ))}
          </div>
        </div>
      </section>

      {/* What's behind it */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1360px] px-5 py-16 md:px-8 md:py-20">
          <p className="sx-label sx-eyebrow">What a member gets</p>
          <div className="mt-8 grid gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-3">
            {[
              ["Answers from the transcripts", "Every answer is built from what was said on the show. If the library doesn’t cover it, it says so."],
              ["Who said it, and when", "Each point carries the guest, their company and a link that opens the episode at that second."],
              ["Only what they may watch", "Members sign in with their Shift AI account. A Member and a Collective founder can see different libraries."],
            ].map(([t, d]) => (
              <div key={t} className="bg-background p-6 md:p-8">
                <h3 className="text-[19px] text-foreground">{t}</h3>
                <p className="mt-3 text-[15px] leading-[1.65] text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-[14px] leading-[1.6] text-dim">
            In this demo the address is open to anyone who has it and covers the 21 public episodes. Member sign-in and per-tier access are
            switched on when it runs on your own member accounts.
          </p>
          <Link href="/" className="sx-btn sx-btn-ghost mt-10">
            <span aria-hidden="true">←</span> Back to the library
          </Link>
        </div>
      </section>
    </div>
  );
}
