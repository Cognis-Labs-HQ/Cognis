# 一貫したソーシャルメンバーシップ変更

**機能ブランチ:** feature-document-api-standard-for-membership-changes

## シンプルなメンバーシップ API と Capability

チャットルームメンバーとプロフィールフォロワーに、文書化された `POST`／`DELETE` コレクション規約と、信頼されたコンポーネント連携用の対応する `ctx` Capability を導入しました。

## メンバーシップ Capability をモジュールへ公開

Messages アダプターがチャットルームメンバーシップをゲートウェイの Capability ストアだけでなくシステム `ctx` にも公開するようになり、Jitsi Meet などの外部モジュールが有効化時と起動時に解決できるようになりました。

## コミット

- [a8b044c](https://github.com/Cognis-Labs-HQ/Cognis/commit/a8b044c024072a91dc63741698588d762418d0b3)
