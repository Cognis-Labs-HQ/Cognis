# Ctxアーキテクチャの強制適用

## ctxにおける公開ケイパビリティ・サーフェス

`Ctx`インターフェースに3つの新しいメソッドが追加されました：
`contributePublicCapability`、`isPublicCapability`、`listPublicCapabilities`。
これらにより、ゲートウェイ・ブートストラップはどのケイパビリティが公開の
コンポーネント間APIサーフェスの一部であるかを明示的に宣言できます。
公開パスを通じて登録されたケイパビリティは、標準の `requireCapability` /
`getCapability` メソッドを通じて引き続きアクセス可能ですが、明示的に公開と
してもトラッキングされます。これにより、利用者が宣言された公開サーフェスのみを
呼び出していることを自動的に検証できるようになります。

## ゲートウェイ契約型のcoreへの移動

`AuthContext`、`AuthGateway`、`QueryResult`、`DatabaseGateway`、
`StoredObject`、`FileStorageGateway`、および `AccessRole` が
`src/core/contracts/` に定義され、`@cognis/core` からエクスポートされるように
なりました。これらの定義を以前に持っていたゲートウェイファイルは、coreから
再エクスポートする形に変更されました。これにより、共有型を取得するためだけに
ゲートウェイファイルを直接インポートする必要がなくなりました。

## 壊れていたフックフック呼び出しの修正

2つのゲートウェイ・ブートストラップが `flowCtx.on(flowId, stageId, handler)`
という `Ctx` インターフェースに存在しない3引数の短縮形を使用しており、
サイレントなランタイム障害を引き起こす可能性がありました。いずれも正しい形式
`addFlowStageHook(flowId, stageId, { id }, handler)` に置き換えられました：

- `src/gateways/social/bootstrap.ts`（フック4つ）
- `src/gateways/notify/bootstrap/index.ts`（フック1つ）

## 静的境界強制テスト

新しいテストファイル `src/core/tests/ctx-boundary.test.ts` がソースファイルを
スキャンして4つのルールをテスト時に静的に強制します：

1. coreパッケージはゲートウェイまたはAPIレイヤーからインポートしてはならない。
2. どのソースファイルも非推奨の `flowCtx.on()` 短縮形を使用してはならない。
3. ゲートウェイ契約型はゲートウェイファイルから直接ではなく、`@cognis/core`
   から取得しなければならない。
4. ゲートウェイ実装は他のゲートウェイの本番コードをインポートしてはならない。
   （`gateways/shared.ts` と `gateways/db/reuse/db-executor.ts` の共有
   ゲートウェイ・ユーティリティは明示的に許可リストに登録されています。）

studyゲートウェイはこれまでルール4に違反し、`AccessRole` をauthゲートウェイから
直接インポートしていました。このインポートは `@cognis/core` 経由に変更されました。

## 変更されたコンポーネントとファイル

- `src/core/ctx/state.ts`
- `src/core/ctx/types.ts`
- `src/core/ctx/create-ctx.ts`
- `src/core/ctx/contribute-public-capability.ts`（新規）
- `src/core/ctx/is-public-capability.ts`（新規）
- `src/core/ctx/list-public-capabilities.ts`（新規）
- `src/core/contracts/auth-gateway.ts`
- `src/core/contracts/db-gateway.ts`（新規）
- `src/core/contracts/files-gateway.ts`（新規）
- `src/core/index.ts`
- `src/gateways/auth/gateway.ts`
- `src/gateways/auth/access-tokens.ts`
- `src/gateways/db/gateway.ts`
- `src/gateways/files/gateway.ts`
- `src/gateways/social/bootstrap.ts`
- `src/gateways/notify/bootstrap/index.ts`
- `src/gateways/study/gateway.ts`
- `src/core/tests/ctx.test.ts`
- `src/core/tests/ctx-boundary.test.ts`（新規）

## ctx.flow APIとensureCtxCapabilityの削除

冗長な`ensureCtxCapability`/`addFlowStageHook`パターンを
`ctx.flow.exists()`/`ctx.flow.extend()`/`ctx.flow.run()`に置き換え。
フックの注入は冪等になり（重複IDでは例外を投げずに`false`を返す）、
すべてのゲートウェイ・アダプタ・モジュールがブートストラップコンテキストから
`flow: FlowApi`を直接受け取るようになりました。

### 変更点

- `FlowApi`インターフェースと`flow`プロパティを`Ctx`と`GatewayBootstrapBase`に追加
- `ensureCtxCapability`と`CtxCapabilityStore`を`@cognis/core`から削除
- すべてのゲートウェイブートストラップを`ctx.flow.extend()`に移行
- `ctx-boundary.test.ts`にルール5・6を追加

## ファイル命名コンプライアンス確認

親ディレクトリが既に同じコンテキストを提供している場合、ファイル名から
フィーチャーまたはアダプタのプレフィックスが削除されました。
対象ファイルはより自然なプレフィックスなしのパスに移動しました：

- `src/core/contracts/profile-media-flow-catalog.ts` → `profile/media-flow-catalog.ts`
- `src/adapters/social/profile/profile-store.ts` → `store-contract.ts`
- `src/adapters/social/profile/routes/profile-media-flow-hooks.ts` → `routes/media-flow-hooks.ts`
- `src/adapters/social/messages/routes/requests-routes.ts` → `routes/requests/index.ts`
- `src/adapters/social/messages/routes/room-routes.ts` → `routes/room/index.ts`
- `src/adapters/social/messages/routes/rooms-routes.ts` → `routes/rooms/index.ts`
- `src/adapters/notify/smtp/smtp-message-builders.ts` → `message-builders.ts`
- `src/adapters/notify/smtp/smtp-notification-queue.ts` → `notification-queue.ts`
- `src/adapters/notify/smtp/smtp-notification-sender.ts` → `notification-sender.ts`
- `src/adapters/notify/smtp/smtp-notification-sender-factory.ts` → `notification-sender-factory.ts`
- `src/gateways/calendar/calendar-store.ts` → `store.ts`
- `src/api/routes/ui/ui-route-rules.ts` → `route-rules.ts`

すべてのインポートとテストファイルが更新されました。AIインストラクションファイルに
冗長なプレフィックス禁止ルールが明示的に文書化されました。
