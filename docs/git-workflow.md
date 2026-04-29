# Git Workflow

## 目標

- `main` ブランチを公開用にする
- `develop` ブランチで編集する
- `develop` の内容をローカルで確認できるようにする
- 変更がまとまったら `develop` から `main` にPull Requestを出す

## ブランチ方針

```text
main      公開中の安定版
develop   次に公開する作業版
feature/* 大きめの作業を分けたいときだけ使う
```

初期は個人開発なので、普段は `develop` だけで作業して十分です。

## 初期セットアップ案

```bash
cd /Users/ogamon/workspace/poker-allin-flip
git init
git switch -c main
git add .
git commit -m "Initial project notes"
git switch -c develop
```

GitHubにリポジトリを作った後:

```bash
git remote add origin git@github.com:kimup/poker-allin-flip.git
git push -u origin main
git push -u origin develop
```

## 日常作業

```bash
git switch develop
python3 -m http.server 5173
```

作業後:

```bash
git status --short
git add .
git commit -m "Implement all-in flip MVP"
git push
```

## mainへの反映

GitHubで以下のPRを作ります。

```text
base: main
compare: develop
```

確認すること:

- ローカルで `npm run dev` が動く
- ローカルで `python3 -m http.server 5173` から画面を確認できる
- 主要画面をスマホ幅とPC幅で確認する
- 秘密情報が含まれていない

## 公開運用

### GitHub Pagesの場合

- `main` を公開元にする
- `develop` はローカル確認用
- PRをマージすると公開が更新される

### Vercelの場合

- `main` をProductionにする
- `develop` やPRはPreviewにする
- ローカル確認は `npm run dev`

## ローカルでdevelopを確認する

```bash
git switch develop
python3 -m http.server 5173
```

ブラウザで以下を開きます。

```text
http://localhost:5173
```

## 注意

- `main` へ直接コミットしない
- `.env` やAPIキーをコミットしない
- 公開前に `git status --short` と差分を確認する
- 実装が大きくなったら `feature/hand-input` のようなブランチを切る
