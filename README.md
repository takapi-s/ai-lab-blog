# Field Notes

AI、miniPC、自動化を実際に試した記録を公開する技術ブログです。

## Stack

- Astro
- TypeScript
- MDX
- React components
- Cloudflare Workers Static Assets

## Development

Node.js 24以上を使います。

```sh
npm install
npm run dev
npm run build
```

記事は `src/content/notes/` にMarkdown/MDXで追加します。

## Cloudflare deployment

GitHub Actions uses two repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

For each pull request, the workflow deploys a preview Worker named `ai-lab-blog-pr-<PR number>` and updates a preview URL comment on the PR. When the pull request is closed, that preview Worker is deleted.

A push to `main` deploys the production Worker `ai-lab-blog`.
