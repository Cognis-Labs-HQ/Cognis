# PR変更履歴 — Ctxを機能連携の中核にする

## 概要

コアAPIルート配線と複数のgateway/adapterブートストラップ経路を、
ctxベースの機能取得へ寄せました。

Authヘルパーは route context capability として公開され、APIルート
ファクトリーと module extension ルーティングは auth gateway の内部を
直接 import しなくなりました。gateway/adapter のブートストラップ処理も
DBアクセスやクロスコンポーネント連携で ctx capability lookup を優先します。

さらに今回の追補で、ctx 利用を adapter ルート、Study の言語 module、
gateway 所有の UI/API ルートまで広げ、capability の提供箇所で公開内容を
より明確に文書化しました。加えて `@cognis/core` への内部 workspace 参照を
揃え、`npm install` が再びローカル workspace package を正しく解決します。

今回の更新では、CLI アクセストークンを ctx から auth capability を解決した
後でのみ発行するよう API bootstrap 順序も修正し、`src/api/main.ts` の
起動時 `ReferenceError` を解消しました。

## 変更コンポーネント/ファイル

- コア/API の capability と route context 配線:
    - `src/core/services/gateway-service.ts`
    - `src/api/reuse/route-context.ts`
    - `src/api/server.ts`
    - `src/api/main.ts`
    - `src/modules/routes/module-extensions.ts`
- API ルートファクトリーを注入型 route context へ移行:
    - `src/api/routes/search/index.ts`
    - `src/api/routes/modules/index.ts`
    - `src/api/routes/gateways/index.ts`
    - `src/api/routes/system/index.ts`
    - `src/api/routes/users/index.ts`
    - `src/api/routes/ui/index.ts`
- gateway/adapter の ctx capability 整理:
    - `src/gateways/auth/bootstrap.ts`
    - `src/gateways/logging/bootstrap.ts`
    - `src/gateways/db/bootstrap.ts`
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/routes/notifications.ts`
    - `src/gateways/notify/gateway.ts`
    - `src/gateways/registration/bootstrap.ts`
    - `src/gateways/social/bootstrap.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/adapters/notify/internal/index.ts`
    - `src/adapters/notify/internal/routes.ts`
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/routes.ts`
    - `src/adapters/social/profile/index.ts`
    - `src/adapters/social/profile/routes/index.ts`
    - `src/adapters/social/profile/routes/social.ts`
    - `src/adapters/social/profile/routes/files.ts`
    - `src/adapters/social/profile/routes/preferences.ts`
    - `src/adapters/social/profile/routes/posts.ts`
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/routes.ts`
    - `src/modules/study/languages/en/index.ts`
    - `src/modules/study/languages/ja/index.ts`
    - `src/gateways/study/gateway.ts`
- 指示とバージョン管理:
    - `.github/copilot-instructions.md`
    - `src/api/gateway-bootstrap.ts`
    - `src/docs/versions.en.md`
    - ローカル `@cognis/core@0.1.1` を参照する adapter/module の `package.json`

## コミット

- [feb1bbc](https://github.com/le-firehawk/Cognis/commit/feb1bbc)
- [c6ba65b](https://github.com/le-firehawk/Cognis/commit/c6ba65b)
- [acaded15](https://github.com/le-firehawk/Cognis/commit/acaded15)
- [e7255fe0](https://github.com/le-firehawk/Cognis/commit/e7255fe0)
