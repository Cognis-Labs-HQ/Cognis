# Jitsi 共有承認

**機能ブランチ:** feature-expose-capability-for-jitsi-meet-module

## Jitsi Meet が共有承認を利用可能

Share ゲートウェイは、承認リクエストのオーケストレーションを `share:requestApproval` Capability として公開し、Jitsi Meet の参加者追加承認で呼び出し元が渡すリクエスト者の表示名を受け取るようになりました。これによりモジュールを有効化し、既存の承認フローを利用できます。

## 承認ダイアログで文脈を指定可能

Capability の呼び出し元は、名前付きミーティングへの参加者追加など、承認する操作と対象を指定できます。省略した場合は、従来どおり共有リンク作成を操作、リソース種別を対象として使用します。

## 実装コミット

- https://github.com/Cognis-Labs-HQ/Cognis/commit/b7c97f73
- https://github.com/Cognis-Labs-HQ/Cognis/commit/48c243e6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/5e28efff
