---
title: "公開前にCloudflare WorkersのPR Previewを置いた理由"
description: "Field Notesの記事を公開する前に、GitHub ActionsとCloudflare Workersで変更を確認できる経路を作りました。ローカルビルドで確認できたことと、まだ未検証の部分を分けて記録します。"
pubDate: 2026-07-22
category: "BUILD LOG"
tags:
  - Astro
  - GitHub Actions
  - Cloudflare Workers
  - Hermes Agent
  - 自動化
status: "実装中"
stack:
  - Astro 7
  - TypeScript
  - GitHub Actions
  - Wrangler
  - Cloudflare Workers Static Assets
draft: true
---

## 結論

Field Notesでは、記事をいきなり本番へ出すのではなく、Pull Request（PR）単位で見た目を確認できる経路を用意しました。実装したリポジトリ上の流れは次のとおりです。

```text
記事の変更
  ↓
Pull Request
  ↓
GitHub Actionsで npm ci / npm run build
  ↓
PR用のCloudflare Workerへデプロイ
  ↓
PRコメントにPreview URL
```

今回、手元で確認できたのは `npm run build` が成功し、7ページの静的ルートが生成されたことです。Cloudflareへの実デプロイとPRコメントの更新は、この下書き作成時点では実行していません。したがって、Preview経路全体が本番相当で動くことまでは、まだ確認できていません。

## 背景

このブログは、AI Agent、miniPC、自動化、サイト開発を実際に試した記録を残すためのものです。記事は `src/content/notes/` にMarkdownまたはMDXで追加し、Astroのコンテンツコレクションで読み込みます。

サイトを作り始めた記事では、AstroとCloudflare Workersを使う構成そのものを記録しました。そこから一歩進めて、記事の内容だけでなく、公開前の確認手順もリポジトリに固定することにしました。特に、将来Hermes Agentから記事の下書きやPR作成を行う場合、人間が差分とPreviewを確認するゲートが必要になります。

ここでの「自動化」は、公開を無条件に任せることではありません。自動でビルドとPreviewを作り、最後の公開判断はPRレビューに残す、という分担です。

## 構成と手順

### 1. 記事をコンテンツコレクションへ追加する

`src/content.config.ts` では、`src/content/notes` 配下の `*.md` と `*.mdx` を `glob` loaderで読み込みます。Frontmatterには、タイトル、説明、日付、カテゴリ、タグ、ステータス、スタック、`draft` を持たせています。

`draft: true` の記事は今回のように下書きとして残します。作成した記事を本番へ出すための変更は、別途レビュー対象として扱います。

### 2. PRではPreview用Workerを作る

`.github/workflows/cloudflare.yml` のPRジョブは、次の処理を定義しています。

- Ubuntu上でリポジトリをチェックアウト
- Node.js 24をセットアップ
- `npm ci` で依存関係をインストール
- `npm run build` で静的サイトを生成
- Wranglerで `ai-lab-blog-pr-<PR番号>` という名前のPreview Workerへデプロイ
- デプロイログからURLを取り出し、PRコメントを作成または更新

PRが更新された場合は同じPR用Workerを更新し、PRが閉じられた場合はPreview Workerを削除する定義です。PRごとのPreviewを使い捨てにできるので、mainへ入れる前の表示確認と、Previewの後片付けを同じワークフローに置けます。

### 3. mainへのpushは本番経路になる

同じワークフローには、`main` へのpushをトリガーに `npm ci`、`npm run build`、`npm run deploy` を実行するジョブもあります。Wrangler設定では、生成物の場所を `./dist` としてCloudflare Workers Static Assetsに渡します。

ただし、今回の作業ではcommit、push、deployを行っていません。この記事も `draft: true` のままです。

## 検証結果

作業前のローカルリポジトリで `npm run build` を実行しました。結果は成功です。

- Astroのcontent syncと型生成が完了
- 静的出力モードでビルド完了
- `/about/`、`/contact/`、`/disclosure/`、`/gear/`、`/notes/starting-this-site/`、`/privacy/`、`/` の7ページを生成
- 終了ステータスは0

この結果から、少なくとも現在のリポジトリにある記事とページは、ローカルのAstroビルドを通過する状態だと判断できます。

## 問題点と、まだ分からないこと

今回の検証だけでは、次の点は未確認です。

- GitHub Actions上でNode.js 24と`npm ci`を実行した結果
- Cloudflareの認証情報を使ったPreview Workerのデプロイ結果
- Preview URLが実際にブラウザで表示されること
- PRコメントの作成・更新と、PRクローズ後のWorker削除
- `draft: true` が本番の一覧から除外されることの、公開環境での表示確認

また、Previewと本番の両方でCloudflareの認証情報を使うため、認証情報を記事やリポジトリへ書かない運用が前提です。リポジトリのREADMEには、Actions用のシークレット名が記載されていますが、値そのものは記録していません。

## 次の課題

次回は、秘密情報を出力しないテスト用のPRを作り、次の順に実測します。

1. ActionsのビルドログとPreview Workerのデプロイ結果を確認する
2. PRコメントのPreview URLを開き、一覧・記事ページ・下書きの表示を確認する
3. PRを閉じた後にPreview Workerが削除されることを確認する

確認できたログとURLだけを、次の実験ノートへ追記します。現時点では、Preview経路は「実装済み、ローカルビルドのみ検証済み」と表現するのが正確です。

## 出典

### このリポジトリで確認した事実

- [`src/content.config.ts`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/content.config.ts)：記事ファイルのglob loaderとFrontmatterスキーマ
- [`.github/workflows/cloudflare.yml`](https://github.com/takapi-s/ai-lab-blog/blob/main/.github/workflows/cloudflare.yml)：PR Preview、PRクローズ時の削除、mainへのデプロイ定義
- [`wrangler.jsonc`](https://github.com/takapi-s/ai-lab-blog/blob/main/wrangler.jsonc)：`dist` をStatic Assetsのディレクトリにする設定
- [`README.md`](https://github.com/takapi-s/ai-lab-blog/blob/main/README.md)：ローカル開発コマンドとCloudflareデプロイの説明

### 仕様確認に使った一次情報

- [Astro Content Loader API](https://docs.astro.build/en/reference/content-loader-reference/)
- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)

上記の公式ドキュメントは、Astroのローカルコンテンツ読み込みと、Wrangler設定で指定した静的アセットのデプロイ仕様を確認するために参照しました。公式仕様の確認と、このリポジトリで実際に成功したローカルビルドは別の事実として扱っています。
