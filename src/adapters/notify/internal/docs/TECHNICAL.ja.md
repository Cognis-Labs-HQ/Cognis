# 技術リファレンス

アプリ内通知 の公開インターフェースと運用規則を説明します。

## インターフェース

createNotificationSender は現在の保存先を遅延参照します。bootstrapNotifyAdapter が常時配信、認証付き受信箱、ベルを登録します。db:executor があれば DbInternalNotificationStore を初期化し、なければ一時保存の警告を出します。

| メソッド | パス                            | 説明                     | 認証     |
| -------- | ------------------------------- | ------------------------ | -------- |
| `GET`    | `/api/v1/notify/inbox`          | ユーザーの通知一覧を取得 | ユーザー |
| `GET`    | `/api/v1/notify/inbox/count`    | 未読件数を取得           | ユーザー |
| `PUT`    | `/api/v1/notify/inbox/read`     | すべて既読にする         | ユーザー |
| `PUT`    | `/api/v1/notify/inbox/:id/read` | 1件を既読にする          | ユーザー |
| `DELETE` | `/api/v1/notify/inbox/:id`      | 1件の通知を削除する      | ユーザー |
| `DELETE` | `/api/v1/notify/inbox`          | すべての通知を削除する   | ユーザー |

ナビゲーション、スタイル、翻訳、アイコンは起動時に登録する `/static/gateways/notify-internal/` を使います。ベルはこのアダプターの `ui/assets/` に置きます。

## 設定

このアダプターに設定項目はありません。通知ゲートウェイがロードしている限り常に有効です（アダプターは自動検出されるため常時有効）。無効化するにはアダプターディレクトリを削除またはリネームしてください。その場合、通知ベルはUIから消えます。

通知の生成元は、項目を継続表示として指定し、識別子、アクセシブルなラベル、任意の SVG アイコン、操作の結果を含むアクションボタン記述子を提供できます。アダプターはこの汎用契約を検証して描画し、選択された識別子と通知ペイロードを通知します。生成元のドメインを解釈したり、生成元のケイパビリティを呼び出したりしません。

生成元は継続通知を別の UI プロンプトと関連付けられます。汎用 `cognis:notification-resolved` イベントは、生成元をアダプターに認識させることなく、同じ相関識別子を持つ通知をすべて画面と保存先から削除します。

生成元は、ロケールをキーとし `subject` と `body` を持つ `metadata.localizedText` マップを添付できます。内部ブラウザーアダプターは対応する最初のブラウザーロケールを選び、該当しない場合は元のエンベロープ文言を使用します。生成元のドメインは解釈しません。

## 動作

両方の保存先は受信者ごとに五十件を保ち、古いものから削除します。データベースは暗号化し、一定の DATA_ENCRYPTION_KEY で再起動後も読めます。DB がなければ再起動で消え、本番では鍵不足を拒否します。開発用の一時鍵では再起動前の内容を復号できません。アカウント削除で受信箱も消去します。

## セキュリティ

通知ルートは受信者を認証し、そのアカウントの記録を操作します。永続化には DATA_ENCRYPTION_KEY が必要で、一定の秘密鍵として管理します。

## リファレンス

- [src/adapters/notify/internal/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/manifest.json)
- [src/adapters/notify/internal/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/package.json)
- [src/adapters/notify/internal/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/index.ts)
- [src/adapters/notify/internal/routes/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/routes/index.ts)
