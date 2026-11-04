import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { SINGLETONS, schemaTypes } from "./schemaTypes";
import { structure } from "./structure";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? "je17v8aj";
const site = process.env.SANITY_STUDIO_SITE_URL ?? "https://asmartbear.bold.video";

export default defineConfig({
  name: "asmartbear",
  title: "A Smart Bear",
  projectId,
  dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  plugins: [structureTool({ structure }), visionTool()],
  schema: { types: schemaTypes },
  document: {
    // "Open preview": the live page for an episode.
    productionUrl: async (prev, { document }) => {
      const d = document as { _type?: string; boldSlug?: string };
      if (d._type === "episode" && d.boldSlug) return `${site}/v/${d.boldSlug}`;
      if (d._type === "siteSettings" || d._type === "book" || d._type === "talk") return site;
      return prev;
    },
    newDocumentOptions: (prev, { creationContext }) =>
      creationContext.type === "global" ? prev.filter((t) => !SINGLETONS.has(t.templateId)) : prev,
    actions: (prev, { schemaType }) =>
      SINGLETONS.has(schemaType) ? prev.filter((a) => !["delete", "duplicate", "unpublish"].includes(a.action ?? "")) : prev,
  },
});
