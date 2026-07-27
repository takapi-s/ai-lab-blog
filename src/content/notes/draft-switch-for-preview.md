---
title: "下書きを表示するスイッチを、公開経路と分けて持つ"
description: "AstroのコンテンツコレクションとSHOW_DRAFTSを使い、レビュー用Previewだけで下書きを見せる構成をリポジトリの実装から整理します。"
pubDate: 2026-07-27
category: "BUILD LOG"
tags:
  - Astro
  - GitHub Actions
  - Cloudflare Workers
  - 自動化
status: "検証済み"
stack:
  - Astro 7
  - TypeScript
  - GitHub Actions
  - Cloudflare Workers Static Assets
draft: true
---

## 結論

Field Notesの下書き表示は、記事ごとのフラグだけで公開・非公開を切り替えるのではなく、**実行環境のスイッチとコンテンツ側のフラグを組み合わせる**形にしています。

トップページでは、次の条件で記事を絞り込んでいます。

```ts
const showDrafts = import.meta.env.SHOW_DRAFTS === "true";
const noteEntries = await getCollection("notes", ({ data }) =>
  showDrafts || !data.draft
);
```

このリポジトリで確認できる役割分担は次のとおりです。

- 通常のビルド: `draft: true` の記事を一覧から除外する
- PR Preview: GitHub Actionsで `SHOW_DRAFTS: true` を設定し、レビュー対象の記事を表示する
- 本番デプロイ: Previewとは別のジョブでビルドするため、下書きを表示する設定を渡さない

これは「下書きを安全に公開できる」という意味ではありません。Preview用の環境変数がどのジョブに渡るかをレビューしやすくする、という小さな境界です。

## 背景

記事をMarkdownで書けるようにすると、公開前の原稿も本番ビルドの入力になります。ファイルを置いただけで公開される設計では、レビュー中の原稿が一覧やRSSなどに混ざる可能性があります。

一方で、レビューのためにはブラウザで原稿を確認したいことがあります。ローカルだけで見る方法もありますが、PRの変更を他の人が同じURLで確認できるPreviewがあると、文章・リンク・レイアウトをまとめてレビューできます。

そこで今回の実装では、記事のメタデータに `draft` を持たせ、Previewのビルドだけに `SHOW_DRAFTS` を渡しています。記事本文そのものに「Preview専用」の条件分岐を増やさずに済む点が狙いです。

## 構成

### コンテンツコレクションのスキーマ

`src/content.config.ts` の `notes` コレクションは、Markdown/MDXをglob loaderで読み込みます。スキーマでは `draft` を真偽値として定義し、指定がない記事はデフォルトで公開扱いになります。

```ts
loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/notes" }),

schema: z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  // ...
  draft: z.boolean().default(false),
}),
```

記事側で `draft: true` を明示できるので、原稿の状態がファイルの先頭だけで分かります。`draft` の値だけで表示を決めず、トップページのコレクション取得時に環境変数も確認するのがポイントです。

### Previewと通常ビルドの差

`.github/workflows/cloudflare.yml` のPreviewジョブでは、次の環境変数を設定しています。

```yaml
env:
  SHOW_DRAFTS: true
```

その後、`npm ci` と `npm run build` を実行し、Preview用Workerへデプロイします。PRをレビューするときは下書きも見えますが、mainへのpushで動くproductionジョブには、この変数はありません。

この差は、Cloudflareの機能に依存した公開判定ではありません。Astroのビルド時にトップページがどのデータを取得するかを切り替え、生成された静的ファイルをそれぞれの環境へ渡しています。

## 手順

新しい記事をレビューに出すときは、次の順に進めます。

1. `src/content/notes/` にMarkdownまたはMDXを追加する
2. Frontmatterで `draft: true` を設定する
3. `npm run build` を実行し、ローカルの通常ビルドが通ることを確認する
4. ブランチをpushしてPull Requestを作る
5. Actionsが作成したPreviewで、記事ページと一覧を確認する
6. レビュー後、公開するときに `draft: false` へ変更する

この手順では、記事を作成した時点では本番一覧に入らず、PRでは表示できます。公開判断を自動化するのではなく、Previewを確認する人間のレビューに残しています。

## 検証結果

2026年7月27日に、`origin/main` から作成したブランチでこの原稿を追加し、ローカルで `npm run build` を実行しました。ビルド結果は成功でした。

今回、コードと設定から確認できたことは次のとおりです。

- `src/content.config.ts` が `draft` を真偽値として受け付ける
- `src/pages/index.astro` が `SHOW_DRAFTS === "true"` のときだけ下書きを一覧に含める
- Previewジョブが `SHOW_DRAFTS: true` を設定している
- productionジョブには同じ設定がない
- この原稿は `draft: true` である

ローカルの通常ビルドが成功したことは、Astroがこの原稿を読み込めることの確認です。GitHub ActionsでPreview Workerが実際にデプロイされ、URLから下書きが見えることまでは、この作業では実行していません。

## 問題点

この方法にも境界があります。

まず、`SHOW_DRAFTS` が設定されたPreview URLは、公開サイトではありませんが、URLを知っている人が見られる可能性があります。個人情報、購入前のレビュー、非公開のメモを下書きに書いてよい、という意味にはなりません。

次に、現在の実装で明示的にフィルタしているのはトップページです。記事詳細ページや将来追加するサイトマップ、RSS、検索機能にも下書きの条件を適用する必要があります。記事詳細ページがslugから直接コレクションを取得する場合、一覧から除外しただけでは不十分です。

また、GitHub Actionsの設定を変更してPreviewとproductionの環境変数を取り違えると、設計上の境界は崩れます。環境変数の名前が短く、設定の意図もコードコメントだけでは分かりにくいため、ワークフローのレビューが必要です。

## 次の課題

次に検証するのは、実際のPR Previewでの表示差です。

- 通常ビルドのトップページに、この原稿が含まれないこと
- `SHOW_DRAFTS=true` のPreviewに、この原稿が含まれること
- 記事詳細ページ、404、将来のフィードでも公開条件が一貫すること
- PRを閉じた後、Preview Workerが削除されること

ここまで確認できれば、`draft` は単なる執筆者向けメモではなく、レビュー経路と公開経路を分けるための運用上の契約として扱えます。現時点では、ローカルビルドとリポジトリ上の設定までは検証済み、Cloudflare上のPreview表示は未検証です。

## 出典

### このリポジトリで確認した事実

- [`src/content.config.ts`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/content.config.ts): `notes` コレクションのloaderとFrontmatterスキーマ
- [`src/pages/index.astro`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/pages/index.astro): `SHOW_DRAFTS` と `draft` を使った一覧の絞り込み
- [`.github/workflows/cloudflare.yml`](https://github.com/takapi-s/ai-lab-blog/blob/main/.github/workflows/cloudflare.yml): Previewとproductionのビルド環境

### 仕様確認に使った一次情報

- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)

公式ドキュメントは、AstroのローカルコンテンツコレクションとCloudflare Workers Static Assetsの一般仕様を確認するために参照しました。Preview Workerの実デプロイ結果は、今回のローカル検証には含めていません。
