# ライブラリの削除

削除の確認はサーバーが保存済みのスキーマバージョンを使って計画し、現在のページに表示されていない依存カードも含めます。Study ゲートウェイクライアントはデータを変更しない削除事前確認を提供します。

`POST /api/v1/study/library/entries/deletion-plan`

`{ "entryIds": ["entry-id"] }` → `{ "data": { "entryIds": ["entry-id"], "entries": [{ "id": "entry-id", "label": "..." }] } }`

不足している翻訳を取得する操作は `{ translations, languages }` を `POST /api/v1/study/library/definitions/localize` に送信します。`localization:translateString` で不足する UI 言語を取得し、既存の翻訳を保持します。プロバイダーがない場合や失敗した場合は `missingLanguages` を返します。不足する訳文は編集でき、英語を別の言語の欄にコピーしません。定義を手動で追加する場合にも利用できます。
