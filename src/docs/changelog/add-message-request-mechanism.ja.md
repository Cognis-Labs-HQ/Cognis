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

チェックマークによる既読表示システムをアバターベースのデザインに置き換えました。
送信済みメッセージは、サーバーが配信を確認するまでは空の輪のアイコン、確認後は
塗りつぶした丸、既読後は読んだユーザーのアバターを表示します。グループ会話では
複数のアバターが並んで表示されます。絵文字リアクションのツールチップは、絵文字
の代わりに一言の説明（"Like"・"Heart"・"Haha"・"Celebrate"）を表示するように
なりました。

## コミット

- [d4f7f6d](https://github.com/le-firehawk/Cognis/commit/d4f7f6d)
- [fc3febe](https://github.com/le-firehawk/Cognis/commit/fc3febe)
- [11eebfa](https://github.com/le-firehawk/Cognis/commit/11eebfa)
- [2db27c2](https://github.com/le-firehawk/Cognis/commit/2db27c2)
- [f08f248](https://github.com/le-firehawk/Cognis/commit/f08f248ea1b20fef4b7e5452e19a2857ed4b785e)
