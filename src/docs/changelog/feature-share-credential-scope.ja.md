# 共有アクセスの範囲

**機能ブランチ:** feature-share-credential-scope

## アカウントとゲストの境界

通常のアカウント認証では、検証済みのセッション用認証情報のみを受け入れます。ゲスト対応リソースは現在の Share 許可を明示的に検証し、リソースと操作の権限を適用します。共有カレンダーの予定、委任されたチャット、ゲストの Keyring、読み取り専用 Flashcards は制限付きアクセスを維持します。

## 検証済みセッション識別

ブラウザーの Auth と Share は、アカウント名の接頭辞や保存マーカーではなく検証済み認証情報を判別します。個人の学習活動、プロフィールの在席状態、オフライン配信では、接頭辞付きの正規アカウントを維持し、既存のゲスト制限を保ちます。遅れて完了した認証処理が新しいセッションを置き換えることはありません。

## コミット

- [d4ce81f358beccf5b559295be48b4f0ee0cc2408](https://github.com/Cognis-Labs-HQ/Cognis/commit/d4ce81f358beccf5b559295be48b4f0ee0cc2408)
- [1a2d25e7dc0ef6f19225f5e6cd5ccc65fcb74897](https://github.com/Cognis-Labs-HQ/Cognis/commit/1a2d25e7dc0ef6f19225f5e6cd5ccc65fcb74897)
- [0deea1701af7b4b1ca9da660a6ab299200125d0c](https://github.com/Cognis-Labs-HQ/Cognis/commit/0deea1701af7b4b1ca9da660a6ab299200125d0c)
