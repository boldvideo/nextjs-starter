// Seeds the A Smart Bear dataset from scripts/seed-data.json (built from the
// brand dossier, YouTube descriptions and Bold). Idempotent: createOrReplace
// by fixed ids, images uploaded once per file (Sanity dedupes by hash).
//   SANITY_TOKEN=... npx tsx scripts/seed.ts
import { createClient } from "@sanity/client";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";

const token = process.env.SANITY_TOKEN;
if (!token) throw new Error("SANITY_TOKEN is not set");

const client = createClient({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? "je17v8aj",
  dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  apiVersion: "2025-02-19",
  token,
  useCdn: false,
});

type Seed = Record<string, any>;
const data: Seed = JSON.parse(readFileSync(new URL("./seed-data.json", import.meta.url), "utf8"));

const ref = (id: string) => ({ _type: "reference", _ref: id, _key: id.replace(/\W/g, "") });

async function image(path?: string | null) {
  if (!path || !existsSync(path)) return undefined;
  const asset = await client.assets.upload("image", createReadStream(path), { filename: basename(path) });
  return { _type: "image", asset: { _type: "reference", _ref: asset._id } };
}

async function main() {
  const tx = client.transaction();

  for (const p of data.people) {
    tx.createOrReplace({
      _id: p._id,
      _type: "person",
      name: p.name,
      slug: { _type: "slug", current: p.slug },
      company: p.company,
      companyUrl: p.companyUrl ?? undefined,
      x: p.x ?? undefined,
      photo: await image(p.photo),
    });
  }

  for (const c of data.chapters) tx.createOrReplace({ _type: "bookChapter", ...c });

  for (const t of data.tools) {
    tx.createOrReplace({
      _id: t._id,
      _type: "tool",
      name: t.name,
      slug: { _type: "slug", current: t._id.replace("tool-", "") },
      summary: t.summary,
      articleUrl: t.articleUrl ?? undefined,
      chapter: t.chapter ? { _type: "reference", _ref: `chapter-${t.chapter}` } : undefined,
    });
  }

  for (const e of data.episodes) {
    const key = `e${String(e.number).padStart(2, "0")}`;
    const extra = data[key] ?? {};
    tx.createOrReplace({
      _id: e._id,
      _type: "episode",
      number: e.number,
      title: e.title,
      boldSlug: e.boldSlug,
      youtubeId: e.youtubeId,
      publishedAt: e.publishedAt,
      company: e.company,
      host: { _type: "reference", _ref: "person-jason-cohen" },
      hotSeat: e.hotSeat.map((s: string) => ref(`person-${s}`)),
      cohosts: e.cohosts.map((s: string) => ref(`person-${s}`)),
      logline: { quote: e.logline.quote, at: e.logline.at ?? undefined },
      crux: extra.crux,
      moments: (extra.moments ?? []).map((m: Seed) => ({
        _key: m.slug,
        _type: "moment",
        quote: m.quote,
        at: m.at,
        slug: { _type: "slug", current: m.slug },
        speaker: { _type: "reference", _ref: `person-${m.speaker}` },
      })),
      tools: (data.episodeTools[key] ?? []).map((id: string) => ref(id)),
    });
  }

  for (const t of data.talks) tx.createOrReplace({ _type: "talk", ...t });

  tx.createOrReplace({
    _id: "book",
    _type: "book",
    title: data.book.title,
    subtitle: data.book.subtitle,
    url: data.book.url,
    skillsUrl: data.book.skillsUrl,
    pitch: data.book.pitch,
    cover: await image(data.book.cover),
    blurbs: data.blurbs.map((b: Seed, i: number) => ({ _key: `b${i}`, _type: "blurb", ...b })),
  });

  tx.createOrReplace({
    _id: "siteSettings",
    _type: "siteSettings",
    ...data.site,
    banners: data.site.banners.map((b: Seed, i: number) => ({ _key: `n${i}`, _type: "banner", ...b })),
  });

  const res = await tx.commit();
  console.log(`seeded ${res.results.length} documents`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
