# 技術リファレンス

アプリケーションログ の公開インターフェースと運用規則を説明します。

## インターフェース

### アーキテクチャ

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

デフォルトでは、Logger はコンソール出力を書き出し、永続ログファイルには引き続き JSON 行を保存します。`LOG_LEVEL` は stdout/stderr をフィルターし、`LOG_FILE_LEVEL` は永続ファイルへの書き込みを個別にフィルターします。管理者は実行時に各アダプター設定を上書きし、環境値へリセットできます。上書きはデータベースに保存され、ゲートウェイ起動時に復元されるため、コンテナを再起動しても維持されます。

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

### 設定

DB ゲートウェイのイベントも共有 Logger を使用しますが、記録するのは要約済みのデータベースメタデータ（`provider`、SQL 文の種類、パラメーター数、エラー名/コード）のみです。生のデータベースメッセージは、データベースコンテナー自身がすでに出力しているため、そのまま転送しません。

| 変数                   | デフォルト          | 説明                                                                         |
| ---------------------- | ------------------- | ---------------------------------------------------------------------------- |
| `LOG_LEVEL`            | `info`              | ランタイムログストリームの詳細度フィルター: `debug`、`info`、`warn`、`error` |
| `LOG_FILE_LEVEL`       | `debug`             | 永続ファイルの詳細度フィルター: `debug`、`info`、`warn`、`error`             |
| `LOG_FILE`             | `/app/logs/app.log` | 永続ログファイルへの絶対パス                                                 |
| `LOG_FORMAT`           | `pretty`            | コンソール出力形式: 読みやすい `pretty` または生JSONの `json`                |
| `LOG_ROTATE_MAX_BYTES` | `10485760`          | このサイズ（バイト）に達したらアクティブログファイルをローテーション         |
| `LOG_ROTATE_MAX_FILES` | `10`                | 保持するローテーション済みログアーカイブ数（`0` は保持なし）                 |
| `LOG_ROTATE_COMPRESS`  | `true`              | `true` の場合、ローテーション済みログを gzip（`.gz`）圧縮                    |

## 動作

### 概要

ロギングゲートウェイは、stdout/stderrへの構造化アプリケーションログ記録と、オプションで永続的なログファイルへの記録を提供します。環境変数から `Logger` インスタンスを作成してケイパビリティストアに提供することで、ログが必要なすべてのコンポーネントがロガーライブラリを直接インポートせずに統一インターフェースを使用できます。

ロギングゲートウェイはファイルストレージゲートウェイの後にブートストラップされる必要があります。この依存関係は `manifest.json` の `requires: ["files"]` で宣言されています。

### 責務

- `LOG_LEVEL`、`LOG_FILE`、`LOG_FORMAT`、ログローテーション変数から設定された `Logger` インスタンスを作成する。
- `logging:logger` と `logging:log` をケイパビリティストアに提供する。
- 利用可能な場合は `file:append` を通じてログファイル書き込みをルーティングする。
- Administration → ログ画面向けに `GET /api/v1/logging/stream` を提供する（管理者専用 SSE ストリーム、重大度/キーワードフィルター対応）。

### ブラウザーログの取り込み

認証済みブラウザーコンポーネントは、`POST /api/v1/logging/entries` へ `{ level, message, meta }` 形式の構造化エントリを送信します。ゲートウェイはレベルとメッセージを検証し、認証済みアカウントとブラウザー由来情報を付加して、`logging:log` を通じて書き込みます。

### アダプターフィールドの翻訳

Logging アダプターの定義は `labelKey` を使用します。ゲートウェイはカタログと設定のスキーマを、ブラウザー用の翻訳キー `label` としてシリアル化し、各アダプターの `stringsBaseUrl` を提供します。型、選択肢、値の意味はプロバイダーが所有します。設定の読み取りは引き続き管理者に限定されます。

## セキュリティ

閲覧と設定には管理権限が必要です。ログを機密情報として扱い、認証情報、トークン、私的なメッセージ本文を診断に出力しないでください。

## リファレンス

### 技術仕様

| ページ・画面                | ガイド     | アクセス |
| --------------------------- | ---------- | -------- |
| `/administration` · `#logs` | ログの確認 | 管理者   |

公開機能 `ui:tutorials` を通じて、コンポーネント所有の定義、カタログ、対象、ライフサイクルのシグナルを登録します。ページ、表示中の領域、アクセス権により利用可否が決まります。コンポーネントを解除するとガイドも解除します。共通の表示と完了動作は[ホストのチュートリアル契約](/docs/tutorials)を参照してください。
