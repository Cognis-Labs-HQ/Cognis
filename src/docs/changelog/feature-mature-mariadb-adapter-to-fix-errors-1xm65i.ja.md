# 安定したMariaDB起動

**機能ブランチ:** feature-mature-mariadb-adapter-to-fix-errors-1xm65i

## MariaDBの準備完了を待機

Cognisは、データベース初期化中にマイグレーションを失敗させるのではなく、制限された起動時間内で一時的なMariaDB接続障害を再試行するようになりました。デプロイはMariaDBコンテナの最新安定版を追跡し、ヘルスチェックではMariaDBの初期化時間を長く確保します。新しいコンテナでは常にランダムなrootパスワードを生成し、データベースのシステムテーブルを自動更新します。ユーザーが指定したrootパスワードはデプロイで受け付けません。 MariaDBは外部キー列にインデックス可能な文字列型を生成するようになり、MariaDBとPostgreSQLのスキーマ修復は制約を維持して修復失敗を報告します。 内部通知スキーマは移植性のある識別子 `is_read` を使用し、MariaDBが既読状態の列をSQL構文として解釈しないようになりました。 MariaDBでは明示的にインデックス指定されたすべてのテキスト列をインデックス可能な文字列として扱い、インデックス作成前に既存の `TEXT` 列を修復することで、キー長超過による起動失敗を防ぎます。 MariaDBはスキーマで宣言されたタイムスタンプ列だけISO 8601値を変換し、テキストデータを変更せずに登録時の無効な `DATETIME` 値を防ぎます。 生SQLで作成されたスキーマにも同じ保護を適用し、日時値で拒否されたコマンドを正規化したMariaDB日時値で一度再試行します。 MariaDB、PostgreSQL、SQLite向けの独立した生SQL認証スキーマExecutorを削除しました。アーキテクチャ検査により、本番コードはDBゲートウェイのラッパーを使用し、生SQL文の実行をDBゲートウェイと所有Executorのエントリーポイント内に限定します。

## コミット

- [34bbe100](https://github.com/Cognis-Labs-HQ/Cognis/commit/34bbe10095d802269dd2beb66b3d30853b459063)
- [43d363ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/43d363ae93b555b6d4bbbc06177aa4c5474f9287)
- [09c787ee](https://github.com/Cognis-Labs-HQ/Cognis/commit/09c787eebba30e4c38fda39b3f0bc60a76028f77)
- [fed2f599](https://github.com/Cognis-Labs-HQ/Cognis/commit/fed2f599a47a100cb3367a25fa637fa720679d76)
- [15ed1e6e](https://github.com/Cognis-Labs-HQ/Cognis/commit/15ed1e6e57bf03459e5b905598c9d8bab227fe2e)
- [3eb5682a](https://github.com/Cognis-Labs-HQ/Cognis/commit/3eb5682a932b611ef3f65357c3d5523037ee7756)
- [31881fb2](https://github.com/Cognis-Labs-HQ/Cognis/commit/31881fb29340bac55ddc78eb149caeec13fa22ae)
