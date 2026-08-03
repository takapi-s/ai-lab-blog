---
title: "Astro Content Collectionの記事をHTMLへ変換する境界を確認した"
description: "記事データの取得、静的ルートの生成、Markdown本文のレンダリングを分けて確認し、レイアウト側が保証する範囲を整理しました。"
pubDate: 2026-08-03
category: "BUILD LOG"
tags:
  - Astro
  - Content Collections
  - Markdown
  - 静的サイト
  - ブログ運用
status: "検証済み"
stack:
  - Astro 7
  - TypeScript
  - Astro Content Collections
  - Markdown / MDX
draft: true
---

## 結論

Field Notesの記事ページでは、Content Collectionから得た記事データと、Markdown本文をHTMLへ変換する処理が別の段階になっています。`getStaticPaths()` が公開対象のURLと記事データを決め、`render(note)` が本文を表示用のコンポーネントへ変換し、レイアウトがタイトルや説明などの共通要素を出力します。

今回、`npm run build`を実行してこの経路が静的ページ生成まで通ることを確認しました。確認できたのは、現在の入力とテンプレートでHTMLを生成できることです。本文の内容が正しいことや、外部リンクが生きていることまでは、この検証からは分かりません。

## 背景

Markdown記事は本文を書くだけでページになります。しかし、記事データを取得する処理、どのslugをページにするかを決める処理、MarkdownをHTMLに変換する処理を一つの処理として考えると、問題が起きた場所を特定しにくくなります。

このリポジトリの`src/pages/notes/[slug].astro`には、少なくとも次の3つの境界があります。

1. Content Collectionから`notes`を取得する
2. `draft`の条件で静的に生成する記事を絞り込む
3. 取得した記事のMarkdown本文を`Content`として表示する

記事を週次で増やす場合、Frontmatterの検証だけでなく、本文がどの段階でページへ入るかを把握しておくと、表示崩れや公開対象の取り違えを切り分けやすくなります。

## 現在の変換経路

```text
src/content/notes/*.md / *.mdx
  ↓
glob loader
  ↓
notes Content Collection
  ├─ data: title, description, pubDate, draft ...
  └─ body: Markdown / MDX本文
  ↓
getStaticPaths()
  ↓
[slug].astro の Astro.props
  ↓
render(note)
  ↓
<Content />
  ↓
静的HTML
```

### 1. 記事データを取得する

`src/content.config.ts`では、`glob` loaderが`src/content/notes`配下のMarkdownとMDXを`notes`コレクションへ読み込みます。Frontmatterはスキーマで検証され、記事ページ側から`note.data.title`や`note.data.description`として参照できます。

ここで扱っているのは、タイトルや公開日などの構造化されたデータです。本文の段落や見出しは、同じ`data`オブジェクトの文字列として手作業で取り出しているわけではありません。

### 2. 静的に生成する記事を決める

動的なslugを持つ`[slug].astro`では、`getStaticPaths()`がページ生成対象を返します。現在は次の条件で下書きを扱っています。

```ts
const showDrafts = import.meta.env.SHOW_DRAFTS === "true";
const notes = await getCollection(
  "notes",
  ({ data }) => showDrafts || !data.draft,
);
```

この条件はトップページの一覧だけでなく、記事詳細ページの生成対象にも使われます。記事一覧からリンクを隠すだけではなく、通常ビルドで下書きの静的ルート自体を生成しない、という境界です。

### 3. 本文を表示可能な形にする

記事ページでは`render(note)`から`Content`を受け取り、テンプレート内で`<Content />`を描画しています。

```astro
const { note } = Astro.props;
const { Content } = await render(note);
---
<article class="article-content">
  <Content />
</article>
```

このため、レイアウト側は本文の見出しや段落を一つずつ組み立てません。本文の構造はMarkdownまたはMDXの変換結果に委ね、レイアウト側は`article-content`の幅、文字色、行間、画像、コードブロックなどの表示ルールを担当しています。

## レイアウトが保証する範囲

現在の記事テンプレートから確認できる保証は、次のように分けられます。

### データとして出力するもの

- `title`を`<title>`と見出しに出力する
- `description`をmeta descriptionと記事冒頭の説明に出力する
- `category`、`pubDate`、`status`、`stack`を記事ページのメタ情報へ出力する
- `draft`の条件で生成対象を絞る

### 本文の表示枠として出力するもの

- Markdown / MDXの変換結果を`<article>`内に置く
- 見出し、段落、リスト、画像、コードブロックへ共通のスタイルを適用する
- 横幅や余白を記事ページで統一する

一方で、現在のテンプレートだけでは次のことは保証していません。

- 外部リンクが有効であること
- 画像URLが取得できること
- コード例を実行できること
- 見出し構造がすべての記事で読みやすいこと
- すべての画像に記事執筆者が適切なalt属性を付けていること

つまり、Content Collectionのスキーマが通っても、本文の品質やリンク先の可用性まで自動的に検証されるわけではありません。

## 検証結果

2026-08-03、`origin/main`から作成した作業ブランチで、この記事を追加した後に通常ビルドを実行しました。

- `npm run build`は終了ステータス0
- Content syncと型生成が完了
- 既存の公開ページと、この記事を含む下書き以外の静的ページ生成が完了
- 記事ページのテンプレートが`title`、`description`、日付、本文を参照できた

この結果は、記事データの読み込みから静的HTML生成までの経路が、少なくとも現在のリポジトリ内の入力で壊れていないことを示します。ブラウザでの見た目、スクリーンリーダーでの読み上げ、外部リンクの到達性は別の検証が必要です。

## 問題点

現在の構成には、記事数が増えたときに確認したい点があります。

- 記事テンプレートとトップページで、下書き判定の条件がそれぞれ書かれている
- `lang`、meta description、titleはページテンプレートにあるが、OGPやcanonical URLはまだ用意していない
- Markdown本文の見出し階層やリンクをビルド時には検査していない
- `render(note)`の変換後HTMLを対象にしたスナップショットやアクセシビリティ検査はない
- 記事本文の画像はCSSで表示枠を整えるが、ファイルの存在や代替テキストは別途確認が必要

ここで重要なのは、レイアウトの責任範囲を広げすぎないことです。本文の事実確認をAstroの静的生成に期待するのではなく、リンクチェックや文章レビューなど別の検査として扱う方が、失敗した場所を説明しやすくなります。

## 次の課題

次に試すなら、以下の順番が小さく実装できます。

1. 下書き判定を共有関数へまとめ、一覧と詳細ページの条件を一箇所で管理する
2. 生成された`dist/notes/`のHTMLに、必須のtitleとdescriptionがあるかをチェックする
3. Markdown内の外部リンクを検査するCIジョブを追加する
4. 見出し階層と画像alt属性を対象にしたアクセシビリティ検査を追加する
5. OGPやcanonical URLが必要になった時点で、ページ種別ごとのメタデータ設計を行う

まだ実装していない項目は、この記事の検証結果とは分けて記録します。

## 既存記事との差分

最も近い既存記事は「記事のFrontmatterをビルド時に検証するAstro Content Collectionの入力契約」です。

| 観点 | 既存記事 | 今回の記事 |
| --- | --- | --- |
| 共通点 | Astro Content Collection、記事ファイル、ビルドを扱う | Astro Content Collection、記事ファイル、ビルドを扱う |
| 中心テーマ | Frontmatterの型、必須項目、列挙値を検証する | 記事データとMarkdown本文を静的HTMLへ変換する境界を確認する |
| 新規性 | 入力がスキーマに適合するか | `getStaticPaths()`、`Astro.props`、`render(note)`、`Content`の役割分担 |
| 別記事にする価値 | 記事追加時のメタデータミスをどこで止めるか分かる | データ取得・公開対象の決定・本文描画のどこを検査すべきか分かる |

「Latest notesが更新されなかった原因を、手書き一覧からContent Collectionへ直した」は一覧生成が中心です。今回はトップページのソートや一覧更新を扱わず、個別記事ページで本文がHTMLになる経路だけを扱います。

また、「公開前にCloudflare WorkersのPR Previewを置いた理由」と「このサイトをAstroとCloudflare Workersで始める」が扱うPreview・Workers・PR・本番公開の構成は再説明していません。

## 出典

### このリポジトリで確認した事実

- [`src/content.config.ts`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/content.config.ts): `notes` loaderとFrontmatterスキーマ
- [`src/pages/notes/[slug].astro`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/pages/notes/%5Bslug%5D.astro): `getStaticPaths()`、`render(note)`、記事レイアウト
- [`src/pages/index.astro`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/pages/index.astro): 一覧側のContent Collection利用

### 仕様確認に使った一次情報

- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro Content Loader Reference](https://docs.astro.build/en/reference/content-loader-reference/)
- [Astro Pages](https://docs.astro.build/en/basics/astro-pages/)

Astro公式ドキュメントはContent Collectionと静的ページ生成の仕様確認に使い、このリポジトリの動作については実際の`npm run build`の結果を別の事実として記録します。
