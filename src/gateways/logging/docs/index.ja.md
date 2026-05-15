# ロギングゲートウェイ

## 概要

ロギングゲートウェイは、stdout/stderrへの構造化アプリケーションログ記録と、オプションで永続的なログファイルへの記録を提供します。環境変数から `Logger` インスタンスを作成してケイパビリティストアに提供することで、ログが必要なすべてのコンポーネントがロガーライブラリを直接インポートせずに統一インターフェースを使用できます。

ロギングゲートウェイはファイルストレージゲートウェイの後にブートストラップされる必要があります。この依存関係は `manifest.json` の `requires: ["files"]` で宣言されています。

## 責務

- `LOG_LEVEL`、`LOG_FILE`、`LOG_FORMAT`、ログローテーション変数から設定された `Logger` インスタンスを作成する。
- `logging:logger` と `logging:log` をケイパビリティストアに提供する。
- 利用可能な場合は `file:append` を通じてログファイル書き込みをルーティングする。
- Administration → ログ画面向けに `GET /api/v1/logging/stream` を提供する（管理者専用 SSE ストリーム、重大度/キーワードフィルターと `LOG_LEVEL` の基準フィルター対応）。

## アーキテクチャ

```ts
export class Logger {
    constructor(
        level: LogLevel,
        filePath: string,
        fileAppend?: FileAppend,
        consoleFormat?: ConsoleLogFormat,
    );
    async log(
        level: LogLevel,
        message: string,
        meta?: Record<string, unknown>,
    ): Promise<void>;
    debug(message: string, meta?: Record<string, unknown>): Promise<void>;
    info(message: string, meta?: Record<string, unknown>): Promise<void>;
    warn(message: string, meta?: Record<string, unknown>): Promise<void>;
    error(message: string, meta?: Record<string, unknown>): Promise<void>;
}
```

デフォルトでは、Logger はコンソール出力を書き出し、永続ログファイルには引き続き JSON 行を保存します。`LOG_LEVEL` は管理ログストリームの基準フィルターとして適用され、ログファイルには全レベルが保存されます。

各永続ログ行はJSONオブジェクトです:

```json
{
    "ts": "2024-01-15T10:00:00.000Z",
    "level": "info",
    "message": "ゲートウェイがブートストラップされました。",
    "gateway": "auth"
}
```

| ケイパビリティ   | 型                                | 説明                                                                  |
| ---------------- | --------------------------------- | --------------------------------------------------------------------- |
| `logging:logger` | `Logger`                          | 完全なLoggerインスタンス                                              |
| `logging:log`    | `(level, message, meta?) => void` | 単純なログ関数; ゲートウェイブートストラッパーが `ctx.log` として使用 |

## 設定

DB ゲートウェイのイベントも共有 Logger を使用しますが、記録するのは要約済みのデータベースメタデータ（`provider`、SQL 文の種類、パラメーター数、エラー名/コード）のみです。生のデータベースメッセージは、データベースコンテナー自身がすでに出力しているため、そのまま転送しません。

| 変数                   | デフォルト          | 説明                                                                 |
| ---------------------- | ------------------- | -------------------------------------------------------------------- |
| `LOG_LEVEL`            | `info`              | `/api/v1/logging/stream` の基準重大度フィルター: `debug`、`info`、`warn`、`error` |
| `LOG_FILE`             | `/app/logs/app.log` | 永続ログファイルへの絶対パス                                         |
| `LOG_FORMAT`           | `pretty`            | コンソール出力形式: 読みやすい `pretty` または生JSONの `json`        |
| `LOG_ROTATE_MAX_BYTES` | `10485760`          | このサイズ（バイト）に達したらアクティブログファイルをローテーション  |
| `LOG_ROTATE_MAX_FILES` | `10`                | 保持するローテーション済みログアーカイブ数（`0` は保持なし）         |
| `LOG_ROTATE_COMPRESS`  | `true`              | `true` の場合、ローテーション済みログを gzip（`.gz`）圧縮             |
