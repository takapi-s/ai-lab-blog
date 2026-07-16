---
title: "このサイトをAstroとCloudflare Workersで始める"
description: "AI、miniPC、自動化の実験記録を残すためのサイトを作り始めました。"
pubDate: 2026-07-15
category: "BUILD LOG"
tags:
  - Astro
  - Cloudflare Workers
  - AI Agent
status: "検証済み"
stack:
  - Astro 7
  - MDX
  - Cloudflare Workers Static Assets
  - GitHub Pull Request
draft: false
---

このサイトでは、AIとminiPCを使って日常の仕事を少しずつ自動化していく過程を記録します。

## 記録するもの

- 実際に動かした構成
- うまくいかなかった設定
- 購入して使った機材
- GitHubで公開する小さな実装
- AIに任せた作業と、人間が確認した部分

最初は完成されたチュートリアルではなく、再現できる実験ノートを目指します。

## 今回の構成

```text
Astro + MDX
        ↓
GitHub Pull Request
        ↓
Cloudflare Workers Preview
        ↓
本番Worker
```

## 技術スタック構成図

現在はD2で管理している構成図です。Hermes AgentはローカルminiPCの中で動作し、記事の下書きとPull Request作成を担当します。GitHubのRepositoryとActionsを経由して、AstroとCloudflare Workersへ公開します。D2から生成したSVGを表示しています。

![ai-lab-blogのAstro・Cloudflare Workers構成図](/images/ai-lab-blog-architecture-d2.svg)

編集可能なD2ソースは[`docs/diagrams/ai-lab-blog-architecture.d2`](https://github.com/takapi-s/ai-lab-blog/blob/main/docs/diagrams/ai-lab-blog-architecture.d2)から確認できます。

記事の下書きは、今後miniPC上のHermes Agentから作成し、Pull Requestを確認ゲートとして公開する予定です。
