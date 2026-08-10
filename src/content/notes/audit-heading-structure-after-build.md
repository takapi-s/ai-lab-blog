---
title: "生成済みHTMLの見出し構造を棚卸しする"
description: "Astroのビルド後に出力されたHTMLを標準ライブラリで調べ、ページごとの見出し数とh1の数を確認する小さな品質検証を試しました。"
pubDate: 2026-08-10
category: "BUILD LOG"
tags:
  - Astro
  - 静的サイト
  - HTML
  - アクセシビリティ
  - 品質検証
status: "検証済み"
stack:
  - Astro 7
  - Python標準ライブラリ
  - HTMLParser
  - Markdown / MDX
draft: true
---

## 結論

Astroのビルドが成功しても、ページの見出し構造が意図どおりだとは限りません。今回は、配信対象の`dist/`配下にあるHTMLを入力にして、ページごとの見出し数と`h1`の数を数えました。

この検証で分かるのは、**生成物にどの見出し要素が含まれているか**です。見出し文の意味や、スクリーンリーダーでの読み上げが適切かまでは判定していません。HTMLの構造を機械的に確認できる範囲と、目視・支援技術で確認すべき範囲を分けるための検査です。

## 背景

Markdown記事では、本文の見出しがHTMLの`h2`や`h3`などへ変換されます。一方で、サイトのレイアウト側にもページタイトルやナビゲーションの見出しが含まれます。編集時のMarkdownだけを見ていると、最終的なHTMLにどの見出しが出たかを見落とす可能性があります。

特に週次で記事を追加する運用では、次のような変化をレビューの入り口で検出できると便利です。

- ページに`h1`が複数出ていないか
- ページに`h1`が存在するか
- 見出し要素がまったく生成されていないページがないか

これはアクセシビリティの合否判定ではありません。まず生成物の状態を一覧にして、確認対象を絞るための小さな棚卸しです。

## 今回の手順

### 1. 通常ビルドを実行する

```bash
npm run build
```

通常ビルドでは、`draft: true`の記事を除いた静的HTMLが`dist/`へ出力されます。記事ファイルではなく、実際に配信される生成物を調べるのが今回のポイントです。

### 2. HTMLの見出しを数える

追加パッケージを入れず、Python標準ライブラリの`html.parser`で`h1`から`h6`までを読みました。

```python
from html.parser import HTMLParser
from pathlib import Path
import re

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.headings = []

    def handle_starttag(self, tag, attrs):
        if re.fullmatch(r"h[1-6]", tag):
            self.headings.append(tag)

for path in sorted(Path("dist").rglob("*.html")):
    parser = Parser()
    parser.feed(path.read_text(encoding="utf-8"))
    print(
        f"{path}: h1={parser.headings.count('h1')} "
        f"headings={len(parser.headings)}"
    )
```

このコードは、見出しのテキストや階層の妥当性ではなく、要素の個数だけを表示します。HTMLが壊れている場合の修復や、JavaScript実行後のDOM取得も行いません。

## 検証結果

2026-08-10に、`origin/main`から作成した作業ブランチで通常ビルドを実行し、その後に上の検査を走らせました。

- `npm run build`は終了ステータス0
- 7ページの静的HTMLが生成された
- 7ページすべてで`h1=1`になった
- ページごとの見出し総数は3〜6だった
- `draft: true`の記事ページは通常ビルドに含まれなかった

出力は次のとおりです。

```text
dist/about/index.html: h1=1 headings=3
dist/contact/index.html: h1=1 headings=3
dist/disclosure/index.html: h1=1 headings=3
dist/gear/index.html: h1=1 headings=5
dist/index.html: h1=1 headings=6
dist/notes/starting-this-site/index.html: h1=1 headings=4
dist/privacy/index.html: h1=1 headings=4
```

この結果から、この時点の通常ビルドではページごとに`h1`が一つ生成されていることを確認できました。ただし、それだけで見出しの順序や内容が読者にとって適切だと結論づけることはできません。

## 問題点

今回の数え上げには、次の限界があります。

- `h1`が一つでも、見出し文がページの内容を表すとは限らない
- `h2`の次に`h4`が出るような階層の飛びを検査していない
- 見出しの重複や空文字の見出しを検査していない
- CSSで見出しを隠しているかどうかは分からない
- JavaScriptで後から追加される見出しは対象外
- スクリーンリーダーやキーボード操作の確認はしていない

したがって、今回の`h1=1`は「構造検査の一条件を満たした」という結果です。アクセシビリティ対応済み、という意味ではありません。

## 次の課題

影響範囲を限定して進めるなら、次は次の順で検査を増やします。

1. 見出しテキストを出力し、空の見出しを検出する
2. ページタイトルと`h1`の対応を目視で確認する
3. 見出しレベルの飛びを警告する
4. キーボード操作とブラウザのアクセシビリティツリーを確認する
5. 下書きPreviewでも同じ検査を実行する

CIへ組み込む場合も、まずは警告を記録するだけにし、既存ページの状態を確認してから失敗条件を決めます。機械的なルールをいきなり厳しくして、記事追加を妨げないようにします。

## 既存記事との差分

最も近い既存記事は「公開済みHTMLから外部リンクを棚卸しする」ではなく、`origin/main`にある「Latest notesが更新されなかった原因を、手書き一覧からContent Collectionへ直した」です。どちらもAstroの生成物を対象にできますが、検査する対象と読者の判断が異なります。

| 観点 | 近い既存記事 | 今回の記事 |
| --- | --- | --- |
| 共通点 | AstroのContent Collectionと静的ビルドを扱う | Astroの静的ビルド後のHTMLを扱う |
| 中心テーマ | 記事データからLatest notesを自動生成する | 生成HTMLの見出し要素を数える |
| 新規性 | 一覧の取得、下書きフィルタ、日付順ソート | ページ単位の`h1`数と見出し総数の棚卸し |
| 別記事にする価値 | 記事追加時の一覧更新漏れを減らす | レビュー時に構造確認の対象を絞る |

「公開前にCloudflare WorkersのPR Previewを置いた理由」が扱うPR Preview、Cloudflare Workers、GitHub Actions、main公開の流れも本記事では再説明しません。また、記事一覧をContent Collectionから生成する仕組みも中心テーマにしません。

## 出典

### このリポジトリで確認した事実

- [`src/content.config.ts`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/content.config.ts)：Markdown／MDXを`notes`へ読み込む設定
- [`src/pages/notes/[slug].astro`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/pages/notes/%5Bslug%5D.astro)：記事ページの生成と本文レンダリング
- [`src/layouts/BaseLayout.astro`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/layouts/BaseLayout.astro)：共通レイアウトの見出し要素
- [`package.json`](https://github.com/takapi-s/ai-lab-blog/blob/main/package.json)：`npm run build`の定義

### 仕様確認

- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Python `html.parser` documentation](https://docs.python.org/3/library/html.parser.html)
- [WAI Tutorials: Page Structure](https://www.w3.org/WAI/tutorials/page-structure/)

公式ドキュメントは、コンテンツの読み込みとHTML解析の仕様確認に使いました。`h1=1`や7ページという数値は、このリポジトリで実行した検証結果です。

## 関連記事と今回の位置づけ

- **「このサイトをAstroとCloudflare Workersで始める」**：サイトの目的と全体構成を紹介
- **「公開前にCloudflare WorkersのPR Previewを置いた理由」**：PR単位のPreviewと公開前レビューを記録
- **「Latest notesが更新されなかった原因を、手書き一覧からContent Collectionへ直した」**：記事データから一覧を自動生成する修正を記録
- **本記事**：それらの公開経路や一覧生成を再説明せず、生成後HTMLの見出し構造を小さく検査

本記事の候補仮説は「通常ビルドの各ページには`h1`が一つ生成されている」です。検査結果はこの仮説を支持しましたが、見出し構造全体の妥当性や、読者体験の良さを証明したものではありません。
