---
title: "Latest notesが更新されなかった原因を、手書き一覧からContent Collectionへ直した"
description: "記事ファイルを追加してもトップページのLatest notesが変わらない問題を、AstroのContent Collectionから日付順に自動生成する構成へ修正しました。"
pubDate: 2026-07-27
category: "BUILD LOG"
tags:
  - Astro
  - Content Collections
  - MDX
  - ブログ運用
  - 自動化
status: "検証済み"
stack:
  - Astro 7
  - TypeScript
  - Astro Content Collections
  - Markdown / MDX
draft: true
---

## 起きていた問題

記事を`src/content/notes/`に追加しても、トップページの`Latest notes`が更新されませんでした。

新しい記事ファイル自体は存在していましたが、トップページの一覧が次のような固定配列になっていたためです。

```astro
const notes = [
  { title: "最初の記事", href: "/notes/starting-this-site/" },
  { title: "COMING SOON", href: "#" },
];
```

この構成では、記事を追加するたびにトップページのコードも手で修正する必要があります。記事作成をCronやAIで自動化するなら、このままでは更新漏れが起きます。

## 修正後の構成

トップページでAstroのContent Collectionを読み込み、公開可能な記事だけを日付順に並べるようにしました。

```ts
const showDrafts = import.meta.env.SHOW_DRAFTS === "true";
const noteEntries = await getCollection(
  "notes",
  ({ data }) => showDrafts || !data.draft,
);

const notes = noteEntries
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
  .slice(0, 5)
  .map((note) => ({
    date: note.data.pubDate.toISOString().slice(0, 10),
    title: note.data.title,
    tag: note.data.category,
    href: `/notes/${note.id}/`,
  }));
```

これで、記事を追加すると次の情報が自動的に一覧へ反映されます。

- Frontmatterのタイトル
- 公開日
- カテゴリ
- 記事のslug
- 公開状態

## 下書きの扱い

今回の修正では、通常ビルドとPR Previewで表示する記事を分けています。

```yaml
draft: true
```

通常ビルドでは、`draft: true`の記事を除外します。PR Previewでは`SHOW_DRAFTS=true`を設定するため、レビュー対象の下書きも一覧に表示できます。

```text
通常ビルド:
  公開済み記事だけ

PR Preview:
  公開済み記事 + レビュー中の記事
```

この判定をトップページだけでなく、記事詳細ページにも適用しています。記事一覧から隠しただけで、URLを直接入力すると下書きが見える状態にならないようにするためです。

## なぜ固定配列で始めたのか

最初のサイトでは、まず画面の雰囲気を確認することを優先しました。記事が1本だけの段階では、固定配列でも表示確認はできます。

しかし、記事を週次で追加する運用に切り替えると、固定配列には次の問題があります。

- 新しい記事を追加しても一覧が変わらない
- 日付順に並ばない
- 記事URLの手入力が必要になる
- 下書きの表示条件を統一できない
- AIが記事を作っても、別のファイルを更新し忘れる

つまり、試作段階では便利でも、記事を増やす段階ではデータと表示が分離してしまいます。

## 実際に行った検証

今回の修正では、通常ビルドとPreview相当ビルドを分けて確認しました。

### 通常ビルド

```bash
npm run build
```

確認したこと：

- Astroのビルドが成功する
- 公開済み記事は一覧に表示される
- `draft: true`の記事は一覧に表示されない
- 公開済み記事のリンクが生成される

### Preview相当ビルド

```bash
SHOW_DRAFTS=true npm run build
```

確認したこと：

- 下書き記事のページが生成される
- 下書き記事がLatest notesに表示される
- 下書き記事へのリンクが正しい
- 記事詳細ページが生成される

実際のPreviewでも、今回の記事のタイトルとリンクが表示されることを確認しました。

## 既存記事との違い

このサイトには、すでに次の関連記事があります。

- 「このサイトをAstroとCloudflare Workersで始める」
  - サイト全体の目的と技術構成を説明
- 「公開前にCloudflare WorkersのPR Previewを置いた理由」
  - PR Previewと公開前レビューの仕組みを説明

今回の記事は、それらの再説明ではありません。

今回の焦点は、**記事を追加した後にトップページの一覧をどう自動更新するか**です。

```text
既存記事:
  サイト構成・PR Preview・公開レビュー

今回の記事:
  Content Collectionを使った記事一覧の自動生成
```

同じブログ基盤を扱っていますが、解決している問題が異なります。

## この修正で変わる運用

今後は記事を追加するとき、トップページを別に編集する必要がありません。

```text
記事ファイルを追加
  ↓
Frontmatterを設定
  ↓
ビルド
  ↓
Latest notesへ自動反映
```

週次Cronが記事を作成してPRを作る場合も、記事ファイルだけを追加すれば一覧に反映されます。記事の追加とトップページの更新を別々に行わなくてよくなるため、更新漏れを減らせます。

## 残っている課題

まだ次の改善は残っています。

- カテゴリ別の記事一覧
- タグ別の記事一覧
- ページネーション
- RSSフィード
- サイトマップへの下書き除外
- 関連記事の自動表示
- 記事の読了時間
- 検索インデックスへの公開条件の統一

特にRSS、sitemap、検索機能を追加するときは、トップページと同じ公開条件を使う必要があります。一覧だけ正しくても、RSSに下書きが出れば公開境界が崩れるためです。

## まとめ

今回の問題は、記事の作成処理ではなく、**記事データとトップページ表示が別々に管理されていたこと**が原因でした。

固定配列からContent Collectionへ変更したことで、現在は次の構成になっています。

```text
Markdown / MDX記事
  ↓
Astro Content Collection
  ↓
公開状態でフィルタ
  ↓
公開日でソート
  ↓
Latest notesを自動生成
```

この修正は派手ではありませんが、週次記事作成やPRレビューを続けるための重要な土台です。記事を増やすほど、手書きの一覧ではなく、記事データから表示を生成する構成の価値が大きくなります。

## 出典

### このリポジトリで確認した事実

- [`src/content.config.ts`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/content.config.ts): `notes` Content Collectionの定義
- [`src/pages/index.astro`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/pages/index.astro): Content CollectionからLatest notesを生成する処理
- [`src/pages/notes/[slug].astro`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/pages/notes/%5Bslug%5D.astro): 記事詳細ページの生成条件

### 仕様確認

- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro Content Loader Reference](https://docs.astro.build/en/reference/content-loader-reference/)
