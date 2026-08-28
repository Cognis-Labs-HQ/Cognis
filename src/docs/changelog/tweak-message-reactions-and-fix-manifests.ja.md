# リアクション永続化と絵文字拡張

**Feature Branch:** copilot/tweak-message-reactions-and-fix-manifests

## 概要

メッセージのリアクションが付いている場合、ホバーしていなくてもリアクションチップが常に表示されるようになりました。クイックリアクションストリップはユーザーが最も頻繁に使用する絵文字5つを動的に表示し、優先順位を自動調整します。「···」ボタンを新設し、300以上の絵文字から検索できる全体絵文字ピッカーを開けるようになりました。

絵文字の使用履歴がlocaStorageではなくデータベースにユーザーごとに保存されるようになりました。新しい`chat_emoji_usage`テーブルが各ユーザーの選択回数を記録し、ページ読み込み時に照会されます。クイックリアクションの5枠にハードコードされたデフォルト値がなくなり、使用履歴がない場合は絵文字カタログの先頭エントリが使われます。

カタログ内のすべての絵文字名がSocial Gatewayの言語ファイルで解決されるi18nキーになりました。ピッカーの検索機能とボタンのツールチップには翻訳済みの名前が表示されます。

## 変更されたファイルとコンポーネント

- `src/gateways/social/ui/emojis.json` — 絵文字名をi18nキーに変更
- `src/gateways/social/ui/languages/*/strings.xml` — 366個の翻訳済み絵文字名を含む新しいSocial Gateway言語ファイル
- `src/adapters/social/messages/store.ts` — 新しい`chat_emoji_usage`テーブル；`incrementEmojiUsage`と`getTopEmojiUsage`メソッド
- `src/adapters/social/messages/routes.ts` — 新しい`GET/POST /api/v1/social/messages/emoji-usage`ルート
- `src/adapters/social/messages/ui/app.js` — サーバー側の絵文字使用履歴、i18n名前解決、ハードコードなし
- `src/adapters/social/messages/ui/messages.css` — CSS分割：リアクションチップ常時表示、追加ボタンはホバー時のみ
- `src/adapters/social/messages/ui/languages/en/strings.xml` — 新しいi18nキー
- `src/adapters/social/messages/ui/languages/de/strings.xml` — ドイツ語翻訳
- `src/adapters/social/messages/ui/languages/id/strings.xml` — インドネシア語翻訳
- `src/adapters/social/messages/ui/languages/ja/strings.xml` — 日本語翻訳
- `src/adapters/social/messages/tests/store.test.ts` — 絵文字使用スキーマとメソッドのテスト
- `src/adapters/social/messages/manifest.json` — バージョン更新 1.4.0 → 1.4.1

## コミットリンク

- https://github.com/Cognis-Labs-HQ/Cognis/commit/2a9c702
- https://github.com/Cognis-Labs-HQ/Cognis/commit/295496e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/1e40511
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e19669d
