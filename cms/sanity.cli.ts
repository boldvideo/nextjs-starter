import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? "je17v8aj",
    dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  },
  studioHost: "asmartbear",
  deployment: { appId: "fj0eetpocc2qy8wh5oeqcfk1" },
});
