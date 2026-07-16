# Diagram as Code

`ai-lab-blog-architecture.d2` is the source of truth for the architecture diagram.

Generate the web image with D2's dark theme:

```sh
d2 -t 200 docs/diagrams/ai-lab-blog-architecture.d2 public/images/ai-lab-blog-architecture-d2.svg
```

The Astro article embeds the generated SVG so it scales to the article width without rasterization blur. The diagram uses a vertical layout to keep the nested Local miniPC, GitHub, and deployment flow readable on narrow article pages.
