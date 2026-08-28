# PR 変更履歴 — Cleanup Strings

## 要約

変更履歴ファイル名ポリシーを、`copilot/` プレフィックスを除いたブランチ名
ベースに更新し、この変更履歴エントリーもその規則に合わせてリネームしました。

変更履歴のドキュメント参照とガイダンスを、このブランチ名ベースの命名規則に
合わせて更新しました。

機能固有の DB ストア実装を `src/adapters/db/reuse/` から各ゲートウェイ・
アダプターへ移動しました。DB アダプター/ゲートウェイは他のゲートウェイ/
アダプターのコードを含んではならず、アダプターディレクトリ内に `reuse/`
ディレクトリを作成してはならないという原則に基づく変更です。

`.github/copilot-instructions.md` を更新して両方のルールを明文化しました。
また、変更履歴ポリシーを更新し、すべてのプルリクエストでサポート対象の
全アプリ言語（de、en、id、ja）のエントリーを必須としました。

`ensureTable()` における MariaDB 互換性バグを修正しました。主キーまたは
ユニークキーとして使用されるテキスト列に、`TEXT` ではなく `VARCHAR(255)` を
使用するようにしました。MariaDB では TEXT 列を長さ指定なしでインデックスや
キー制約に使用することができないためです。

## 変更されたコンポーネントとファイル

- AI 貢献ガイド:
    - `.github/copilot-instructions.md`
- ドキュメント索引/バージョン管理:
    - `src/docs/index.en.md`
    - `src/docs/versions.en.md`
    - `src/docs/versions.de.md`
    - `src/docs/versions.id.md`
    - `src/docs/versions.ja.md`
- 新しい変更履歴ドキュメント:
    - `src/changelogs/index.en.md`
    - `src/changelogs/cleanup-strings-and-codebase.en.md`
- 削除したルート変更履歴:
    - `CHANGELOG.md`
- 移動した DB ストア（`src/adapters/db/reuse/` から削除）:
    - `src/api/reuse/account-store.ts`
    - `src/gateways/notify/notification-store.ts`
    - `src/gateways/db/reuse/executor-log.ts`
    - `src/adapters/notify/internal/db-store.ts`
    - `src/adapters/social/profile/store.ts`
    - `src/adapters/social/profile/preference-store.ts`
- MariaDB アダプターのバグ修正:
    - `src/adapters/db/mariadb/adapter.ts`

## コミット

- [6ab293a](https://github.com/Cognis-Labs-HQ/Cognis/commit/6ab293a)
- [8299d2b](https://github.com/Cognis-Labs-HQ/Cognis/commit/8299d2b)
- [b93c948](https://github.com/Cognis-Labs-HQ/Cognis/commit/b93c948)
