# データベースゲートウェイ

報酬の状態は参加者のリビジョン検査を維持し、基本断片とengagement_participant_partsを使います。コミットではリビジョンの検査と増加、すべての断片の置換を単一のトランザクションで行います。基本行と順序付き断片を単一の結合クエリで読み取り、リビジョンと内容が別のコミットから混在しないようにします。各断片はUTF-8最大60,000バイトです。失敗時はリビジョンと内容を元に戻し、競合する書き込みはengagement_state_conflictになります。テストは無制限の文字列を許容せず、実際のテキスト容量制限を検査します。

## 概要

データベースゲートウェイは、Cognisにおけるすべてのデータベース操作への単一のアクセスポイントです。PostgreSQLとMariaDBの違いを隠す統一されたエグゼキューターインターフェースを提供します。ゲートウェイは環境から `DB_TYPE` を読み取り、適切なエグゼキューターを作成し、スキーマを初期化し、エグゼキューターとダイアレクトヘルパーをケイパビリティストアに提供します。

## 責務

- ブートストラップ時に `DB_TYPE` を読み取り、正しい `DbExecutor` インスタンスを作成する。
- アクティブなアダプターの `sql/` ディレクトリからSQLスクリプトを実行してデータベーススキーマを初期化する。
- `db:executor`、`db:type`、`db:dialect` をケイパビリティストアに提供する。
- `modules` テーブルに `cognis-core` モジュールレコードをシードする。

## アーキテクチャ

### DatabaseGatewayインターフェース

```ts
export interface DatabaseGateway {
    query<Row = Record<string, unknown>>(
        statement: string,
        params?: unknown[],
    ): Promise<QueryResult<Row>>;
    execute(
        statement: string,
        params?: unknown[],
    ): Promise<{ affectedRows: number }>;
    transaction<T>(callback: (db: DatabaseGateway) => Promise<T>): Promise<T>;
}
```

### DbDialectHelper

`db:dialect` として提供される `DbDialectHelper` は2つのメソッドを提供します:

```ts
export interface DbDialectHelper {
    upsert(
        table: string,
        keyCol: string,
        keyVal: unknown,
        extraData: Record<string, unknown>,
    ): Promise<void>;
    insertIgnore(table: string, data: Record<string, unknown>): Promise<void>;
}
```

| パス                           | 目的                                                |
| ------------------------------ | --------------------------------------------------- |
| `src/gateways/db/gateway.ts`   | `DatabaseGateway` インターフェース                  |
| `src/gateways/db/executor.ts`  | `createDbExecutor`                                  |
| `src/gateways/db/init.ts`      | `initializeDatabaseSchema`                          |
| `src/gateways/db/bootstrap.ts` | ブートストラップエントリポイント; `DbDialectHelper` |

## 管理

管理画面では `DB_TYPE` で選択されたアダプターだけが有効として表示されます。各データベースアダプターの状態はアプリ内の切り替えではなく、選択したDocker Composeドライバープロファイルで管理されるためロックされます。データベースゲートウェイの見出しには、この管理元を情報ツールチップで表示します。

## 設定

| 変数           | デフォルト   | 説明                                                    |
| -------------- | ------------ | ------------------------------------------------------- |
| `DB_TYPE`      | `postgresql` | データベースバックエンド: `postgresql` または `mariadb` |
| `DATABASE_URL` | —            | 接続文字列; `postgresql` または `mariadb` の場合に必須  |

## 練習報酬の永続化

Databaseゲートウェイは、参加者の報酬記録、ブースター引き換え、無効化を保存する`engagement:store`を提供します。構造化コマンドでリビジョンを原子的に検証し、並行する処理が他の報酬を黙って上書きすることを防ぎます。コアのエンジンは、データベース実装を直接インポートせずctx経由で保存機能を取得します。

スキーマ初期化は宣言されたテーブルを作成し、不足する列とインデックスを追加します。既存の主キーや一意キーは置き換えません。構造化ストレージ契約には大容量テキストの指定がなく、MariaDB の TEXT は 65,535 バイトに制限され、マルチバイトの複合キーは InnoDB のキー長制限を受けます。Study のデータ量とスキーマ変更は、これらの提供元の制限に照らして確認する必要があります。
