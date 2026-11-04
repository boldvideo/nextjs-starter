import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Reads a visitor's company website for "Add your company" (ported from
 * boldvideo/gtm-game lib/gym-site.ts): name, one-line summary, and enough
 * visible text for the answer model to tune to. No model call here; the ask prompt does the
 * understanding (the profile goes along as Bold's inline viewer profile).
 *
 * Fetches are guarded: public http(s) hosts only, no private addresses,
 * short timeout, small body, few redirects. The page text is data, never
 * instructions: it is only ever shown to the visitor and sent as profile.
 */

export interface SiteProfile {
  website: string;
  domain: string;
  /** Brand name as the site writes it */
  name: string;
  /** One or two sentences, from the site's own description */
  summary: string;
  /** Visible text from the homepage (headline, subheads, first paragraphs) */
  text: string;
  /** Pages that were read, for the "read from" line */
  pages: string[];
  /** The site's own icon (apple-touch-icon or favicon), absolute https URL */
  icon?: string;
}

/** Best icon the homepage declares: apple-touch-icon first, then a sized/plain icon. */
function iconFrom(html: string, base: string): string | undefined {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  const pick = (re: RegExp) => {
    for (const tag of links) {
      const rel = tag.match(/rel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
      if (!re.test(rel)) continue;
      const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
      if (!href) continue;
      try {
        const url = new URL(href, base);
        if (url.protocol === "https:") return url.toString();
      } catch {
        /* skip */
      }
    }
    return undefined;
  };
  return pick(/apple-touch-icon/) ?? pick(/(^|\s)icon(\s|$)/) ?? pick(/shortcut icon/);
}

export type SiteReadError = "invalid" | "unreachable" | "empty";

const TIMEOUT_MS = 8000;
const MAX_BYTES = 600_000;
const MAX_REDIRECTS = 3;
const UA = "Mozilla/5.0 (compatible; SmartBearLiveBot/1.0; +https://asmartbear.bold.video)";

/** "acme.com", "https://www.acme.com/pricing" → https URL + bare domain, or null */
export function normalizeWebsite(input: string): { url: string; domain: string } | null {
  const raw = input.trim().replace(/^(?:https?:\/\/)?(?:www\.)?/i, "");
  if (!raw || raw.length > 253 || /\s/.test(raw)) return null;
  try {
    const url = new URL(`https://${raw}`);
    const host = url.hostname.toLowerCase();
    if (!host.includes(".") || isIP(host) || host.endsWith(".local") || host.endsWith(".internal")) return null;
    if (!/^[a-z0-9.-]+$/.test(host)) return null;
    url.hash = "";
    return { url: url.toString(), domain: host.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

function privateAddress(ip: string): boolean {
  if (ip.includes(":")) {
    const low = ip.toLowerCase();
    return low === "::1" || low.startsWith("fc") || low.startsWith("fd") || low.startsWith("fe80") || low.startsWith("::ffff:");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

async function assertPublicHost(hostname: string) {
  if (isIP(hostname)) {
    if (privateAddress(hostname)) throw new Error("private");
    return;
  }
  const addresses = await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some((a) => privateAddress(a.address))) throw new Error("private");
}

/** GET with redirects resolved by hand so every hop is checked. */
async function safeFetch(startUrl: string, signal: AbortSignal): Promise<{ url: string; html: string } | null> {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const target = new URL(url);
    if (!/^https?:$/.test(target.protocol)) return null;
    await assertPublicHost(target.hostname);
    const res = await fetch(url, {
      redirect: "manual",
      signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "Accept-Language": "en" },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return null;
      url = new URL(location, url).toString();
      continue;
    }
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!/html|xml/.test(type)) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      chunks.push(value);
      if (size >= MAX_BYTES) {
        await reader.cancel().catch(() => {});
        break;
      }
    }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(concat(chunks));
    return { url, html };
  }
  return null;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#x27": "'", "#x2F": "/", mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

function decode(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    const key = code.toLowerCase();
    if (ENTITIES[key]) return ENTITIES[key];
    if (key.startsWith("#x")) return String.fromCodePoint(parseInt(key.slice(2), 16)) || m;
    if (key.startsWith("#")) return String.fromCodePoint(parseInt(key.slice(1), 10)) || m;
    return m;
  });
}

function clean(text: string): string {
  return decode(text).replace(/\s+/g, " ").trim();
}

function meta(html: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`, "i");
    const tag = html.match(re)?.[0];
    const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
    if (content && clean(content)) return clean(content);
  }
  return null;
}

function stripNoise(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|footer|header)[\s\S]*?<\/\1>/gi, " ");
}

function tagsText(html: string, tag: string, limit: number): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < limit) {
    const text = clean(m[1].replace(/<[^>]+>/g, " "));
    if (text.length >= 3 && !out.includes(text)) out.push(text);
  }
  return out;
}

/** Headline, subheads and the first real paragraphs, in reading order. */
function visibleText(html: string): string {
  const body = stripNoise(html);
  const h1 = tagsText(body, "h1", 2);
  const h2 = tagsText(body, "h2", 8);
  const h3 = tagsText(body, "h3", 6);
  const paragraphs = tagsText(body, "p", 40).filter((p) => p.length >= 40 && !/cookie|privacy|©|all rights reserved/i.test(p));
  const lines = [...h1, ...h2.slice(0, 5), ...paragraphs.slice(0, 10), ...h3.slice(0, 4)];
  let text = "";
  for (const line of lines) {
    if (text.length + line.length > 1800) break;
    text += (text ? "\n" : "") + line;
  }
  return text;
}

function nameFrom(html: string, domain: string): string {
  const site = meta(html, ["og:site_name", "application-name"]);
  if (site && site.length <= 60) return site;
  const title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  // "Acme – Payroll for startups" → "Acme"
  const first = title.split(/\s[|\-–—:·•]\s|\s[|–—]\s?|\s\|\s/)[0]?.trim();
  if (first && first.length <= 40 && !/^(home|welcome)$/i.test(first)) return first;
  const label = domain.split(".").slice(0, -1).join(".").split(".").pop() ?? domain;
  return label.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function summaryFrom(html: string, text: string): string {
  const described = meta(html, ["description", "og:description", "twitter:description"]);
  if (described && described.length >= 40) return described.length > 240 ? `${described.slice(0, 239).trimEnd()}…` : described;
  const [headline, ...rest] = text.split("\n");
  const para = rest.find((l) => l.length >= 60) ?? "";
  const line = [headline, para].filter(Boolean).join(". ");
  return line.length > 240 ? `${line.slice(0, 239).trimEnd()}…` : line;
}

/** Links on the homepage that look like an about or product page, same host. */
function secondPage(html: string, base: string): string | null {
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  const origin = new URL(base).origin;
  while ((m = re.exec(html))) {
    const label = clean(m[2].replace(/<[^>]+>/g, " ")).toLowerCase();
    const href = m[1];
    if (!/^(about|about us|our story|company|what we do|product|how it works)$/.test(label) && !/\/(about|company|product)\/?$/i.test(href)) continue;
    try {
      const url = new URL(href, base);
      if (url.origin === origin && url.pathname !== "/" && url.pathname.length < 80) return url.toString();
    } catch {
      /* skip */
    }
  }
  return null;
}

export async function readSite(input: string): Promise<{ ok: true; profile: SiteProfile } | { ok: false; error: SiteReadError }> {
  const site = normalizeWebsite(input);
  if (!site) return { ok: false, error: "invalid" };
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let home: { url: string; html: string } | null;
  try {
    home = await safeFetch(site.url, signal);
    if (!home && !site.url.includes("://www.")) {
      home = await safeFetch(site.url.replace("://", "://www."), signal);
    }
  } catch {
    return { ok: false, error: "unreachable" };
  }
  if (!home) return { ok: false, error: "unreachable" };

  const pages = [home.url];
  let text = visibleText(home.html);
  const more = secondPage(home.html, home.url);
  if (more && text.length < 1400) {
    try {
      const page = await safeFetch(more, AbortSignal.timeout(5000));
      if (page) {
        const extra = visibleText(page.html);
        if (extra) {
          text = `${text}\n${extra}`.slice(0, 2400);
          pages.push(page.url);
        }
      }
    } catch {
      /* the homepage is enough */
    }
  }

  const name = nameFrom(home.html, site.domain);
  const summary = summaryFrom(home.html, text);
  if (!summary && text.length < 40) return { ok: false, error: "empty" };

  return {
    ok: true,
    profile: { website: `https://${site.domain}`, domain: site.domain, name, summary, text, pages, icon: iconFrom(home.html, home.url) },
  };
}
