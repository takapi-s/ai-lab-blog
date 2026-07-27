---
title: "AIに記事を書かせても、自動公開しない仕組みにした理由"
description: "Field Notesでは、AIに記事の下書きを作らせても、そのまま本番公開しません。GitHub PRとCloudflare Previewを使い、人間が内容と見た目を確認してから公開する運用を実装しました。"
pubDate: 2026-07-27
category: "AI / AGENTS"
tags:
  - AI Agent
  - GitHub Pull Request
  - Cloudflare Workers
  - ブログ運用
  - 自動化
status: "検証済み"
stack:
  - Astro 7
  - GitHub Actions
  - Cloudflare Workers Static Assets
  - Wrangler
draft: true
---

## この記事で分かること

AIを使ってブログ記事を定期的に作りたいとき、最も危険なのは「記事を書けること」ではなく、**間違った内容や未確認の情報を、そのまま公開してしまうこと**です。

Field Notesでは、次の運用にしています。

```text
AIが記事の下書きを作る
        ↓
GitHubにPull Requestを作る
        ↓
Cloudflare Previewで実際の表示を確認する
        ↓
人間が内容・リンク・見た目をレビューする
        ↓
承認後にmainへマージする
        ↓
本番サイトへ自動デプロイする
```

AIには「作成」と「検証の補助」を任せますが、公開の判断は人間に残します。

## なぜ自動公開しないのか

AIで記事を作るだけなら、ローカルファイルを生成して、そのまま本番へデプロイできます。しかし、実際のブログ運用では次の問題が起きます。

- AIが実際には使っていない製品を、使ったように書く
- 価格や仕様が古くなる
- 外部記事の内容を誤って要約する
- コード例が動かない
- 個人情報や秘密情報を記事に混ぜる
- 下書きや未完成の記事が検索対象になる
- PCでは問題なくても、スマートフォンでレイアウトが崩れる

特にこのサイトでは、miniPC、Hermes Agent、Gmail、Slack、自動化、購入した機材を扱います。実際に確認していないことを体験談として公開すると、記事の信頼性を失います。

そのため、記事の作成を自動化しても、公開までを完全自動化しない設計にしました。

## 実際の構成

ブログはAstroで構築し、記事は`src/content/notes/`にMarkdownまたはMDXで保存します。

```text
週次Cron
  ├─ リポジトリと既存記事を確認
  ├─ 必要な一次情報を調査
  ├─ 記事を作成
  ├─ draft: trueで保存
  ├─ weekly/article-YYYYMMDDブランチを作成
  ├─ GitHubへpush
  └─ Pull Requestを作成
          ↓
GitHub Actions
  ├─ npm ci
  ├─ npm run build
  ├─ PR用Workerへデプロイ
  └─ PRへPreview URLをコメント
          ↓
人間のレビュー
          ↓
mainへマージ
          ↓
本番Workerへデプロイ
```

PreviewはPR番号ごとに別Workerを作ります。

```text
PR #4
  → https://ai-lab-blog-pr-4.pocky1111gm.workers.dev
```

PRを更新すると同じPreview URLが更新され、PRを閉じるとPreview Workerを削除します。

## 下書きはPreviewだけで表示する

記事にはFrontmatterで公開状態を持たせています。

```yaml
draft: true
```

本番ビルドでは、この値が`true`の記事を一覧から除外します。一方、PR Previewのビルドだけは`SHOW_DRAFTS=true`を設定し、レビュー対象の記事を表示します。

この違いによって、次の状態を作れます。

```text
本番サイト:
  公開済み記事だけ表示

PR Preview:
  公開済み記事 + 今回レビューする下書き
```

ただし、Preview URLを知っている人が見られる可能性は残ります。下書きだから秘密情報を書いてよい、という意味ではありません。個人情報、APIキー、購入前の未公開レビュー、メール本文などは、Previewにも入れない方針です。

## レビューで確認すること

PRでは、文章だけでなく、次の項目を確認します。

### 内容

- 実際に確認したことと推測が分かれているか
- 体験談が本当に自分の経験に基づいているか
- 製品の価格・仕様が最新か
- 外部記事の要約が正確か
- 読者にとって何が役に立つ記事か

### 実装

- コード例が実際に動くか
- コマンドに秘密情報が含まれていないか
- 参照リンクが正しいか
- 本番設定とPreview設定を取り違えていないか

### 表示

- スマートフォンで読みやすいか
- 見出しの順番が自然か
- 記事一覧から正しいページへ移動できるか
- 画像や図の文字が切れていないか
- 未完成の記事が本番一覧に出ていないか

## この仕組みが役立つ人

この構成は、次のような人に向いています。

- AIにブログ記事の下書きを作らせたい人
- 技術ブログをGitHubで管理している人
- AIの誤情報をそのまま公開したくない人
- PRごとに実サイトを確認したい人
- 複数人で記事をレビューしたい人
- 商品レビューや導入事例で事実確認を重視する人

広告やアフィリエイトだけを目的にすると、AIで大量の記事を作る方向へ流れやすくなります。しかし、読者が信頼するのは記事数ではなく、実際の検証結果と判断材料です。

この仕組みは、将来的にAI業務自動化の導入支援や、miniPC・Linux環境の構築支援へつなげる場合にも役立ちます。記事そのものが、実装力と検証方法を示すポートフォリオになるからです。

## 検証結果

今回のPRでは、次のことを実測しました。

- 通常のAstroビルドが成功する
- Previewビルドで下書き記事が生成される
- 通常ビルドでは下書き記事がLatest notesに表示されない
- Previewビルドでは下書き記事がLatest notesに表示される
- GitHub ActionsからPR用Cloudflare Workerへデプロイできる
- PRにPreview URLが自動コメントされる
- Previewの記事ページがHTTP 200で表示される

Preview URLは次です。

https://ai-lab-blog-pr-4.pocky1111gm.workers.dev

記事ページは次です。

https://ai-lab-blog-pr-4.pocky1111gm.workers.dev/notes/draft-switch-for-preview/

## 残っている課題

この仕組みだけで、AI記事の品質が自動的に保証されるわけではありません。

- AIが選んだテーマが読者に必要か判断する
- 実体験と外部情報を区別する
- 商品情報や価格を再確認する
- 記事の主張が強すぎないか確認する
- Previewをスマートフォンでも確認する
- 公開後にリンク切れや古い情報を確認する

AIは調査・下書き・整理を速くできますが、公開に値するかどうかの判断は別の作業です。

## まとめ

今回作ったのは、AIに完全自動で記事を公開させる仕組みではありません。

```text
AI:
  調査、下書き、整理、検証候補の提示

人間:
  事実確認、内容の修正、公開判断

GitHub PR:
  変更履歴とレビューの場所

Cloudflare Preview:
  公開前に実サイトを見る場所
```

この分担なら、記事作成の負担を減らしながら、実体験ではない内容や未確認の情報がそのまま公開されるリスクを下げられます。

技術ブログを収益化する場合も、最初に増やすべきなのは記事数ではなく、読者が「この人の検証なら参考になる」と判断できる記録です。

## 出典

### このリポジトリで確認した事実

- [`src/content.config.ts`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/content.config.ts): 記事のFrontmatterスキーマ
- [`src/pages/index.astro`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/pages/index.astro): Content CollectionからLatest notesを生成する処理
- [`.github/workflows/cloudflare.yml`](https://github.com/takapi-s/ai-lab-blog/blob/main/.github/workflows/cloudflare.yml): PR Previewとmainデプロイ
- [`wrangler.jsonc`](https://github.com/takapi-s/ai-lab-blog/blob/main/wrangler.jsonc): Cloudflare Workers Static Assets設定

### 仕様確認

- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [GitHub Actions documentation](https://docs.github.com/en/actions)
