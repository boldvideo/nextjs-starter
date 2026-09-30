"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GymBackdrop } from "@/components/gym/gym-backdrop";
import { sfx } from "@/lib/gym-arcade";

/** 404 as the machine sees it: GAME OVER, CONTINUE? 9…8…, then back to start. */
export default function NotFound() {
  const router = useRouter();
  const [count, setCount] = useState(9);

  useEffect(() => {
    sfx("gameover");
  }, []);

  useEffect(() => {
    if (count <= 0) {
      router.push("/");
      return;
    }
    const id = setTimeout(() => setCount((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [count, router]);

  // Any key continues
  useEffect(() => {
    const onKey = () => router.push("/");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden grid place-items-center px-4">
      <GymBackdrop variant="dim" />
      <div className="relative text-center">
        <p className="font-osd text-[22px] text-muted-foreground">ERROR 404 · LEVEL NOT FOUND</p>
        <h1 className="mt-2 font-display text-[64px] md:text-[120px] leading-[0.9] text-[var(--gym-pink)] [text-shadow:0_0_40px_rgba(255,46,166,0.6)]">
          GAME
          <br />
          OVER
        </h1>
        <p className="mt-6 text-lg text-foreground/85">Thank you, founder! But this page is in another castle.</p>
        <Link
          href="/"
          className="mt-8 inline-block font-osd text-[34px] md:text-[42px] leading-none text-[var(--gym-yellow)] hover:[text-shadow:0_0_16px_var(--gym-yellow)]"
        >
          CONTINUE? <span className="tabular-nums">{count}</span>
        </Link>
        <p className="mt-3 font-osd text-[18px] text-muted-foreground/70">PRESS ANY KEY</p>
      </div>
    </div>
  );
}
