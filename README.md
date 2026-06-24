# Incident Flip Walk

`game/index.html` をブラウザで開いてプレイ。

## 問題

- **規定問題 8 問**（1〜5 は小〜中規模、6〜8 は頂点数多め）
- **ランダム**で毎回新しい問題を生成

## 再生成（開発用）

規定問題を作り直す場合:

```bash
node game/gen-presets.js
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('game/presets.json'));fs.writeFileSync('game/presets.js','const PRESETS = '+JSON.stringify(p,null,2)+';\\n');"
```
