# Jitsi 共有承認

## Jitsi Meet が共有承認を利用可能

Share ゲートウェイは、承認リクエストのオーケストレーションを `share:requestApproval` Capability として公開し、Jitsi Meet の参加者追加承認で呼び出し元が渡すリクエスト者の表示名を受け取るようになりました。これによりモジュールを有効化し、既存の承認フローを利用できます。

**機能ブランチ:** work

## 実装コミット

- https://github.com/Cognis-Labs-HQ/Cognis/commit/c8f62831
- https://github.com/Cognis-Labs-HQ/Cognis/commit/4fc46aaf
