"use client";

/* eslint-disable @next/next/no-img-element -- company icons come from any host */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Pencil, Plus } from "lucide-react";
import { domainOf, type CompanyProfile } from "@/lib/asmartbear/profile";
import { onCompanyChange, readCompany, writeCompany } from "@/lib/asmartbear/company-store";
import { cn } from "@/lib/utils";

// "Put your company on the hot seat", v2. Nothing ever drops in above the
// composer: the composer itself turns into the URL field (A), a domain typed
// into a question is offered as a one-tap shortcut (B), and on episode pages
// the cast row has an empty seat (C). All three share one profile.

const GREEN = "#577544";
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
        setState({ phase: "error", message: data.error ?? "Couldn't read that site." });
        return false;
      }
      setState({ phase: "reading", domain, found: data.summary });
      const prev = readCompany();
      writeCompany({
        ...(prev && domainOf(prev.website) === data.domain ? prev : {}),
        website: data.website,
        business_name: data.name,
        summary: data.summary,
        business_description: data.text,
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
        className="shrink-0 rounded-[6px] object-cover bg-white ring-1 ring-black/5"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="shrink-0 rounded-[6px] bg-[#141414] text-white font-bold flex items-center justify-center"
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
          "inline-flex max-w-full items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[13px] text-[#2c3d22] transition-colors",
          open ? "border-[#577544] bg-[#e4ebd8]" : "border-[#c9d3b8] bg-[#eef1e6] hover:bg-[#e4ebd8]"
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
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-1 pr-3 min-h-8 text-[13px] font-semibold text-[#2c3d22] hover:border-[#577544] transition-colors"
    >
      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] border-dashed border-[#9fb08a] text-[#577544]">
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
  const submit = async () => {
    if (!value.trim() || reading) return;
    if (await read(value)) onDone();
  };
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-[1.5px] border-[#577544] bg-background shadow-[0_0_0_4px_rgba(87,117,68,0.12)] flex flex-col",
        className
      )}
    >
      {reading && (
        <span
          className="absolute left-0 top-0 h-[3px] bg-[#577544] transition-[width] duration-[2400ms] ease-out"
          style={{ width: state.found ? "100%" : "70%" }}
        />
      )}
      {reading ? (
        <div className="flex-1 px-4 pt-3.5 flex flex-col gap-1.5" aria-live="polite">
          <span className="flex items-center gap-2 text-[14px] font-semibold">
            <span className="h-[18px] w-[18px] rounded-[5px] bg-muted animate-pulse" />
            {state.domain}
          </span>
          <span className="text-[13px] text-muted-foreground line-clamp-2">
            {state.found ? `Found: ${state.found}` : "Reading the homepage…"}
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
        <span className={cn("flex-1 text-right text-[12px]", state.phase === "error" ? "text-[#9a3b1f]" : "text-muted-foreground")}>
          {state.phase === "error" ? state.message : reading ? "" : "Reads your homepage"}
        </span>
        {!reading && (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!value.trim()}
            className="rounded-full px-4 min-h-9 text-[13px] font-semibold text-white disabled:opacity-40 transition-opacity"
            style={{ background: GREEN }}
          >
            Read it
          </button>
        )}
      </div>
    </div>
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
  const [editing, setEditing] = useState(false);
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

  const update = (patch: Partial<CompanyProfile>) => {
    const current = readCompany();
    if (current) setProfile({ ...current, ...patch });
  };

  const field = (key: "mrr" | "churn" | "stage", label: string, placeholder: string) => (
    <label className="block text-[11px] text-muted-foreground">
      {label}
      <input
        defaultValue={profile?.[key] ?? ""}
        onBlur={(e) => update({ [key]: e.target.value })}
        placeholder={placeholder}
        autoComplete="off"
        className="mt-1 block w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[16px] sm:text-[13px] text-foreground outline-none focus:border-[#577544]"
        {...PASSWORD_MANAGERS_OFF}
      />
    </label>
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 sm:hidden" aria-hidden="true" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-label="Your company"
        className={cn(
          "z-50 bg-background border border-border shadow-[0_12px_32px_rgba(20,20,20,0.14)] p-4 text-left",
          "fixed inset-x-0 bottom-0 rounded-t-2xl pb-6",
          "sm:absolute sm:inset-x-auto sm:w-[340px] sm:rounded-2xl sm:pb-4",
          placement === "up" ? "sm:bottom-full sm:mb-2" : "sm:bottom-auto sm:top-full sm:mt-2",
          align === "left" ? "sm:left-0" : "sm:right-0"
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />
        {profile?.business_name ? (
          <>
            <div className="flex items-center gap-2.5">
              <CompanyLogo profile={profile} size={34} />
              <span className="flex-1 min-w-0 leading-tight">
                <strong className="block truncate text-[15px]">{profile.business_name}</strong>
                <span className="text-[12px] text-muted-foreground">{domainOf(profile.website)}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setProfile(null);
                  onClose();
                }}
                className="px-2 min-h-9 text-[12px] text-muted-foreground hover:text-[#9a3b1f]"
              >
                Remove
              </button>
            </div>
            {editing ? (
              <textarea
                defaultValue={profile.summary ?? ""}
                onBlur={(e) => update({ summary: e.target.value })}
                rows={3}
                autoFocus
                className="mt-3 block w-full resize-none rounded-lg border border-[#577544] px-2.5 py-2 text-[16px] sm:text-[13px] leading-relaxed outline-none"
                {...PASSWORD_MANAGERS_OFF}
              />
            ) : (
              <p className="mt-3 text-[13px] leading-relaxed text-foreground/85 line-clamp-4">{profile.summary}</p>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {field("mrr", "MRR", "$")}
              {field("churn", "Churn", "%")}
              {field("stage", "Stage", "Plateau")}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#3f5631] hover:underline"
              >
                <Pencil className="h-3 w-3" /> {editing ? "Done editing" : "Edit how it reads your company"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="sm:hidden rounded-xl px-4 min-h-11 text-[14px] font-semibold text-white"
                style={{ background: GREEN }}
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="font-heading font-bold text-[17px]">Take the hot seat</p>
            <p className="mt-1 mb-3 text-[13px] text-muted-foreground">Every answer on the site gets specific to your company.</p>
            <CompanyUrlBox onCancel={onClose} onDone={onClose} className="min-h-[104px]" />
          </>
        )}
      </div>
    </>
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
  if (!domain || dismissed.includes(domain) || (!reading && domainOf(profile?.website) === domain)) return null;
  return (
    <div
      className={cn(
        "mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-[#c9d3b8] bg-[#f6f8f1] px-3 py-2 text-[13.5px]",
        className
      )}
      aria-live="polite"
    >
      <span className="flex-1 min-w-[180px]">
        {reading ? (
          <span className="text-muted-foreground">{state.found ? `Found: ${state.found}` : `Reading ${domain}…`}</span>
        ) : state.phase === "error" ? (
          <span className="text-[#9a3b1f]">{state.message}</span>
        ) : (
          <>
            Put <strong>{domain}</strong> on the hot seat? Answers get specific to it.
          </>
        )}
      </span>
      {!reading && (
        <>
          <button
            type="button"
            onClick={() => void read(domain)}
            className="rounded-full px-3.5 min-h-8 text-[13px] font-semibold text-white"
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
          "flex items-center gap-2.5 rounded-xl border-[1.5px] py-2 pl-2 text-left transition-colors",
          profile?.business_name
            ? "border-[#577544] bg-[#eef1e6] hover:bg-[#e4ebd8] pr-3"
            : "border-dashed border-[#9fb08a] bg-[#f6f8f1] hover:bg-[#eef1e6] pr-4"
        )}
      >
        {profile?.business_name ? (
          <>
            <CompanyLogo profile={profile} size={40} />
            <span className="text-[13px] leading-tight">
              <span className="block font-semibold text-foreground">{profile.business_name}</span>
              <span className="text-[#3f5631]">You · on the hot seat</span>
            </span>
            <Pencil className="ml-1 h-3.5 w-3.5 text-[#3f5631]" />
          </>
        ) : (
          <>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-dashed border-[#9fb08a] text-[#577544]">
              <Plus className="h-4 w-4" />
            </span>
            <span className="text-[13px] leading-tight">
              <span className="block font-semibold text-[#2c3d22]">You</span>
              <span className="text-foreground/70">Take the hot seat</span>
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
