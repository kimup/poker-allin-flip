# Hosting Comparison

このプロジェクトでは、基本方針として Vercel を優先候補にします。GitHub Pages でも公開できますが、`develop` ブランチやPull Requestの確認まで考えると、Vercelのほうが運用しやすいです。

## 結論

おすすめは Vercel です。

理由:

- Pull RequestごとにPreview URLを作れる
- `main` を本番、`develop` やPRを検証環境として扱いやすい
- 静的HTML/CSS/JavaScriptや Vite + React と相性が良い
- 将来APIやサーバー処理が必要になったときに拡張しやすい

GitHub Pages は、完全な静的サイトをシンプルに公開するだけなら十分です。ただし、PR確認や環境分けはVercelより弱いです。

## 比較表

| 観点 | Vercel | GitHub Pages |
| --- | --- | --- |
| 初期公開の簡単さ | 簡単。GitHub連携後に自動デプロイできる | 簡単。ただしViteの `base` 設定が必要な場合がある |
| 静的サイトとの相性 | とても良い | 良い |
| React/Viteとの相性 | とても良い | 良い |
| `main` 本番運用 | やりやすい | やりやすい |
| `develop` 確認 | Preview Deploymentとして扱いやすい | 手元確認が中心。公開Previewは工夫が必要 |
| Pull Request確認 | PRごとにPreview URLが出る | 標準では弱い |
| 将来のAPI追加 | Vercel Functionsなどで拡張しやすい | 基本は静的サイト向け |
| 設定の少なさ | GitHub連携が必要 | GitHubだけで完結できる |
| コスト | 個人利用の範囲なら無料枠で始めやすい | 公開リポジトリなら無料で使いやすい |
| 独自ドメイン | 対応しやすい | 対応可能 |
| 運用の見通し | 本番/Previewの分離が明確 | シンプルだがPreview運用は弱い |

## Vercelのメリット

### PRごとのPreview URL

`develop` から `main` にPull Requestを出したとき、Vercelが自動でPreview URLを作れます。これにより、マージ前に実際のWeb画面を確認できます。

このプロジェクトでは、カード表示、スマホ表示、2人で1画面を見るUIの確認が重要なので、Preview URLがあると便利です。

### mainを本番にしやすい

VercelではProduction Branchを `main` にできます。

想定運用:

```text
main    -> Production
develop -> Preview
PR      -> Preview
```

この運用は、最初に考えている「mainブランチを公開、developブランチを編集してmainにPR」と相性が良いです。

### 将来拡張しやすい

初期版はフロントエンドだけで十分ですが、将来的に以下をやりたくなる可能性があります。

- セッション結果の共有URL
- 何回も走らせた統計の保存
- AIコメントや分析文の生成
- 簡単なAPI処理

Vercelなら、静的サイトから軽いサーバー処理へ拡張しやすいです。

## Vercelのデメリット

- Vercelアカウント連携が必要
- GitHub Pagesよりサービス依存が増える
- 無料枠の範囲や制限を一応見る必要がある
- 設定項目がGitHub Pagesより少し多い

ただし、このプロジェクトの初期規模では大きな問題になりにくいです。

## GitHub Pagesのメリット

### GitHubだけで完結する

GitHub PagesはGitHubの機能なので、追加サービスを使わずに公開できます。小さな静的サイトならかなりシンプルです。

### 静的サイトなら十分

このアプリの初期版は、ログイン、DB、APIなしで作れます。そのためGitHub Pagesでも十分動きます。

### 運用が分かりやすい

`main` にマージされたら公開される、という単純な運用にできます。

## GitHub Pagesのデメリット

- PRごとのPreview URLが標準では弱い
- `develop` の公開確認には工夫が必要
- Viteの場合、リポジトリ名付きURLに合わせた `base` 設定が必要になることがある
- 将来APIやサーバー処理が必要になった場合は別サービスが必要

## このプロジェクトでの推奨運用

Vercelを使う場合:

```text
main      Production Deployment
develop   Preview Deployment
PR        Preview Deployment
local     npm run dev
```

Gitの流れ:

```text
developで実装
  -> ローカルで確認
  -> GitHubへpush
  -> Vercel Previewで確認
  -> mainへPR
  -> マージ
  -> Vercel Productionへ反映
```

## オーナー側でやること

- Vercelアカウントを用意する
- GitHubリポジトリをVercelに接続する
- Production Branchを `main` に設定する
- `develop` やPRでPreview Deploymentが作られることを確認する
- 独自ドメインを使う場合はVercel側で設定する
