# 24時間営業マップ（midnightspot.jp）

地図データに **24時間営業（`opening_hours=24/7`）** と登録されている店舗だけを載せる静的サイト。

## 方針

- 「深夜まで営業」「たぶん開いている」という推測では載せない
- **コンビニは載せない**（数が多く、深夜に開いているのが当たり前のため）
- 混雑状況・在庫・空席は載せない（公開データが無いため）
- 営業時間は変わるので、行く前に店舗へ確認するよう各ページに明記する

## データ

| 内容 | 出所 |
|---|---|
| 店舗の名称・場所・種類・電話・公式サイト | OpenStreetMap（ODbL 1.0） |

`scripts/build-spot-data.py` が都道府県ごとに取得して `src/spots.json` を書き出す。
手元の回線では Overpass に断られることが多いため、GitHub Actions
（`.github/workflows/refresh-data.yml`）から実行する。

## サイトの組み立て

```
npm run build   # node scripts/build-site.mjs
```

`src/spots.json` が空のときは、一覧を公開せず「準備中」ページだけを書き出す
（noindex＋`Disallow: /`）。中身の無いページを検索結果に出さないため。

`main` へ push すると Actions が `dist/` を Xserver へ rsync する。
