# MariaDB日時修正

**機能ブランチ:** feature-investigate-mariadb-datetime-errors

## アカウント登録でISO日時を受付

MariaDBは日時エラー内の完全修飾列名を認識し、初期化SQL由来のテーブルへの書き込みを標準的な `DATETIME` 値で再試行するようになりました。これにより、アカウント登録でAPIランタイムが終了する問題を防ぎます。

## 日時エラーを安全に解析

MariaDBの列参照を処理量が限定された文字列操作で抽出するようにし、データベースのエラー文が繰り返されても正規表現の処理量が過剰にならないようにしました。

## コミット

- [5f4972b](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f4972b0a20caebb2e365204dd1c945e05ad0085)
- [5a95fce](https://github.com/Cognis-Labs-HQ/Cognis/commit/5a95fce9c4f66ef6b1f931fb03ec3f54b2e7c22a)
- [2d3d380](https://github.com/Cognis-Labs-HQ/Cognis/commit/2d3d3806)
