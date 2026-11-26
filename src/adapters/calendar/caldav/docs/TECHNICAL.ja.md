# 技術リファレンス

CalDAV の公開インターフェースと運用規則を説明します。

## インターフェース

`GET /api/v1/calendar/caldav/calendars/:calendarId/export`

`/api/v1/calendar/caldav/public/:name`

`/api/v1/calendar/caldav/private/:token`

## 設定

追加のアダプター設定はありません。設定と権限はカレンダーのゲートウェイと選択したカレンダーから取得します。

## 動作

書き出しは購読用の URL を返します。公開カレンダーと非公開のトークンには別のフィード URL を使います。共有された予定の変更は共有権限に制限され、独立したクライアント用アカウントは作成しません。

## セキュリティ

読み書きには、対象のカレンダーへの権限を持つ認証済みアカウントが必要です。共有フィードは、予定の参照や変更の前にトークン、有効期限、現在の権限を確認します。

## リファレンス

- [src/adapters/calendar/caldav/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/calendar/caldav/manifest.json)
- [src/adapters/calendar/caldav/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/calendar/caldav/package.json)
- [src/adapters/calendar/caldav/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/calendar/caldav/index.ts)
