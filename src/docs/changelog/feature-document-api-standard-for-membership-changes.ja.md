# 一貫したソーシャルメンバーシップ変更

**機能ブランチ:** feature-document-api-standard-for-membership-changes

## シンプルなメンバーシップ API と Capability

チャットルームメンバーとプロフィールフォロワーに、文書化された `POST`／`DELETE` コレクション規約と、信頼されたコンポーネント連携用の対応する `ctx` Capability を導入しました。

## メンバーシップ Capability をモジュールへ公開

Messages アダプターがチャットルームメンバーシップをゲートウェイの Capability ストアだけでなくシステム `ctx` にも公開するようになり、Jitsi Meet などの外部モジュールが有効化時と起動時に解決できるようになりました。

## ミーティング再参加時にチャットメンバーシップを復元

チャットルームメンバーの追加時に、アーカイブされたメンバーシップも復元するようになりました。ミーティング連携は参加者が加わるたびに、チャットを読み込む前に冪等なメンバーシップ `add` 操作を安全に呼び出せます。これにより、以前チャットから退出した参加者に対する `403` 応答の繰り返しを防ぎます。

## レビュー指摘への対応

プロフィールのフォローメンバーシップは、標準の `/follow` エンドポイントのみを使用します。プロフィールのフォロワー Capability はゲートウェイストアとシステム `ctx` の両方で公開され、Social ゲートウェイはマニフェストのバージョンを報告します。

## マニフェスト由来のバージョン

すべてのゲートウェイが実行時の登録バージョンを自身のマニフェストから読み取るようになりました。重複するバージョンリテラルを排除し、Administration のメタデータをコンポーネントのリリースと一致させます。

## コミット

- [c9a478c](https://github.com/Cognis-Labs-HQ/Cognis/commit/c9a478cfe93519e006eeb6098bc4023d9883b01b)
- [614b5c54](https://github.com/Cognis-Labs-HQ/Cognis/commit/614b5c54)
- [4568d5aa](https://github.com/Cognis-Labs-HQ/Cognis/commit/4568d5aa)
- [ef657f36](https://github.com/Cognis-Labs-HQ/Cognis/commit/ef657f36)
