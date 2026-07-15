import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const notes = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/notes" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    category: z.enum(["AI / AGENTS", "HARDWARE", "BUILD LOG"]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    status: z.enum(["実装中", "検証済み", "運用中"]).default("実装中"),
    stack: z.array(z.string()).default([]),
  }),
});

export const collections = { notes };
