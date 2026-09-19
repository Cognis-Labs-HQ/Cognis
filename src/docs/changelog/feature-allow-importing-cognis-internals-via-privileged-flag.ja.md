# モジュール実行時アクセス

**機能ブランチ:** feature-allow-importing-cognis-internals-via-privileged-flag

## Cognis ランタイムリソースを許可

モジュールの有効化では、公開された Cognis ブラウザリソースの通常のインポート、直接の API URL、共有スタイルクラスを拒否しなくなりました。運用上の有効化チェックは引き続き実行され、セキュリティ上重要なルートとケイパビリティの登録には、引き続きマニフェストの `privileged` フラグが必要です。

## コミット

- [5f898d0ca87f58ca129d2e990ba2ee243becd21b](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f898d0ca87f58ca129d2e990ba2ee243becd21b)
