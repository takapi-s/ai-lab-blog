# Diagram as Code

`ai-lab-blog-architecture.d2` is the source of truth for the architecture diagram.

Generate the web image with D2:

```sh
d2 docs/diagrams/ai-lab-blog-architecture.d2 public/images/ai-lab-blog-architecture-d2.svg
```

The Astro article embeds the generated SVG so it scales to the article width without rasterization blur. The Draw.io file in `docs/` is retained as the original editable artifact from the Draw.io MCP workflow.
