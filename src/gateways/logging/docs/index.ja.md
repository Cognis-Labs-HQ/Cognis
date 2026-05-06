# ロギングゲートウェイ

## 概要

ロギングゲートウェイは、stdout/stderrへの構造化アプリケーションログ記録と、オプションで永続的なログファイルへの記録を提供します。環境変数から `Logger` インスタンスを作成してケイパビリティストアに提供することで、ログが必要なすべてのコンポーネントがロガーライブラリを直接インポートせずに統一インターフェースを使用できます。

ロギングゲートウェイはファイルストレージゲートウェイの後にブートストラップされる必要があります。この依存関係は `manifest.json` の `requires: ["files"]` で宣言されています。

## 責務

- `LOG_LEVEL` と `LOG_FILE` から設定された `Logger` インスタンスを作成する。
- `logging:logger` と `logging:log` をケイパビリティストアに提供する。
- 利用可能な場合は `file:append` を通じてログファイル書き込みをルーティングする。

## アーキテクチャ

```ts
export class Logger {
  constructor(level: LogLevel, filePath: string, fileAppend?: FileAppend);
  async log(level: LogLevel, message: string, meta?: Record<string, unknown>): Promise<void>;
  info(message: string, meta?: Record<string, unknown>): Promise<void>;
  warn(message: string, meta?: Record<string, unknown>): Promise<void>;
  error(message: string, meta?: Record<string, unknown>): Promise<void>;
}
```

各ログ行はJSONオブジェクトです:

```json
{ "ts": "2024-01-15T10:00:00.000Z", "level": "info", "message": "ゲートウェイがブートストラップされました。", "gateway": "auth" }
```

| ケイパビリティ | 型 | 説明 |
| ------------ | -- | ---- |
| `logging:logger` | `Logger` | 完全なLoggerインスタンス |
| `logging:log` | `(level, message, meta?) => void` | 単純なログ関数; ゲートウェイブートストラッパーが `ctx.log` として使用 |

## 設定

| 変数 | デフォルト | 説明 |
| ---- | ---------- | ---- |
| `LOG_LEVEL` | `info` | 最小ログレベル: `debug`、`info`、`warn`、または `error` |
| `LOG_FILE` | `/app/logs/app.log` | 永続ログファイルへの絶対パス |
