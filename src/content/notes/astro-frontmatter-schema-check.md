---
title: "記事のFrontmatterをビルド時に検証するAstro Content Collectionの入力契約"
description: "週次で増えるMarkdown記事の入力ミスを、Astro Content CollectionのZodスキーマでビルド時に検出する仕組みを確認しました。"
pubDate: 2026-07-30
category: "BUILD LOG"
tags:
  - Astro
  - Content Collections
  - Zod
  - Markdown
  - ブログ運用
status: "検証済み"
stack:
  - Astro 7
  - TypeScript
  - Astro Content Collections
  - Zod
  - Markdown / MDX
draft: true
---

## 結論

週次で記事を追加するなら、Markdownを書けることだけでなく、Frontmatterの形を一定に保つ仕組みが必要です。Field Notesでは`src/content.config.ts`のContent Collectionにスキーマを定義しており、記事の必須項目、列挙値、配列の型をAstroのビルド時に検証できます。

今回、現在のリポジトリで`npm run build`を実行し、既存の記事がこの入力契約を通過することを確認しました。これは記事の内容が正しいことの証明ではなく、少なくともタイトルやカテゴリなど、サイトが利用する構造化データの形が壊れていないことの確認です。

## 背景

記事は`src/content/notes/`配下のMarkdownまたはMDXとして増えていきます。本文は自由に書けますが、トップページや記事ページはFrontmatterの値を使います。たとえばタイトル、公開日、カテゴリ、下書き状態が欠けたり、想定外の値になったりすると、記事を表示する処理の前提が崩れます。

現在のコレクション定義では、次の入力を契約にしています。

```ts
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
```

この定義で重要なのは、記事本文を評価するのではなく、サイトが機械的に扱うメタデータの境界を明示することです。

## 構成と確認手順

### 1. 記事ファイルをコレクションへ読み込む

`glob` loaderが`src/content/notes`の`*.md`と`*.mdx`を読み込みます。各ファイルのFrontmatterは、コレクションのスキーマに照らして型付けされます。

### 2. 固定値は列挙型にする

`category`と`status`は、サイト内で使う値を列挙しています。たとえばカテゴリを`BUILDLOG`のように書くと、似た文字列でも契約外の値です。自由な文字列にせず、一覧で使う値をスキーマ側に寄せることで、表記揺れをビルド時に発見できます。

### 3. 日付と配列の扱いを決める

`pubDate`は`z.coerce.date()`で日付へ変換します。`tags`と`stack`は文字列配列にし、未指定時は空配列を使います。記事ごとに値がない場合の扱いを決めておくと、表示側で毎回`undefined`を考慮せずに済みます。

### 4. 通常のビルドで契約を通す

```bash
npm run build
```

記事を追加しただけで、ページ生成の前にFrontmatterの不整合を検出できるのがこの構成の役割です。PR PreviewやCloudflareへのデプロイそのものを検証する記事ではありません。

## 検証結果

2026-07-30に`origin/main`から作成した作業ブランチで、記事追加後に通常ビルドと下書き表示用ビルドを実行しました。

- 通常の`npm run build`: 終了ステータス0、7ページ生成。`draft: true`の追加記事は公開出力から除外された
- `SHOW_DRAFTS=true npm run build`: 終了ステータス0、10ページ生成。既存の下書き2本と追加記事を含む出力になった
- どちらもContent syncと型生成が完了した
- 追加記事のFrontmatter（必須項目、カテゴリ、ステータス、配列）が受理された

この結果から確認できるのは、現在の入力契約に適合した記事が静的ページ生成まで進み、通常ビルドでは下書き境界が適用されたことです。本文の事実関係、リンク先の正しさ、読者にとっての有用性は、このビルドだけでは確認できません。

## 問題点

このスキーマにも限界があります。

- `title`や`description`が空でないことまでは、現在の定義では保証していない
- タグ名の重複や表記揺れまでは検出していない
- `pubDate`が未来の日付でも受理される
- `status: "検証済み"`と書いても、どの検証を行ったかは保証しない
- Frontmatterが正しくても、本文のコード例や外部リンクが正しいとは限らない

特に`status`は自己申告のメタデータです。スキーマを通過したことを、技術的な検証が完了したことと混同しないようにします。

## 次の課題

次に試す候補は、次の順です。

1. 空文字のタイトルや説明を拒否する最小長チェックを追加する
2. 記事一覧、RSS、sitemapで同じ`draft`判定を共有する
3. CIで変更された記事だけを対象に、Frontmatterエラーを読みやすく表示する
4. 外部リンクやコード例の検証を、別のチェックとして追加する

どれも、スキーマが担う入力検証と、本文・公開経路の検証を分離したうえで進めます。

## 既存記事との差分

最も近い既存記事は「Latest notesが更新されなかった原因を、手書き一覧からContent Collectionへ直した」です。

| 観点 | 既存記事 | 今回の記事 |
| --- | --- | --- |
| 共通点 | Astro Content Collectionと記事Frontmatterを使う | Astro Content Collectionと記事Frontmatterを使う |
| 中心テーマ | 記事データからLatest notesを自動生成する | 記事データの入力形式をビルド時に検証する |
| 新規性 | 一覧の更新漏れ、公開状態のフィルタ、日付順ソート | 必須項目、列挙値、日付、配列の入力契約と限界 |
| 別記事にする価値 | 記事追加後に表示を更新する方法が分かる | 記事追加時のメタデータミスをどこで止めるか分かる |

「このサイトをAstroとCloudflare Workersで始める」はサイト全体の構成を、「公開前にCloudflare WorkersのPR Previewを置いた理由」はPRからPreviewまでの確認経路を扱っています。今回はそれらの構成説明や公開手順を再掲せず、記事ファイルの入力境界に限定しました。

## 出典

### このリポジトリで確認した事実

- [`src/content.config.ts`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/content.config.ts): `notes`コレクションのloaderとFrontmatterスキーマ
- [`src/pages/index.astro`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/pages/index.astro): コレクションを使った記事一覧の生成
- [`src/pages/notes/[slug].astro`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/pages/notes/%5Bslug%5D.astro): 記事ページの生成

### 仕様確認に使った一次情報

- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro Content Loader Reference](https://docs.astro.build/en/reference/content-loader-reference/)

Astro公式ドキュメントでContent Collectionsのスキーマ検証の仕様を確認し、このリポジトリでは実際の`npm run build`の終了ステータスと生成ページ数を記録しました。仕様の説明と、この作業で観測した結果は別の事実として扱っています。
