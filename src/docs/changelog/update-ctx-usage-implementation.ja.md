# PR変更履歴 — Ctxを機能連携の中核にする

## 概要

コアAPIルート配線と複数のgateway/adapterブートストラップ経路を、
ctxベースの機能取得へ寄せました。

Authヘルパーは route context capability として公開され、APIルート
ファクトリーと module extension ルーティングは auth gateway の内部を
直接 import しなくなりました。gateway/adapter のブートストラップ処理も
DBアクセスやクロスコンポーネント連携で ctx capability lookup を優先します。

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
    - `src/gateways/db/bootstrap.ts`
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/gateway.ts`
    - `src/gateways/registration/bootstrap.ts`
    - `src/gateways/social/bootstrap.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/adapters/notify/internal/index.ts`
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/profile/index.ts`
    - `src/adapters/study/classes/index.ts`
- 指示とバージョン管理:
    - `.github/copilot-instructions.md`
    - `src/api/gateway-bootstrap.ts`
    - `src/docs/versions.en.md`

## コミット

- [feb1bbc](https://github.com/le-firehawk/Cognis/commit/feb1bbc)
- [c6ba65b](https://github.com/le-firehawk/Cognis/commit/c6ba65b)
