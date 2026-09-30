"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { signInWithGoogle, signOut } from "@/lib/auth-client";
import { useGymMember, type GymProfile } from "./use-gym-member";
import { GymTrophies } from "./gym-trophies";
import { unlock } from "@/lib/gym-arcade";

function domainOf(website: string): string | null {
  const raw = website.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return url.hostname.includes(".") ? url.hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

/**
 * Sign in → get a membership card → tell the coach about your business.
 * The profile is the member's Bold viewer traits; every question they ask
 * afterwards carries it (see lib/gym-viewer.ts).
 */
export function GymMemberPage() {
  const { isPending, signedIn, user, member, refresh } = useGymMember();

  useEffect(() => {
    if (signedIn) unlock("player-card");
  }, [signedIn]);

  if (isPending) return <div className="flex-1" />;

  if (!signedIn) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[560px] mx-auto px-4 py-16 md:py-24 text-center">
          <Image src="/gym/game/logo.webp" alt="" width={120} height={120} className="mx-auto h-28 w-28" />
          <h1 className="mt-6 font-display uppercase text-[34px] md:text-[44px] leading-[0.95] gym-chrome">
            Get your player card
          </h1>
          <p className="mt-5 text-lg text-foreground/80 leading-relaxed">
            Press start to join. Tell the game master about your business once, and every answer after that is built for you, not for some imaginary average startup.
          </p>
          <button
            type="button"
            onClick={() => signInWithGoogle("/player")}
            className="gym-button mt-8 h-14 px-7 rounded-xl text-lg uppercase inline-flex items-center gap-3 cursor-pointer"
          >
            <GoogleMark />
            Sign in with Google
          </button>
          <p className="mt-4 text-xs text-muted-foreground/70">We only use your name, email and photo.</p>
        </div>
        <GymTrophies />
      </div>
    );
  }

  const first = (user?.name || "").split(" ")[0] || "Player";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1080px] mx-auto px-4 md:px-6 py-10 md:py-16 grid gap-10 lg:gap-14 lg:grid-cols-[420px_1fr] items-start">
        <div className="lg:sticky lg:top-6">
          <p className="font-osd text-[20px] text-[var(--gym-cyan)]">PLAYER 1 READY: {first.toUpperCase()}</p>
          <MembershipCard
            name={user?.name || first}
            image={user?.image}
            company={member?.profile?.business_name}
            memberNo={member?.memberNo}
            memberSince={member?.memberSince}
          />
          <button
            type="button"
            onClick={() => signOut().then(() => (window.location.href = "/"))}
            className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>

        {member?.signedIn ? (
          <ProfileForm initial={member.profile ?? {}} onSaved={refresh} />
        ) : (
          <div className="h-80 rounded-2xl bg-white/[0.03] animate-pulse" />
        )}
      </div>
      <GymTrophies />
    </div>
  );
}

function MembershipCard({
  name,
  image,
  company,
  memberNo,
  memberSince,
}: {
  name: string;
  image?: string | null;
  company?: string;
  memberNo?: string;
  memberSince?: string;
}) {
  const since = memberSince
    ? new Date(memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()
    : "TODAY";

  return (
    <div className="relative mt-3 aspect-[1.586] w-full rounded-2xl overflow-hidden p-5 shadow-[0_30px_60px_-20px_rgba(255,46,166,0.55),0_0_0_1px_rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,#1a0b3a_0%,#0b0618_55%,#10213a_100%)]">
      {/* Sun + stripes in the corner */}
      <div className="absolute -right-16 -top-16 h-56 w-56 gym-sun opacity-90" aria-hidden />
      <div className="absolute inset-0 gym-scanlines" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-1.5 gym-sunset-bg" aria-hidden />

      <div className="relative h-full flex flex-col">
        <div className="flex items-center gap-2.5">
          <Image src="/gym/game/logo.webp" alt="" width={40} height={40} className="h-10 w-10" />
          <div className="leading-none">
            <p className="font-display text-[15px] gym-sunset-text">THE GTM GAME</p>
            <p className="mt-1 font-osd text-[14px] text-white/60">PLAYER CARD · FREE PLAY</p>
          </div>
        </div>

        <div className="mt-auto flex items-end gap-4">
          {image ? (
            // Google avatar
            <img src={image} alt="" referrerPolicy="no-referrer" className="h-16 w-16 rounded-xl ring-2 ring-[var(--gym-pink)] object-cover" />
          ) : (
            <span className="h-16 w-16 rounded-xl grid place-items-center gym-sunset-bg font-display text-2xl text-[#1a0616]">
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display text-[20px] leading-tight text-white truncate">{name.toUpperCase()}</p>
            <p className="text-sm text-white/70 truncate">{company || "Company: tell the game master →"}</p>
            <p className="mt-2 font-osd text-[15px] leading-none text-white/55">
              PLAYER No. {memberNo || "······"} · SINCE {since}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileForm({ initial, onSaved }: { initial: GymProfile; onSaved: () => void }) {
  const [profile, setProfile] = useState<GymProfile>(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const domain = domainOf(profile.website ?? "");

  // Pick up the saved profile if it arrives after mount
  useEffect(() => {
    setProfile((p) => (Object.keys(p).length ? p : initial));
  }, [initial]);

  const set = (key: keyof GymProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile((p) => ({ ...p, [key]: e.target.value }));
    if (state === "saved") setState("idle");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    setError(null);
    try {
      const res = await fetch("/api/gym/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't save");
      setState("saved");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
      setState("error");
    }
  };

  const input =
    "w-full h-12 rounded-xl bg-[var(--gym-night-2)] border border-[var(--gym-line)] px-4 text-base text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-[var(--gym-cyan)] focus:shadow-[0_0_24px_-10px_var(--gym-cyan)] transition-[border-color,box-shadow]";

  return (
    <form onSubmit={save} className="space-y-7">
      <div>
        <h1 className="font-display uppercase text-[28px] md:text-[36px] leading-none text-foreground">
          Tell the game master about your business
        </h1>
        <p className="mt-3 text-foreground/75 leading-relaxed max-w-[58ch]">
          The game master reads this before every answer. The more you tell it, the less generic the advice gets.
        </p>
      </div>

      <label className="block">
        <span className="block mb-2 text-sm font-semibold text-foreground/90">Company</span>
        <input value={profile.business_name ?? ""} onChange={set("business_name")} placeholder="Acme" className={input} />
      </label>

      <label className="block">
        <span className="block mb-2 text-sm font-semibold text-foreground/90">Website</span>
        <div className="relative">
          {domain && (
            // Live favicon as you type
            <img
              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
              alt=""
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded"
            />
          )}
          <input
            value={profile.website ?? ""}
            onChange={set("website")}
            placeholder="yourcompany.com"
            inputMode="url"
            className={cn(input, domain && "pl-11")}
          />
        </div>
      </label>

      <label className="block">
        <span className="block mb-2 text-sm font-semibold text-foreground/90">What you sell, who buys it, where you&apos;re stuck</span>
        <textarea
          value={profile.business_description ?? ""}
          onChange={set("business_description")}
          rows={9}
          placeholder={"Paste anything. Your pitch, your homepage copy, your ICP, your numbers.\n\ne.g. We sell AI note-taking to mid-market sales teams. ~$40k MRR, founder-led sales, 3 AEs coming. Outbound gets opens but no meetings. Demos run long."}
          className={cn(input, "h-auto py-3 leading-relaxed resize-y")}
        />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={state === "saving"}
          className="gym-button h-12 px-6 rounded-xl text-base uppercase inline-flex items-center gap-2 cursor-pointer"
        >
          {state === "saving" ? "Saving…" : state === "saved" ? <><Check className="h-5 w-5" strokeWidth={3} /> Game saved</> : "Save game"}
        </button>
        {state === "saved" && (
          <Link href="/" className="inline-flex items-center gap-1.5 font-semibold text-[var(--gym-cyan)] hover:underline">
            The game master knows you now. Press start <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        {state === "error" && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      </div>
    </form>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
