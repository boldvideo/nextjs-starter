/**
 * "Share this line": one move's words as a shareable card. The URL carries
 * the line itself (short, no storage):
 *   /line?t=<line>&c=<coach slug>&a=<conversation id>
 * /og/line renders the card image from the same params.
 */

export const LINE_MAX = 180;

const SKIP_RE = /^(subject:|hi\b|hey\b|hello\b|dear\b|thanks,?$|best,?$|cheers,?$|\[your name\])/i;

/** The words worth sharing from a "Say it like this" block. */
export function shareLineText(say: string[]): string {
  const lines = say.map((l) => l.trim()).filter((l) => l && !SKIP_RE.test(l));
  return cleanLine((lines.length ? lines : say).join(" "));
}

/** One line, no wrapping quotes, at most LINE_MAX characters. */
export function cleanLine(text: string): string {
  const t = text
    .replace(/\[(?:\d+|c_[^\]]+)\]/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["“”']+|["“”']+$/g, "")
    .replace(/["“”]\s+["“”]/g, " ")
    .trim();
  if (t.length <= LINE_MAX) return t;
  const cut = t.slice(0, LINE_MAX - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), LINE_MAX - 30)).trimEnd()}…`;
}

export function lineParams(input: { line: string; coach?: string | null; conversationId?: string | null }): string {
  const p = new URLSearchParams({ t: cleanLine(input.line) });
  if (input.coach) p.set("c", input.coach);
  if (input.conversationId) p.set("a", input.conversationId);
  return p.toString();
}
