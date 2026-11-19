"use client";

/* eslint-disable @next/next/no-img-element -- company icons come from any host */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Pencil, Plus } from "lucide-react";
import { domainOf, type CompanyProfile } from "@/lib/shiftai/profile";
import { onCompanyChange, readCompany, writeCompany } from "@/lib/shiftai/company-store";
import { cn } from "@/lib/utils";
import { track } from "@/lib/shiftai/track";

// "Put your company on the hot seat", v2. Nothing ever drops in above the
// composer: the composer itself turns into the URL field (A), a domain typed
// into a question is offered as a one-tap shortcut (B), and on episode pages
// the cast row has an empty seat (C). All three share one profile.

const GREEN = "#E8FF47";
const PASSWORD_MANAGERS_OFF = { "data-1p-ignore": true, "data-lpignore": "true", "data-form-type": "other" } as const;

/** The visitor's company, kept in this browser and shared across the site. */
export function useCompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  useEffect(() => {
    setProfile(readCompany());
    return onCompanyChange(() => setProfile(readCompany()));
  }, []);
  const save = useCallback((p: CompanyProfile | null) => writeCompany(p), []);
  return [profile, save] as const;
}

type ReadState =
  | { phase: "idle" }
  | { phase: "reading"; domain: string; found?: string }
  | { phase: "error"; message: string };

const READING_STEPS = ["Reading the homepage…", "Reading pricing…", "Reading customers and about…", "Working out stage, pricing model and motion…"];

/** Steps through what the reader is doing, so a 10-20 second read doesn't look stuck. */
function useReadingStep(active: boolean) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setStep((n) => Math.min(n + 1, READING_STEPS.length - 1)), 2600);
    return () => {
      window.clearInterval(id);
      setStep(0);
    };
  }, [active]);
  return READING_STEPS[step];
}

/** Reads a site into the shared profile. */
export function useCompanyReader() {
  const [state, setState] = useState<ReadState>({ phase: "idle" });
  const read = useCallback(async (input: string): Promise<boolean> => {
    const domain = domainOf(input) ?? input.trim();
    setState({ phase: "reading", domain });
    try {
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: input }),
      });
      const data = await res.json();
      if (!res.ok) {
        track("Company read failed", { domain, reason: data.code });
        setState({ phase: "error", message: data.error ?? "Couldn't read that site." });
        return false;
      }
      setState({ phase: "reading", domain, found: data.summary });
      track("Company added", { domain: data.domain, name: data.name, profile: data.facts?.length ? "full" : "basic" });
      const prev = readCompany();
      writeCompany({
        ...(prev && domainOf(prev.website) === data.domain ? prev : {}),
        website: data.website,
        business_name: data.name,
        summary: data.summary,
        business_description: data.text,
        facts: data.facts,
        icon: data.icon,
      });
      // Let "Found: …" register before the box turns back into the composer.
      await new Promise((r) => setTimeout(r, 900));
      setState({ phase: "idle" });
      return true;
    } catch {
      setState({ phase: "error", message: "Couldn't reach that site." });
      return false;
    }
  }, []);
  return { state, read };
}

export function CompanyLogo({ profile, size = 22 }: { profile: CompanyProfile | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  const letter = (profile?.business_name ?? domainOf(profile?.website) ?? "?").trim().charAt(0).toUpperCase();
  if (profile?.icon && !broken) {
    return (
      <img
        src={profile.icon}
        alt=""
        width={size}
        height={size}
        onError={() => setBroken(true)}
        className="shrink-0 rounded-[2px] object-cover bg-white ring-1 ring-black/5"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="shrink-0 rounded-[2px] bg-[#141414] text-[#0a0a08] font-bold flex items-center justify-center"
      style={{ width: size, height: size, fontSize: size * 0.48 }}
    >
      {letter}
    </span>
  );
}

/** The seat in a composer: "+ Your company" when empty, the company when filled. */
export function CompanyPill({
  profile,
  onAdd,
  onOpen,
  open,
}: {
  profile: CompanyProfile | null;
  onAdd: () => void;
  onOpen: () => void;
  open?: boolean;
}) {
  if (profile?.business_name) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        className={cn(
          "inline-flex max-w-full items-center gap-1.5 rounded-[2px] border py-1 pl-1 pr-2.5 text-[13px] text-acid transition-colors",
          open ? "border-acid bg-raised" : "border-border bg-raised hover:bg-raised"
        )}
      >
        <CompanyLogo profile={profile} />
        <strong className="truncate">{profile.business_name}</strong>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onAdd}
      className="inline-flex items-center gap-1.5 rounded-[2px] border border-border bg-background py-1 pl-1 pr-3 min-h-8 text-[13px] font-semibold text-acid hover:border-acid transition-colors"
    >
      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] border-dashed border-border text-acid">
        <Plus className="h-3 w-3" />
      </span>
      Your company
    </button>
  );
}

/**
 * A: the composer box itself, in URL mode. Same footprint as the composer so
 * nothing on the page moves; reading progress plays inside it.
 */
export function CompanyUrlBox({
  onCancel,
  onDone,
  className,
}: {
  onCancel: () => void;
  onDone: () => void;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const { state, read } = useCompanyReader();
  const reading = state.phase === "reading";
  const step = useReadingStep(reading);
  const submit = async () => {
    if (!value.trim() || reading) return;
    if (await read(value)) onDone();
  };
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2px] border-[1.5px] border-acid bg-background shadow-[0_0_0_4px_rgba(232,255,71,0.10)] flex flex-col",
        className
      )}
    >
      {reading && (
        <span
          className="absolute left-0 top-0 h-[3px] bg-acid transition-[width] duration-[2400ms] ease-out"
          style={{ width: state.found ? "100%" : "70%" }}
        />
      )}
      {reading ? (
        <div className="flex-1 px-4 pt-3.5 flex flex-col gap-1.5" aria-live="polite">
          <span className="flex items-center gap-2 text-[14px] font-semibold">
            <span className="h-[18px] w-[18px] rounded-[2px] bg-muted animate-pulse" />
            {state.domain}
          </span>
          <span className="text-[13px] text-muted-foreground line-clamp-2">
            {state.found ? `Found: ${state.found}` : step}
          </span>
        </div>
      ) : (
        <form
          noValidate
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex-1 flex items-start gap-1 px-4 pt-3.5"
        >
          <span className="text-[15px] text-muted-foreground/80 select-none">https://</span>
          <label className="sr-only" htmlFor="asb-url">Your company website</label>
          <input
            id="asb-url"
            name="website"
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            autoCapitalize="none"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/^https?:\/\//i, ""))}
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancel();
            }}
            placeholder="yourcompany.com"
            className="min-w-0 flex-1 bg-transparent text-[16px] sm:text-[15px] outline-none placeholder:text-muted-foreground/60"
            {...PASSWORD_MANAGERS_OFF}
          />
        </form>
      )}
      <div className="flex items-center gap-2 px-2.5 pb-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={reading}
          className="px-2 min-h-9 text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          Cancel
        </button>
        <span className={cn("flex-1 text-right text-[12px]", state.phase === "error" ? "text-[#ff6b47]" : "text-muted-foreground")}>
          {state.phase === "error" ? state.message : reading ? "" : "Reads your homepage"}
        </span>
        {!reading && (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!value.trim()}
            className="rounded-[2px] px-4 min-h-9 text-[13px] font-semibold text-[#0a0a08] disabled:opacity-40 transition-opacity"
            style={{ background: GREEN }}
          >
            Read it
          </button>
        )}
      </div>
    </div>
  );
}

const STAGES = ["Pre-revenue", "Finding PMF", "Scaling", "Plateau"];

/** What the site told us, then what only the founder knows. Every keystroke is saved; nothing waits for a blur. */
function CompanyDetails({ profile, onRemove, onClose }: { profile: CompanyProfile; onRemove: () => void; onClose: () => void }) {
  const [draft, setDraft] = useState<CompanyProfile>(profile);
  const [editing, setEditing] = useState(false);
  const set = (patch: Partial<CompanyProfile>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    writeCompany(next);
  };
  const input =
    "mt-1.5 block w-full rounded-[2px] border border-border bg-background px-3 h-11 font-sans text-[16px] sm:text-[15px] font-light normal-case tracking-normal text-foreground outline-none transition-colors placeholder:text-dim focus:border-acid";
  const label = "sx-label block !text-[10px] text-muted-foreground";

  return (
    <>
      <div className="flex items-center gap-3">
        <CompanyLogo profile={draft} size={36} />
        <span className="min-w-0 flex-1 leading-tight">
          <strong className="block truncate text-[16px] font-medium text-foreground">{draft.business_name}</strong>
          <span className="sx-label !text-[10px] text-dim">{domainOf(draft.website)}</span>
        </span>
        <button type="button" onClick={onRemove} className="sx-label min-h-9 px-2 !text-[10px] text-muted-foreground hover:text-[#ff6b47]">
          Remove
        </button>
      </div>

      {/* What we read */}
      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <p className={label}>Read from your site</p>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[12px] text-acid hover:underline"
          >
            <Pencil className="h-3 w-3" /> {editing ? "Done" : "Correct it"}
          </button>
        </div>
        {editing ? (
          <textarea
            value={draft.summary ?? ""}
            onChange={(e) => set({ summary: e.target.value })}
            rows={4}
            autoFocus
            className="mt-2 block w-full resize-none rounded-[2px] border border-acid bg-background px-3 py-2 text-[16px] leading-relaxed text-foreground outline-none sm:text-[14px]"
            {...PASSWORD_MANAGERS_OFF}
          />
        ) : (
          <p className="mt-2 text-[14px] leading-relaxed text-foreground/90">{draft.summary}</p>
        )}
        {!editing && draft.facts && draft.facts.length > 0 && (
          <dl className="mt-3 space-y-2 text-[13px] leading-snug">
            {draft.facts.map((f) => (
              <div key={f.label} className="grid grid-cols-[64px_1fr] gap-3">
                <dt className={label}>{f.label}</dt>
                <dd className="line-clamp-2 text-muted-foreground" title={f.value}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* What a website never says */}
      <div className="mt-4 border-t border-border pt-4">
        <p className={label}>What your site doesn’t say · all optional</p>

        <div className="mt-3 grid grid-cols-2 gap-px border border-border bg-border" role="radiogroup" aria-label="Transformer or Builder">
          {(
            [
              ["Transformer", "Existing SaaS, going AI-first"],
              ["Builder", "AI-native from the start"],
            ] as const
          ).map(([kind, hint]) => {
            const on = draft.kind === kind;
            return (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set({ kind: on ? undefined : kind })}
                className={cn(
                  "px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-acid",
                  on ? "bg-acid text-[#0a0a08]" : "bg-background text-foreground hover:bg-raised"
                )}
              >
                <span className="block text-[14px] font-medium">{kind}</span>
                <span className={cn("block text-[12px] leading-snug", on ? "text-[#0a0a08]/75" : "text-muted-foreground")}>{hint}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3">
          <label className={label}>
            ARR
            <input
              value={draft.arr ?? ""}
              onChange={(e) => set({ arr: e.target.value })}
              placeholder="€2.4M"
              inputMode="text"
              autoComplete="off"
              className={input}
              {...PASSWORD_MANAGERS_OFF}
            />
          </label>
          <label className={label}>
            Stage, in your words
            <input
              value={draft.stage ?? ""}
              onChange={(e) => set({ stage: e.target.value })}
              placeholder="Finding PMF"
              autoComplete="off"
              className={input}
              {...PASSWORD_MANAGERS_OFF}
            />
          </label>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {STAGES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => set({ stage: st })}
              className={cn(
                "rounded-[2px] border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                draft.stage === st ? "border-acid text-acid" : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
              )}
            >
              {st}
            </button>
          ))}
        </div>

        <label className={cn(label, "mt-3")}>
          The decision in front of you
          <input
            value={draft.goal ?? ""}
            onChange={(e) => set({ goal: e.target.value })}
            placeholder="Move off per-seat pricing this quarter?"
            autoComplete="off"
            className={input}
            {...PASSWORD_MANAGERS_OFF}
          />
        </label>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-[12px] leading-snug text-dim">Saved as you type, in this browser only.</p>
        <button type="button" onClick={onClose} className="sx-btn !min-h-10 !px-5 shrink-0">
          Done
        </button>
      </div>
    </>
  );
}

/** Details for a set company (or the URL field when none): a popover, a bottom sheet on phones. */
export function CompanyPopover({
  onClose,
  placement = "up",
  align = "left",
}: {
  onClose: () => void;
  placement?: "up" | "down";
  align?: "left" | "right";
}) {
  const [profile, setProfile] = useCompanyProfile();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target) && !(target as HTMLElement).closest?.("[data-company-trigger]")) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  // Rendered at the end of <body>: a dialog must not sit inside the composer's <form>,
  // and it should never be clipped by the header or a scrolling panel.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-[2px]" aria-hidden="true" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Your company"
        className={cn(
          "fixed z-[61] border border-border bg-surface p-5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-y-auto sx-scroll",
          "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[10px] pb-6",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[460px] sm:max-w-[calc(100vw-2rem)] sm:max-h-[min(720px,calc(100dvh-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2px] sm:p-6"
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />
        {profile?.business_name ? (
          <CompanyDetails
            profile={profile}
            onRemove={() => {
              track("Company removed", { domain: domainOf(profile.website) });
              setProfile(null);
              onClose();
            }}
            onClose={onClose}
          />
        ) : (
          <>
            <p className="font-medium text-[17px]">Add your company</p>
            <p className="mt-1 mb-3 text-[13px] text-muted-foreground">Every answer on the site gets specific to your company.</p>
            <CompanyUrlBox onCancel={onClose} onDone={onClose} className="min-h-[104px]" />
          </>
        )}
      </div>
    </>
    , document.body
  );
}

const DOMAIN_RE =
  /(?:^|[\s(])((?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]{0,61}(?:\.[a-z0-9-]{1,63})*\.(?:com|io|co|ai|app|dev|net|org|so|xyz|me|tv|video|fm|studio|ly|sh|gg|us|uk|de|fr|es|nl|ca|au|in|eu|tech|info|biz|club|academy|coach|school|courses))(?=$|[\s.,;:!?)/])/i;

/** B: a domain typed into the question is offered as a one-tap hot seat. */
export function CompanyDetectStrip({ text, className }: { text: string; className?: string }) {
  const [profile] = useCompanyProfile();
  const { state, read } = useCompanyReader();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const domain = useMemo(() => {
    const m = text.match(DOMAIN_RE);
    return m ? domainOf(m[1]) : null;
  }, [text]);
  const reading = state.phase === "reading";
  const step = useReadingStep(reading);
  if (!domain || dismissed.includes(domain) || (!reading && domainOf(profile?.website) === domain)) return null;
  return (
    <div
      className={cn(
        "mt-2 flex flex-wrap items-center gap-2 rounded-[2px] border border-border bg-surface px-3 py-2 text-[13.5px]",
        className
      )}
      aria-live="polite"
    >
      <span className="flex-1 min-w-[180px]">
        {reading ? (
          <span className="text-muted-foreground">{state.found ? `Found: ${state.found}` : step}</span>
        ) : state.phase === "error" ? (
          <span className="text-[#ff6b47]">{state.message}</span>
        ) : (
          <>
            Answer for <strong>{domain}</strong>? You get the founders closest to its situation.
          </>
        )}
      </span>
      {!reading && (
        <>
          <button
            type="button"
            onClick={() => void read(domain)}
            className="rounded-[2px] px-3.5 min-h-8 text-[13px] font-semibold text-[#0a0a08]"
            style={{ background: GREEN }}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setDismissed((d) => [...d, domain])}
            className="px-1.5 min-h-8 text-[13px] text-muted-foreground hover:text-foreground"
          >
            No thanks
          </button>
        </>
      )}
    </div>
  );
}

/** C: the empty chair in an episode's cast row. */
export function CompanySeat() {
  const [profile] = useCompanyProfile();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        data-company-trigger
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2.5 rounded-[2px] border-[1.5px] py-2 pl-2 text-left transition-colors",
          profile?.business_name
            ? "border-acid bg-raised hover:bg-raised pr-3"
            : "border-dashed border-border bg-surface hover:bg-raised pr-4"
        )}
      >
        {profile?.business_name ? (
          <>
            <CompanyLogo profile={profile} size={40} />
            <span className="text-[13px] leading-tight">
              <span className="block font-semibold text-foreground">{profile.business_name}</span>
              <span className="text-acid">You · answers are for you</span>
            </span>
            <Pencil className="ml-1 h-3.5 w-3.5 text-acid" />
          </>
        ) : (
          <>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-dashed border-border text-acid">
              <Plus className="h-4 w-4" />
            </span>
            <span className="text-[13px] leading-tight">
              <span className="block font-semibold text-acid">You</span>
              <span className="text-foreground/70">Add your company</span>
            </span>
          </>
        )}
      </button>
      {open && <CompanyPopover onClose={() => setOpen(false)} placement="down" align="left" />}
    </div>
  );
}

/** Pill + popover in one, for headers and other tight spots (e.g. /ask). */
export function CompanyControl({ align = "right" }: { align?: "left" | "right" }) {
  const [profile] = useCompanyProfile();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" data-company-trigger>
      <CompanyPill profile={profile} open={open} onAdd={() => setOpen(true)} onOpen={() => setOpen((o) => !o)} />
      {open && <CompanyPopover onClose={() => setOpen(false)} placement="down" align={align} />}
    </div>
  );
}

/** Composer accessory: "+ Your company" turns the composer into the URL field; a filled pill opens details upward. */
export function ComposerCompanyPill({ onAdd }: { onAdd: () => void }) {
  const [profile] = useCompanyProfile();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" data-company-trigger>
      <CompanyPill profile={profile} open={open} onAdd={onAdd} onOpen={() => setOpen((o) => !o)} />
      {open && <CompanyPopover onClose={() => setOpen(false)} placement="up" align="left" />}
    </div>
  );
}
