# Incident Flip Walk

`game/index.html` をブラウザで開いてプレイ(ダブルクリックで開けます)。

## 中身

- **30 ステージ**(分岐・ボーナスあり)+ **ランダム**生成
- 開発者用: URL の末尾に `?dev=1` を付けると全ステージ解放

## ソースとビルド

- ゲームのソースは `app/www`(Android アプリ版も同じソース)
- `game/index.html` は `app/www` を1ファイルにまとめたもの。`app/www` を編集したら作り直す:

```bash
node app/tools/build-single-html.js
```

- Android 版: `app/build-android.bat`
- 問題作成・検証ツール: `app/lab/index.html`
