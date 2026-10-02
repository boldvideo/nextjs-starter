"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { onArcadeEvent, openDodger, setSecret, sfx, unlock } from "@/lib/gym-arcade";
import { track } from "@/lib/gym-track";

/**
 * A controller that slides up from the bottom, for everyone without a
 * keyboard (and everyone who asked "how do I even type that?"). It doesn't
 * give the code away: you still have to know it. Ten presses fill the
 * readout; a wrong one buzzes and starts over; the right one opens the
 * secret level, same as typing it.
 *
 * Our own pad: dark glass, neon cross, two round buttons. Evokes the era,
 * copies no console.
 */

type Step = "up" | "down" | "left" | "right" | "b" | "a";

const CODE: Step[] = ["up", "up", "down", "down", "left", "right", "left", "right", "b", "a"];
const GLYPH: Record<Step, string> = { up: "↑", down: "↓", left: "←", right: "→", b: "B", a: "A" };

export function GymCodePad({ onClose }: { onClose: () => void }) {
  const [entered, setEntered] = useState<Step[]>([]);
  const [state, setState] = useState<"idle" | "wrong" | "right">("idle");
  const readout = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  // Typed the code on a keyboard while the pad was up: the arcade takes it from here
  useEffect(() => onArcadeEvent((e) => (e.type === "secret" && e.on) || e.type === "dodger" ? onClose() : undefined), [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const press = useCallback(
    (step: Step) => {
      if (done.current || state === "wrong") return;
      navigator.vibrate?.(8);
      const next = [...entered, step];
      if (CODE[next.length - 1] !== step) {
        sfx("miss");
        navigator.vibrate?.([30, 40, 30]);
        setEntered(next);
        setState("wrong");
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          readout.current?.animate(
            [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(7px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(0)" }],
            { duration: 320 }
          );
        }
        setTimeout(() => {
          setEntered([]);
          setState("idle");
        }, 650);
        return;
      }
      sfx("select");
      setEntered(next);
      if (next.length === CODE.length) {
        done.current = true;
        setState("right");
        sfx("powerup");
        track("Konami", { via: "pad" });
        setTimeout(() => {
          setSecret(true);
          unlock("konami");
          onClose();
          openDodger();
        }, 700);
      }
    },
    [entered, state, onClose]
  );

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Enter the code">
      <button
        type="button"
        aria-label="Close the controller"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(6,3,14,0.7)] backdrop-blur-[2px] cursor-default motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      />
      <div
        className={cn(
          "relative w-full max-w-[460px] mx-3 mb-3 md:mb-8 rounded-[28px] border p-4 pb-5 md:p-5",
          "bg-[linear-gradient(180deg,#1b0d33_0%,#0e0620_100%)] shadow-[0_-10px_60px_-10px_rgba(255,46,166,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]",
          "motion-safe:animate-in motion-safe:slide-in-from-bottom-full motion-safe:duration-300 motion-safe:ease-out",
          state === "right" ? "border-[var(--gym-yellow)]" : "border-[var(--gym-pink)]/60"
        )}
      >
        <div className="flex items-center justify-between">
          <p className="font-osd text-[17px] leading-none text-[var(--gym-cyan)]">PLAYER 1 · ENTER THE CODE</p>
          <button type="button" onClick={onClose} aria-label="Close" className="h-8 w-8 grid place-items-center rounded-full text-foreground/70 hover:text-foreground cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* The readout: ten slots */}
        <div ref={readout} className="mt-3 grid grid-cols-10 gap-1 rounded-xl bg-black/50 border border-white/10 p-1.5" aria-live="polite">
          {CODE.map((_, i) => {
            const step = entered[i];
            const wrong = state === "wrong" && i === entered.length - 1;
            return (
              <span
                key={i}
                className={cn(
                  "h-9 grid place-items-center rounded-md font-osd text-[22px] leading-none transition-colors",
                  !step && "bg-white/[0.04] text-transparent",
                  step && state === "idle" && "bg-[var(--gym-pink)]/15 text-[var(--gym-pink)] [text-shadow:0_0_8px_var(--gym-pink)]",
                  step && state === "right" && "bg-[var(--gym-yellow)]/20 text-[var(--gym-yellow)] [text-shadow:0_0_10px_var(--gym-yellow)]",
                  step && state === "wrong" && (wrong ? "bg-red-500/30 text-red-300" : "bg-white/[0.06] text-foreground/40")
                )}
              >
                {step ? GLYPH[step] : "·"}
              </span>
            );
          })}
        </div>
        <p className="mt-2 h-4 text-center font-osd text-[15px] leading-none text-muted-foreground">
          {state === "right" ? (
            <span className="text-[var(--gym-yellow)]">RESPECT. LOADING THE SECRET LEVEL…</span>
          ) : state === "wrong" ? (
            <span className="text-red-300">NOPE. FROM THE TOP.</span>
          ) : entered.length === 0 ? (
            "YOU KNOW IT. EVERYBODY KNOWS IT."
          ) : (
            `${entered.length} / 10`
          )}
        </p>

        {/* The pad */}
        <div className="mt-4 flex items-center justify-between gap-2 sm:gap-4 px-1">
          <div className="relative h-[150px] w-[150px] shrink-0" aria-label="Direction pad" role="group">
            <span className="absolute left-1/2 top-1/2 h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2 rounded-md bg-[#2a1450]" aria-hidden />
            <PadKey step="up" onPress={press} className="left-1/2 top-0 -translate-x-1/2 rounded-t-xl" />
            <PadKey step="down" onPress={press} className="left-1/2 bottom-0 -translate-x-1/2 rounded-b-xl" />
            <PadKey step="left" onPress={press} className="left-0 top-1/2 -translate-y-1/2 rounded-l-xl" />
            <PadKey step="right" onPress={press} className="right-0 top-1/2 -translate-y-1/2 rounded-r-xl" />
          </div>

          <div className="hidden sm:flex flex-col items-center gap-2">
            <span className="font-osd text-[13px] leading-none text-muted-foreground/70 tracking-[0.2em]">TURBO</span>
            <span className="h-1.5 w-12 rounded-full bg-[var(--gym-pink)]/40 shadow-[0_0_10px_var(--gym-pink)]" aria-hidden />
          </div>

          <div className="relative h-[130px] w-[136px] shrink-0">
            <RoundKey step="b" onPress={press} className="left-0 bottom-2" />
            <RoundKey step="a" onPress={press} className="right-0 top-2" />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

const KEY_LABEL: Record<Step, string> = { up: "Up", down: "Down", left: "Left", right: "Right", b: "B", a: "A" };

function PadKey({ step, onPress, className }: { step: Step; onPress: (s: Step) => void; className: string }) {
  return (
    <button
      type="button"
      aria-label={KEY_LABEL[step]}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress(step);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPress(step);
        }
      }}
      className={cn(
        "absolute h-[52px] w-[52px] grid place-items-center select-none touch-manipulation cursor-pointer",
        "bg-[#2a1450] border border-[var(--gym-pink)]/50 text-[var(--gym-pink)] text-[20px] font-osd",
        "shadow-[0_4px_0_#12062a,0_0_18px_-6px_var(--gym-pink)] active:translate-y-[3px] active:shadow-[0_1px_0_#12062a,0_0_24px_-4px_var(--gym-pink)]",
        "transition-[transform,box-shadow] duration-75",
        className
      )}
    >
      {GLYPH[step]}
    </button>
  );
}

function RoundKey({ step, onPress, className }: { step: Step; onPress: (s: Step) => void; className: string }) {
  return (
    <span className={cn("absolute flex flex-col items-center gap-1", className)}>
      <button
        type="button"
        aria-label={`${KEY_LABEL[step]} button`}
        onPointerDown={(e) => {
          e.preventDefault();
          onPress(step);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPress(step);
          }
        }}
        className={cn(
          "h-[60px] w-[60px] rounded-full select-none touch-manipulation cursor-pointer",
          "bg-[radial-gradient(circle_at_35%_30%,#ffe98a,#ffd23f_45%,#d99a00)] text-[#1a0616] font-display text-[20px]",
          "shadow-[0_5px_0_#7a4f00,0_0_22px_-4px_var(--gym-yellow)] active:translate-y-[4px] active:shadow-[0_1px_0_#7a4f00,0_0_30px_-2px_var(--gym-yellow)]",
          "transition-[transform,box-shadow] duration-75"
        )}
      >
        {KEY_LABEL[step]}
      </button>
    </span>
  );
}
