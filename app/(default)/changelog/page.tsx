import type { Metadata } from "next";
import { GymFooter } from "@/components/gym/gym-footer";
import { CHANGELOG } from "@/lib/gym-changelog";
import { gymMeta } from "@/lib/gym-meta";

export const metadata: Metadata = gymMeta({
  title: "Changelog",
  description: "Every version of The GTM Game: what shipped, when.",
  path: "/changelog",
});

export default function ChangelogPage() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
      <main className="mx-auto w-full max-w-[720px] px-4 py-10 md:py-16">
        <p className="font-osd text-[19px] leading-none text-[var(--gym-cyan)]">CHANGELOG</p>
        <h1 className="mt-2 font-display uppercase text-[30px] md:text-[40px] leading-none text-foreground">Patch notes</h1>

        <ol className="mt-10 space-y-10">
          {CHANGELOG.map((r, i) => (
            <li key={r.version} className="grid gap-x-6 gap-y-2 md:grid-cols-[150px_1fr]">
              <div className="font-osd text-[18px] leading-tight text-muted-foreground">
                <span className={i === 0 ? "text-[var(--gym-yellow)]" : "text-foreground/85"}>v{r.version}</span>
                <br />
                {r.date}
              </div>
              <div>
                <h2 className="font-display text-[15px] uppercase text-foreground">{r.name}</h2>
                <ul className="mt-2 space-y-1 font-mono text-[13.5px] leading-relaxed text-foreground/80">
                  {r.changes.map((c) => (
                    <li key={c} className="flex gap-2">
                      <span className="text-[var(--gym-pink)]" aria-hidden>
                        +
                      </span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </main>
      <GymFooter />
    </div>
  );
}
