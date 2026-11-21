# 技術リファレンス

カレンダーの読み込みと書き出し の公開インターフェースと運用規則を説明します。

## インターフェース

`GET /api/v1/calendar/ics/export` — `calendarId`

`POST /api/v1/calendar/ics/import` — `calendarId`, `ics`

## 設定

追加のアダプター設定はありません。設定と権限はカレンダーのゲートウェイと選択したカレンダーから取得します。

## 動作

書き出しは自分のカレンダーを読み、ICS の添付ファイルを返します。読み込みには `calendarId` と空でない `ics` テキストが必要で、カレンダーのゲートウェイを通じて処理します。

## セキュリティ

読み書きには、対象のカレンダーへの権限を持つ認証済みアカウントが必要です。共有フィードは、予定の参照や変更の前にトークン、有効期限、現在の権限を確認します。

## リファレンス

- [src/adapters/calendar/ics/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/calendar/ics/manifest.json)
- [src/adapters/calendar/ics/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/calendar/ics/package.json)
- [src/adapters/calendar/ics/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/calendar/ics/index.ts)
