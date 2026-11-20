/** The assistant's mark: an acid square with a forward slash, the "shift" key idea. Never a person's face. */
export function CopilotMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-ctl bg-acid text-[#0a0a08]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square">
        <path d="M5 14l7-8 7 8M9 14v5h6v-5" />
      </svg>
    </span>
  );
}
