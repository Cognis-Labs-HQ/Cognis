# リアクション永続化と絵文字拡張

## 概要

メッセージのリアクションが付いている場合、ホバーしていなくてもリアクションチップが常に表示されるようになりました。クイックリアクションストリップはユーザーが最も頻繁に使用する絵文字5つを動的に表示し、優先順位を自動調整します。「···」ボタンを新設し、ソーシャルゲートウェイの新しいデータファイルから300以上の絵文字を検索できる全体絵文字ピッカーを開けるようになりました。social-messagesアダプターのバージョン番号も更新されました。

## 変更されたファイルとコンポーネント

- `src/gateways/social/ui/emojis.json` — 新しい包括的な絵文字データファイル（300以上の絵文字）
- `src/adapters/social/messages/ui/app.js` — 適応型クイック絵文字システム、使用状況追跡、絵文字ピッカーポップアップ
- `src/adapters/social/messages/ui/messages.css` — CSS分割：リアクションチップ常時表示、追加ボタンはホバー時のみ
- `src/adapters/social/messages/ui/languages/en/strings.xml` — 新しいi18nキー
- `src/adapters/social/messages/ui/languages/de/strings.xml` — ドイツ語翻訳
- `src/adapters/social/messages/ui/languages/id/strings.xml` — インドネシア語翻訳
- `src/adapters/social/messages/ui/languages/ja/strings.xml` — 日本語翻訳
- `src/adapters/social/messages/manifest.json` — バージョン更新 1.4.0 → 1.4.1

## コミットリンク

- https://github.com/le-firehawk/Cognis/commit/2a9c702
