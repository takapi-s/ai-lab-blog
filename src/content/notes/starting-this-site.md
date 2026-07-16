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

Draw.io MCPで作成した構成図です。PR Previewと本番Workerへのデプロイ経路を確認できます。

![ai-lab-blogのAstro・Cloudflare Workers構成図](/images/ai-lab-blog-architecture.png)

編集可能なDraw.ioファイルは、リポジトリの[`docs/ai-lab-blog-architecture.drawio`](https://github.com/takapi-s/ai-lab-blog/blob/main/docs/ai-lab-blog-architecture.drawio)から確認できます。

記事の下書きは、今後miniPC上のHermes Agentから作成し、Pull Requestを確認ゲートとして公開する予定です。
