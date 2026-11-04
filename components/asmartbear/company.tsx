"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { domainOf, type CompanyProfile } from "@/lib/asmartbear/profile";
import { onCompanyChange, readCompany, writeCompany } from "@/lib/asmartbear/company-store";
import { cn } from "@/lib/utils";

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

export function CompanyChip({
  profile,
  onOpen,
  onClear,
}: {
  profile: CompanyProfile | null;
  onOpen: () => void;
  onClear: () => void;
}) {
  if (profile?.business_name) {
    return (
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#c9d3b8] bg-[#eef1e6] py-1 pl-3 pr-1 text-[13px] text-[#2c3d22]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#577544]" />
        <button type="button" onClick={onOpen} className="truncate">
          On the hot seat: <strong>{profile.business_name}</strong>
        </button>
        <button type="button" onClick={onClear} aria-label="Remove company" className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-[#dfe6d2]">
          <X className="h-3 w-3" />
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#b9c4a6] bg-[#f3f6ec] px-3 min-h-9 text-[13px] font-semibold text-[#2c3d22] hover:bg-[#e9efdd]"
    >
      <Plus className="h-3.5 w-3.5" /> Add your company
    </button>
  );
}

type Step = "url" | "reading" | "review" | "manual";

export function CompanyForm({
  initial,
  onSave,
  onClose,
}: {
  initial: CompanyProfile | null;
  onSave: (p: CompanyProfile) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>(initial?.business_name ? "review" : "url");
  const [website, setWebsite] = useState(initial?.website ? domainOf(initial.website) ?? "" : "");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CompanyProfile>(initial ?? {});
  const [pages, setPages] = useState<string[]>([]);

  const read = async () => {
    setError(null);
    setStep("reading");
    try {
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't read that site.");
        setStep("url");
        return;
      }
      setPages(data.pages ?? []);
      setDraft((d) => ({
        ...d,
        website: data.website,
        business_name: data.name,
        summary: data.summary,
        business_description: data.text,
      }));
      setStep("review");
    } catch {
      setError("Couldn't reach that site. Describe your company instead.");
      setStep("url");
    }
  };

  const field = (key: keyof CompanyProfile, label: string, placeholder: string, multiline = false) => (
    <label className="block text-[12px] text-muted-foreground">
      {label}
      {multiline ? (
        <textarea
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          value={draft[key] ?? ""}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          placeholder={placeholder}
          rows={2}
          className="mt-1 block w-full resize-none rounded-lg border border-border bg-background px-2.5 py-2 text-[14px] text-foreground outline-none focus:border-[#577544]"
        />
      ) : (
        <input
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          value={draft[key] ?? ""}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          placeholder={placeholder}
          className="mt-1 block w-full rounded-lg border border-border bg-background px-2.5 py-2 text-[14px] text-foreground outline-none focus:border-[#577544]"
        />
      )}
    </label>
  );

  return (
    <div className="mb-3 rounded-2xl border-[1.5px] border-[#577544] bg-background p-4 shadow-[0_0_0_4px_rgba(87,117,68,0.10)]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#3f5631]">
          {step === "review" ? "Your company, as I read it" : "Put your company on the hot seat"}
        </p>
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      {(step === "url" || step === "reading") && (
        <>
          <form
            noValidate
            autoComplete="off"
            data-1p-ignore
            onSubmit={(e) => {
              e.preventDefault();
              if (website.trim()) void read();
            }}
            className="flex gap-2"
          >
            <label className="sr-only" htmlFor="asb-site">Your website</label>
            <input
              id="asb-site"
              name="website"
              type="text"
              inputMode="url"
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="url"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="yourcompany.com"
              autoFocus
              disabled={step === "reading"}
              className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2.5 text-[15px] outline-none focus:border-[#577544]"
            />
            <button
              type="submit"
              disabled={step === "reading" || !website.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 text-[14px] font-semibold text-white disabled:opacity-50"
              style={{ background: "#577544" }}
            >
              {step === "reading" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {step === "reading" ? "Reading…" : "Read it"}
            </button>
          </form>
          {error && <p className="mt-2 text-[13px] text-[#9a3b1f]">{error}</p>}
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            Reads your homepage and about page. Saved only in this browser.
          </p>
          <button type="button" onClick={() => setStep("manual")} className="mt-1 text-[12.5px] text-muted-foreground underline underline-offset-2 hover:text-foreground">
            No website yet? Describe it instead
          </button>
        </>
      )}

      {(step === "review" || step === "manual") && (
        <div className="space-y-2.5">
          {step === "review" && pages.length > 0 && (
            <ul className="space-y-0.5 text-[12.5px] text-muted-foreground">
              {pages.map((p) => (
                <li key={p} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#577544]" /> Read {p.replace(/^https?:\/\//, "")}
                </li>
              ))}
            </ul>
          )}
          {field("business_name", "Company", "Acme")}
          {field("summary", "What it is, and who it’s for", "We help … do …", true)}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {field("mrr", "MRR (optional)", "$")}
            {field("churn", "Monthly churn (optional)", "%")}
          </div>
          {field("goal", "Biggest problem right now (optional)", "Growth went flat after…")}
          <button
            type="button"
            disabled={!draft.business_name?.trim()}
            onClick={() => onSave(draft)}
            className={cn("mt-1 w-full rounded-xl px-4 min-h-11 text-[14px] font-semibold text-white disabled:opacity-50")}
            style={{ background: "#577544" }}
          >
            Looks right, put me on the hot seat
          </button>
        </div>
      )}
    </div>
  );
}

/** Chip + dropdown form in one, for headers and other tight spots. */
export function CompanyControl({ align = "right" }: { align?: "left" | "right" }) {
  const [company, setCompany] = useCompanyProfile();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <CompanyChip profile={company} onOpen={() => setOpen(true)} onClear={() => setCompany(null)} />
      {open && (
        <div className={cn("absolute top-full mt-2 z-30 w-[min(380px,calc(100vw-40px))]", align === "right" ? "right-0" : "left-0")}>
          <CompanyForm
            initial={company}
            onClose={() => setOpen(false)}
            onSave={(p) => {
              setCompany(p);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
