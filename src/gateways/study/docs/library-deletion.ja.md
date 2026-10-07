# ライブラリの削除

削除の確認はサーバーが保存済みのスキーマバージョンを使って計画し、現在のページに表示されていない依存カードも含めます。Study ゲートウェイクライアントはデータを変更しない削除事前確認を提供します。

`POST /api/v1/study/library/entries/deletion-plan`

`{ "entryIds": ["entry-id"] }` → `{ "data": { "entryIds": ["entry-id"], "entries": [{ "id": "entry-id", "label": "..." }] } }`
