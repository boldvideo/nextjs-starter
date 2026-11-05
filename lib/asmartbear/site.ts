import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { gtmFacts, gtmText, profileFromPages } from "./gtm";

/**
 * Reads a visitor's company website for "Add your company" (ported from
 * boldvideo/gtm-game lib/gym-site.ts): name, one-line summary, and enough
 * a go-to-market profile (buyer, price, motion, proof) written by Claude from
 * the homepage plus the pricing, customers, about and product pages. Without
 * ANTHROPIC_API_KEY, or if the model fails, it falls back to the homepage's
 * own headline text. The profile goes along as Bold's inline viewer profile.
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
  /** Short labeled facts for the company card (buyer, price, motion) */
  facts?: { label: string; value: string }[];
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
const UA = "Mozilla/5.0 (compatible; SmartBearLiveBot/1.0; +https://smartbearlive.bold.video)";

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

/** Every block of visible text on a page, one line per block, deduped. */
function pageText(html: string, cap: number): string {
  const body = (html.match(/<body\b[\s\S]*$/i)?.[0] ?? html)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|footer)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|h[1-6]|li|div|tr|td|th|section|article|dt|dd|blockquote|figcaption|button|a)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const seen = new Set<string>();
  const lines: string[] = [];
  let size = 0;
  for (const raw of body.split("\n")) {
    const line = clean(raw);
    if (line.length < 2 || seen.has(line) || /^(cookie|accept|©)/i.test(line)) continue;
    seen.add(line);
    if (size + line.length > cap) break;
    lines.push(line);
    size += line.length + 1;
  }
  return lines.join("\n");
}

type PageKind = "pricing" | "customers" | "about" | "product" | "audience";

const KINDS: { kind: PageKind; path: RegExp; label: RegExp }[] = [
  { kind: "pricing", path: /\/(pricing|plans|prices)\/?$/i, label: /^(pricing|plans|plans & pricing|plans and pricing|prices)$/i },
  { kind: "customers", path: /\/(customers|case-studies|stories|success-stories|testimonials|results|clients|wall-of-love)\/?$/i, label: /^(customers|case studies|customer stories|success stories|testimonials|results|clients|wall of love)$/i },
  { kind: "about", path: /\/(about|about-us|company|our-story|team)\/?$/i, label: /^(about|about us|our story|company|team|who we are)$/i },
  { kind: "product", path: /\/(product|features|platform|how-it-works|tour)\/?$/i, label: /^(product|features|platform|how it works|tour|what we do)$/i },
  { kind: "audience", path: /\/(solutions|use-cases|who-its-for|industries)\/?$/i, label: /^(solutions|use cases|who it's for|who it’s for|industries)$/i },
];

/** Same-site pages worth reading for a go-to-market picture, from every link on the homepage (nav and footer included). */
function pagesToRead(html: string, base: string): { kind: PageKind; url: string }[] {
  const origin = new URL(base).origin;
  const found = new Map<PageKind, string>();
  const re = /<a\b[^>]*href=["']([^"'#?]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const label = clean(m[2].replace(/<[^>]+>/g, " "));
    let url: URL;
    try {
      url = new URL(m[1], base);
    } catch {
      continue;
    }
    if (url.origin !== origin || url.pathname === "/" || url.pathname.length > 80) continue;
    const href = url.origin + url.pathname.replace(/\/$/, "");
    if (Array.from(found.values()).some((u) => u.replace(/\/$/, "") === href)) continue;
    for (const { kind, path, label: lre } of KINDS) {
      if (!found.has(kind) && (path.test(url.pathname) || lre.test(label))) {
        found.set(kind, url.origin + url.pathname);
        break;
      }
    }
  }
  // Most sites have /pricing even when the homepage hides the link behind a menu script.
  if (!found.has("pricing")) found.set("pricing", `${origin}/pricing`);
  return KINDS.filter((k) => found.has(k.kind)).map((k) => ({ kind: k.kind, url: found.get(k.kind)! }));
}

const CAPS: Record<PageKind | "home", number> = { home: 7000, pricing: 7000, customers: 4000, about: 3500, product: 3500, audience: 3000 };

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

  // Read the pages a founder-advisor would click first, in parallel.
  const extra = await Promise.all(
    pagesToRead(home.html, home.url).map(async ({ kind, url }) => {
      try {
        const page = await safeFetch(url, AbortSignal.timeout(6000));
        const text = page ? pageText(page.html, CAPS[kind]) : "";
        return text.length > 80 ? { kind, url: page!.url, text } : null;
      } catch {
        return null;
      }
    })
  );
  const read = [{ kind: "home" as const, url: home.url, text: pageText(home.html, CAPS.home) }, ...extra.filter((p) => p !== null)];

  const name = nameFrom(home.html, site.domain);
  const fallbackText = visibleText(home.html);
  const fallbackSummary = summaryFrom(home.html, fallbackText);
  if (!fallbackSummary && read[0].text.length < 40) return { ok: false, error: "empty" };

  const base = { website: `https://${site.domain}`, domain: site.domain, pages: read.map((p) => p.url), icon: iconFrom(home.html, home.url) };
  const gtm = await profileFromPages(name, site.domain, read).catch((e) => {
    console.error("[company] profile model failed", e instanceof Error ? e.message : e);
    return null;
  });
  if (!gtm) return { ok: true, profile: { ...base, name, summary: fallbackSummary, text: fallbackText } };
  return { ok: true, profile: { ...base, name: gtm.name || name, summary: gtm.summary, text: gtmText(gtm), facts: gtmFacts(gtm) } };
}
