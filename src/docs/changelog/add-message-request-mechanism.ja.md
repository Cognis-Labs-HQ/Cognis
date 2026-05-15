# PR変更履歴 — メッセージリクエスト機構の追加

## 概要

プロフィールのメッセージボタンの挙動を修正し、クリック時に必ず
アクションが実行されるようにしました。既存のダイレクトルームを開く、
新しいダイレクトルームを作成する、またはダイレクト開始条件を満たさ
ない場合はメッセージリクエストを送信します。

相互フォローしていないユーザー同士でも会話を始められる代替手段として、
メッセージリクエストを追加しました。相互フォロー済みの場合は従来どおり
リクエストなしで直接会話を開始します。

あわせて、既読表示、入力中通知、絵文字リアクションをメッセージのAPIと
UIに追加しました。

## 変更されたコンポーネントとファイル

- Social messages アダプター:
    - `src/adapters/social/messages/store.ts`
    - `src/adapters/social/messages/routes.ts`
    - `src/adapters/social/messages/ui/app.js`
    - `src/adapters/social/messages/ui/messages.css`
    - `src/adapters/social/messages/tests/routes.test.ts`
    - `src/adapters/social/messages/tests/store.test.ts`
    - `src/adapters/social/messages/docs/standard.en.md`
    - `src/adapters/social/messages/package.json`
- Social profile アダプター:
    - `src/adapters/social/profile/routes/social.ts`
    - `src/adapters/social/profile/ui/app.js`
    - `src/adapters/social/profile/package.json`
- ローカライズ:
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
- バージョン一覧:
    - `src/docs/versions.en.md`

## コミット

- [d4f7f6d](https://github.com/le-firehawk/Cognis/commit/d4f7f6d)
- [fc3febe](https://github.com/le-firehawk/Cognis/commit/fc3febe)
