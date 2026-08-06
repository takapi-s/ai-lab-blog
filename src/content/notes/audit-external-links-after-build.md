---
title: "生成済みHTMLから記事の外部リンクを棚卸しする"
description: "Astroのビルド後に出力されたHTMLを標準ライブラリだけで調べ、記事に含まれる外部リンクを一覧化する小さな検証を試しました。"
pubDate: 2026-08-06
category: "BUILD LOG"
tags:
  - Astro
  - 静的サイト
  - Markdown
  - 品質検証
  - ブログ運用
status: "検証済み"
stack:
  - Astro 7
  - Python標準ライブラリ
  - HTML
  - Markdown / MDX
draft: true
---

## 結論

記事のビルドが成功しても、本文に書いた外部リンクが実際に到達できるとは限りません。そこで今回は、Astroが生成した`dist/`配下のHTMLを入力にして、`http://`または`https://`で始まるリンクを標準ライブラリだけで抽出しました。

この検証で分かるのは、**生成物にどの外部URLが残っているか**です。リンク先のHTTPステータス、リダイレクト、サイトの内容の正しさまでは確認していません。ビルド成功とリンク到達性を同じ結果として扱わないための、最小限の棚卸しです。

## 背景

これまでの記事では、Content Collectionから記事を取得し、`render(note)`で本文をHTMLへ変換する境界を確認しました。その経路が通っても、変換後のHTMLに含まれるリンクの可用性は別の問題です。

外部リンクは、次のような理由で記事を書いた時点から変化します。

- 参照先のURLが移転する
- ドキュメントのパスが変わる
- Markdownのリンク記法を編集するときにURLを誤る
- 相対リンクと外部リンクを意図せず取り違える

記事本文の事実確認を自動化できるわけではありませんが、まず生成物に含まれるURLを一覧化すれば、レビュー対象を機械的に絞れます。

## 今回の手順

### 1. 通常ビルドを実行する

```bash
npm run build
```

通常ビルドでは、`draft: true`の記事を除いた静的HTMLが`dist/`へ出力されます。記事ファイルそのものではなく、読者へ配信する生成物を調べるのが今回のポイントです。

### 2. 生成されたHTMLからURLを抽出する

追加パッケージを入れず、Pythonの`html.parser`で`<a href>`を読みました。

```bash
python3 - <<'PY'
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = set()
    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        href = dict(attrs).get("href", "")
        if urlparse(href).scheme in {"http", "https"}:
            self.urls.add(href)

found = set()
for path in Path("dist").rglob("*.html"):
    parser = Links()
    parser.feed(path.read_text(encoding="utf-8"))
    found.update(parser.urls)
for url in sorted(found):
    print(url)
print(f"external_links={len(found)}")
PY
```

`set`で重複を取り除いているため、同じURLがヘッダーや本文に複数回出ても一つとして数えます。`mailto:`やサイト内の`/notes/...`のようなリンクは、今回の「HTTP(S)外部リンク」には含めません。

## 検証結果

2026-08-06に、この記事を下書きとして追加した状態で通常ビルドを実行し、その後に上の抽出処理を走らせました。

- `npm run build`は終了ステータス0
- `dist/`に通常ビルドの静的HTMLが生成された
- 下書き記事自身のページは通常ビルドの対象外だった
- 外部リンクはURL単位で重複排除して一覧化できた

この結果が示すのは、生成後のHTMLを対象にしたURL抽出が動くことだけです。抽出されたURLへリクエストを送る検査は、今回の作業では実行していません。外部サイトへアクセスできることや、リンク先が記事の主張を支えることは未検証です。

## 問題点

この方法にも限界があります。

- `href`の文字列を集めるだけで、HTTPステータスは見ない
- リダイレクト後の正規URLや、リンク先の内容は分からない
- JavaScript実行後に生成されるリンクは対象外
- `rel="nofollow"`や外部リンクの重要度は区別していない
- URLに含まれるクエリや末尾スラッシュの違いは別URLとして扱う

特に、リンクが200を返しても、引用したページの内容が変わっている可能性は残ります。リンクチェックを事実確認の代わりにしないことが重要です。

## 次の課題

次に追加するなら、影響範囲を限定して次の順に進めます。

1. 抽出結果をファイルごとに表示し、どの記事がURLを持つか分かるようにする
2. 許可したドメインだけを対象に、タイムアウト付きのHEADまたはGET検査を試す
3. 429や5xxを即座に「リンク切れ」と判定せず、`unknown`として記録する
4. CIでは外部サイトへのアクセス頻度と失敗時の再実行を設計する
5. 重要な出典は、URLだけでなく確認日とページタイトルもレビューに残す

外部サイトへのアクセスをCIへ組み込む場合は、相手先の利用条件やレート制限を確認してからにします。

## 既存記事との差分

最も近い既存記事は「Astro Content Collectionの記事をHTMLへ変換する境界を確認した」です。加えて、`origin/main`にある「Latest notesが更新されなかった原因を、手書き一覧からContent Collectionへ直した」も同じAstro／Content Collectionを扱います。

| 観点 | 近い既存記事 | 今回の記事 |
| --- | --- | --- |
| 共通点 | AstroのMarkdown記事をビルドし、生成結果の範囲を確認する | AstroのMarkdown記事をビルドし、生成後HTMLを調べる |
| 中心テーマ | データ取得・静的ルート・本文レンダリングの境界 | HTMLから外部リンクを抽出する棚卸し |
| 新規性 | `getStaticPaths()`、`render(note)`、`Content`の役割分担 | 標準ライブラリによる生成物ベースのリンク一覧化と検証限界 |
| 別記事にする価値 | 本文がページになる経路を切り分けられる | ビルド成功後にレビューすべき外部URLを具体化できる |

本記事では、Cloudflare Workers、GitHub Actions、PR Preview、mainへの公開経路は説明しません。また、Content CollectionのスキーマやLatest notesの自動生成も中心テーマにしません。既存記事が扱う「ページを生成する仕組み」ではなく、その後の生成物を対象にした小さな品質検査に限定しています。

## 出典

### このリポジトリで確認した事実

- [`src/content.config.ts`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/content.config.ts)：Markdown／MDXを`notes`へ読み込む設定
- [`src/pages/notes/[slug].astro`](https://github.com/takapi-s/ai-lab-blog/blob/main/src/pages/notes/%5Bslug%5D.astro)：`render(note)`と記事HTMLの出力
- [`package.json`](https://github.com/takapi-s/ai-lab-blog/blob/main/package.json)：`npm run build`の定義

### 仕様確認

- [Astro Content Loader Reference](https://docs.astro.build/en/reference/content-loader-reference/)
- [Python `html.parser` documentation](https://docs.python.org/3/library/html.parser.html)

Astroのビルドと記事レンダリングの仕様は公式ドキュメントで確認し、今回のURL数やビルド成否はこのリポジトリで実行した結果として扱います。
