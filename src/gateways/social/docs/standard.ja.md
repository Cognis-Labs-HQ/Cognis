# ソーシャルゲートウェイ

## 概要

ソーシャルゲートウェイは、プロフィール、投稿、ソーシャルグラフ、
プライベートメッセージなど、ユーザー向けのソーシャル機能を統括します。
データベースロジックを直接持たず、`src/adapters/social/` 配下のアダプターを
検出して起動します。各アダプターは独立した領域を担当します。ゲートウェイを
無効にすると、Auth、Notify、その他のゲートウェイには影響せず、すべての
ソーシャルアダプターがまとめて無効になります。

新しいソーシャル機能領域は、`src/adapters/social/` 配下に新しいアダプター
ディレクトリを置くだけで追加できます。中央登録は不要です。

## 責務

- サーバー起動時に `CoreSocialGateway.bootstrapAdapters()` で全ソーシャル
  アダプターを検出して起動する。
- 登録済みアダプターのレジストリを保持し、管理 UI 向けに
  `GET /api/v1/gateways/social/adapters` で公開する。
- 各アダプターへ `SocialAdapterBootstrapCtx` を渡し、ルート、静的アセット、
  ナビバー プラグイン、Capability の登録を可能にする。
- `social:profileStore` が Messages アダプターの実行前に利用できるよう、
  Profile を先に起動する順序を保証する。

対象外: プロフィールロジック、メッセージングロジック、投稿ロジック、
ファイル保存。これらは個別のアダプターが所有します。

## アーキテクチャ

### CoreSocialGateway

`src/gateways/social/gateway.ts` は `CoreSocialGateway` を定義します。
アダプターは Notification ゲートウェイと同じ検出/起動ライフサイクルに従います。
`createSocialAdapter()` は管理リストと永続化された切り替え状態に使う
アダプター ID を宣言し、`bootstrapSocialAdapter(ctx)` はルート、静的アセット、
ナビバー項目、Capability を接続します。

ゲートウェイは次のメソッドを提供します。

| メソッド                       | 説明                                     |
| ------------------------------ | ---------------------------------------- |
| `discoverAdapters(root)`       | アダプターファクトリを読み込み ID を記録 |
| `loadPersistedConfigs()`       | 保存済みの有効/無効状態を復元            |
| `registerAdapter(adapter)`     | 検出したアダプターを記録                 |
| `listAdapters()`               | API 用に登録済みアダプターを返す         |
| `enableAdapter(id)`            | アダプターを有効化して状態を保存         |
| `disableAdapter(id)`           | アダプターを無効化して状態を保存         |
| `bootstrapAdapters(root, ctx)` | アダプターの起動処理を読み込んで実行     |

### アダプター起動サイクル

`discoverAdapters` は指定されたルートディレクトリを走査し、各サブディレクトリの
`package.json` を読み、アダプターのエントリーポイントをインポートし、
`createSocialAdapter()` をエクスポートするモジュールを登録します。永続化された
設定を読み込んだ後、`bootstrapAdapters` は同じモジュールをインポートし、存在する
場合は `bootstrapSocialAdapter` を呼び出します。アダプターのエラーは個別に捕捉し、
ログに記録します。

Profile は最初に並べられ、Messages の前に `social:profileStore` を提供します。
Profile が存在しない、または失敗した場合、Messages はその Capability を見つけず、
プロフィール依存機能を安全にスキップします。

### SocialAdapterBootstrapCtx

`src/gateways/social/gateway.ts` で定義され、各アダプターに渡されます。

| フィールド                              | 説明                                       |
| --------------------------------------- | ------------------------------------------ |
| `gateway`                               | ゲートウェイ制御用の `CoreSocialGateway`   |
| `adapterId`                             | 起動中アダプターのディレクトリ名           |
| `adapterRoot`                           | アダプターディレクトリの絶対パス           |
| `capabilities`                          | 共有 `CapabilityStore`                     |
| `gatewayRegistry`                       | ゲートウェイレジストリ。読み取り推奨       |
| `registerRoute(handler, gwId)`          | 指定ゲートウェイ ID で HTTP ルート登録     |
| `registerStaticDir(prefix, dir)`        | `/static/<prefix>/` で静的ディレクトリ配信 |
| `registerAdapterStaticDir(gw, ad, dir)` | `/static/adapters/<gw>/<ad>/` で配信       |
| `registerNavbarPlugin(url, isEnabled?)` | 条件付きナビバー スクリプトを追加          |
| `log`                                   | 任意の構造化ロガー                         |
| `dbExecutor`                            | `db:executor` Capability の DB Executor    |
| `dbType`                                | データベース方言文字列                     |
| `isGatewayEnabled()`                    | Social ゲートウェイ無効時に `false`        |
| `isAdapterEnabled(id?)`                 | 現在/指定アダプター無効時に `false`        |

## 同梱アダプター

- **Profile** (`src/adapters/social/profile/`) — ユーザープロフィール、
  ソーシャルグラフ、投稿、ユーザー別設定、ファイルルート。
- **Messages** (`src/adapters/social/messages/`) — サーバー側で本文を暗号化する
  プライベートメッセージとチャットルーム。

## API ルート

| メソッド | パス                                           | 説明                   | Auth  |
| -------- | ---------------------------------------------- | ---------------------- | ----- |
| `GET`    | `/api/v1/gateways/social/adapters`             | 登録済みアダプター一覧 | Admin |
| `POST`   | `/api/v1/gateways/social/adapters/:id/enable`  | アダプターを有効化     | Admin |
| `POST`   | `/api/v1/gateways/social/adapters/:id/disable` | アダプターを無効化     | Admin |
