# ピグパ画像加工アプリ

ピグパ（ピグパーティ）のアイテム詳細画面のスクショから、出品用の画像と文字起こしを作るアプリ。

- 公開先: https://ahonokiki.github.io/piggparty-app/
- アイテム名一覧 `items.json`: PIGG PARTY データベースから毎日更新（`tools/build-items.mjs`・`.github/workflows/items.yml`）
- 売れ筋ランキング: ゲームトレード（ピグパ）の出品を毎日記録して集計し、合言葉（Secrets の `RANKING_KEY`）で暗号化して `data/` に保存（`tools/gametrade-track.mjs`・`.github/workflows/gametrade.yml`）
