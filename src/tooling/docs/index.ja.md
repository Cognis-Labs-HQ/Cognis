# ツーリング

## 概要

`src/tooling/` ディレクトリには、Cognisコードベースのすべての開発者ツールが含まれています: リントスクリプト、TypeScript設定ジェネレーター、コンテナヘルスチェックスクリプト、`cognisctl` 運用CLIです。

## 責務

- `lint-readable.mjs` を通じて読みやすさのルールを強制する（タブなし、末尾の空白なし）。
- `lint-placeholder.mjs` を通じてプレースホルダー標準を強制する。
- モノリポ用の統合 `tsconfig.json` を生成する。
- `cognisctl` を通じて運用管理コマンドを提供する。

## アーキテクチャ

### `cognisctl` CLI

`cognisctl` はプライマリ運用コントロールサーフェスです。コマンドモジュールは以下から自動検出されます:

- `src/tooling/cli/commands/` — コア組み込みコマンド
- インストール済みモジュールからエクスポートされた `cli/index.js`

| namespace     | サンプルコマンド                                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `user:*`      | `user:create`、`user:role`、`user:set-password`、`user:disable`、`user:enable`、`user:delete`                                                   |
| `system:*`    | `system:health`、`system:info`                                                                                                                  |
| `component:*` | `component:list`、`component:enable`、`component:disable`、`component:import`、`component:config:get`、`component:config:set`、`component:test` |
| `api:*`       | `api:token`（curl 用の一時的な 1 時間管理者緊急トークンを発行）                                                                                 |

組み込みの `cognisctl` コマンドは、端末が対応していれば見出し、整列した項目、ANSI カラーを使ったレスポンス対応の端末出力を描画できます。カスタムレンダラーを持たないコマンドは整形済み JSON にフォールバックします。

## 設定

| 変数                       | デフォルト    | 説明                                                             |
| -------------------------- | ------------- | ---------------------------------------------------------------- |
| `COGNIS_CLI_TOKEN_PATH`    | —             | 認証済み `cognisctl` コマンド用APIトークンを含むファイルへのパス |
| `COGNIS_MODULES_ROOT`      | `src/modules` | モジュール提供のサブコマンドを検出するために使用                 |
| `COGNIS_GATEWAY_CLI_PATHS` | —             | ゲートウェイ提供サブコマンド用の任意のパス一覧                   |
| `COGNIS_ADAPTER_CLI_PATHS` | —             | アダプター提供サブコマンド用の任意のパス一覧                     |
