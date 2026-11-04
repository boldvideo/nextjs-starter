import { defineArrayMember, defineField, defineType } from "sanity";

// Bold owns video, transcript, chapters and the AI. Sanity owns the editorial
// layer around it: who was on the show, what each episode was about, the
// frameworks, the book and the site's copy. Episodes join to Bold by slug.

const timestamp = defineField({
  name: "at",
  title: "Timestamp",
  type: "string",
  description: "Where in the episode, e.g. 45:32 or 1:04:43. Links straight to that moment.",
  validation: (r) => r.regex(/^\d{1,2}(:\d{2}){1,2}$/, { name: "timestamp" }),
});

export const person = defineType({
  name: "person",
  title: "Person",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "slug", type: "slug", options: { source: "name" }, validation: (r) => r.required() }),
    defineField({ name: "photo", type: "image", options: { hotspot: true } }),
    defineField({ name: "company", type: "string", description: "What they're known for here, e.g. PostPlanify" }),
    defineField({ name: "companyUrl", title: "Company URL", type: "url" }),
    defineField({ name: "bio", type: "text", rows: 3, description: "One or two lines, in their own words where possible" }),
    defineField({ name: "x", title: "X handle", type: "string", description: "Without the @" }),
    defineField({ name: "website", type: "url" }),
  ],
  preview: { select: { title: "name", subtitle: "company", media: "photo" } },
});

export const episode = defineType({
  name: "episode",
  title: "Episode",
  type: "document",
  orderings: [{ title: "Newest first", name: "numberDesc", by: [{ field: "number", direction: "desc" }] }],
  groups: [
    { name: "basics", title: "Basics", default: true },
    { name: "story", title: "Story" },
    { name: "links", title: "Links" },
  ],
  fields: [
    defineField({ name: "number", type: "number", group: "basics", validation: (r) => r.required().integer().positive() }),
    defineField({ name: "title", type: "string", group: "basics", validation: (r) => r.required() }),
    defineField({ name: "boldSlug", title: "Bold video slug", type: "string", group: "basics", description: "Joins this episode to the video, transcript and chapters in Bold", validation: (r) => r.required() }),
    defineField({ name: "youtubeId", title: "YouTube ID", type: "string", group: "basics" }),
    defineField({ name: "publishedAt", type: "date", group: "basics" }),
    defineField({ name: "company", type: "string", group: "basics", description: "The hot-seat company" }),
    defineField({
      name: "hotSeat",
      title: "On the hot seat",
      type: "array",
      group: "basics",
      of: [defineArrayMember({ type: "reference", to: [{ type: "person" }] })],
    }),
    defineField({
      name: "cohosts",
      type: "array",
      group: "basics",
      of: [defineArrayMember({ type: "reference", to: [{ type: "person" }] })],
    }),
    defineField({ name: "host", type: "reference", to: [{ type: "person" }], group: "basics" }),
    defineField({
      name: "logline",
      type: "object",
      group: "story",
      description: "The host's own sentence from the intro, verbatim. Shown under the title.",
      fields: [defineField({ name: "quote", type: "text", rows: 2 }), timestamp],
    }),
    defineField({
      name: "crux",
      title: "The crux",
      type: "object",
      group: "story",
      description: "Four short lines. Every line links to the moment it was said.",
      fields: ["situation", "diagnosis", "options", "landed"].map((name) =>
        defineField({
          name,
          title: { situation: "The situation", diagnosis: "The diagnosis", options: "On the table", landed: "Where it landed" }[name],
          type: "object",
          fields: [defineField({ name: "text", type: "text", rows: 2 }), timestamp],
        })
      ),
    }),
    defineField({
      name: "moments",
      title: "Moments worth sharing",
      type: "array",
      group: "story",
      of: [
        defineArrayMember({
          type: "object",
          name: "moment",
          fields: [
            defineField({ name: "quote", type: "text", rows: 2, description: "Verbatim from the transcript", validation: (r) => r.required() }),
            defineField({ name: "speaker", type: "reference", to: [{ type: "person" }] }),
            timestamp,
            defineField({ name: "slug", type: "slug", options: { source: (_doc, ctx) => (ctx.parent as { quote?: string })?.quote ?? "" } }),
          ],
          preview: { select: { title: "quote", subtitle: "at" } },
        }),
      ],
    }),
    defineField({ name: "tools", title: "Frameworks used", type: "array", group: "links", of: [defineArrayMember({ type: "reference", to: [{ type: "tool" }] })] }),
    defineField({ name: "chapters", title: "Book chapters", type: "array", group: "links", of: [defineArrayMember({ type: "reference", to: [{ type: "bookChapter" }] })] }),
    defineField({ name: "followUp", title: "Where are they now?", type: "text", rows: 3, group: "links" }),
  ],
  preview: {
    select: { n: "number", title: "title", company: "company", media: "hotSeat.0.photo" },
    prepare: ({ n, title, company, media }) => ({ title: `E${String(n).padStart(2, "0")} · ${company ?? ""}`, subtitle: title, media }),
  },
});

export const tool = defineType({
  name: "tool",
  title: "Framework",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "slug", type: "slug", options: { source: "name" } }),
    defineField({ name: "summary", type: "text", rows: 2 }),
    defineField({ name: "articleUrl", title: "Longform article", type: "url" }),
    defineField({ name: "chapter", title: "Book chapter", type: "reference", to: [{ type: "bookChapter" }] }),
  ],
  preview: { select: { title: "name", subtitle: "summary" } },
});

export const bookChapter = defineType({
  name: "bookChapter",
  title: "Book chapter",
  type: "document",
  fields: [
    defineField({ name: "number", type: "number" }),
    defineField({ name: "title", type: "string" }),
    defineField({ name: "promise", type: "text", rows: 2 }),
    defineField({ name: "topics", type: "array", of: [defineArrayMember({ type: "string" })], options: { layout: "tags" }, description: "What makes an answer worth pointing here" }),
  ],
  orderings: [{ title: "Chapter", name: "num", by: [{ field: "number", direction: "asc" }] }],
  preview: { select: { n: "number", title: "title" }, prepare: ({ n, title }) => ({ title: `${n}. ${title}` }) },
});

export const book = defineType({
  name: "book",
  title: "The book",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string" }),
    defineField({ name: "subtitle", type: "string" }),
    defineField({ name: "cover", type: "image" }),
    defineField({ name: "url", title: "Buy URL", type: "url" }),
    defineField({ name: "pitch", type: "array", of: [defineArrayMember({ type: "text", rows: 3 })] }),
    defineField({
      name: "blurbs",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "blurb",
          fields: [defineField({ name: "quote", type: "text", rows: 3 }), defineField({ name: "name", type: "string" }), defineField({ name: "role", type: "string" })],
          preview: { select: { title: "name", subtitle: "quote" } },
        }),
      ],
    }),
    defineField({ name: "skillsUrl", title: "AI skills URL", type: "url" }),
  ],
});

export const talk = defineType({
  name: "talk",
  title: "Talk",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string" }),
    defineField({ name: "note", type: "string" }),
    defineField({ name: "youtubeId", title: "YouTube ID", type: "string" }),
    defineField({ name: "order", type: "number" }),
  ],
  preview: { select: { title: "title", subtitle: "note" } },
});

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site",
  type: "document",
  fields: [
    defineField({ name: "heroEyebrow", type: "string" }),
    defineField({ name: "heroTitle", type: "string" }),
    defineField({ name: "heroTitleItalic", type: "string" }),
    defineField({ name: "heroBody", type: "array", of: [defineArrayMember({ type: "text", rows: 3 })] }),
    defineField({ name: "heroAttribution", type: "string" }),
    defineField({ name: "askTitle", type: "string" }),
    defineField({ name: "askBody", type: "text", rows: 3 }),
    defineField({ name: "hotSeatTitle", type: "string" }),
    defineField({ name: "hotSeatBody", type: "text", rows: 2 }),
    defineField({
      name: "banners",
      type: "array",
      of: [defineArrayMember({ type: "object", name: "banner", fields: [defineField({ name: "label", type: "string" }), defineField({ name: "url", type: "url" }), defineField({ name: "color", type: "string" })] })],
    }),
    defineField({ name: "showUrl", title: "Podcast URL", type: "url" }),
    defineField({ name: "longformUrl", title: "Articles URL", type: "url" }),
    defineField({ name: "longformLine", type: "string" }),
  ],
});

export const SINGLETONS = new Set(["siteSettings", "book"]);
export const schemaTypes = [siteSettings, episode, person, tool, book, bookChapter, talk];
