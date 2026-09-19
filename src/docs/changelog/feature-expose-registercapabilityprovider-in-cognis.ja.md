# モジュール UI プロバイダー

**機能ブランチ:** feature-expose-registercapabilityprovider-in-cognis

## 外部モジュールがブラウザープロバイダーを公開可能

外部モジュールのブートストラップコンテキストで `registerCapabilityProvider` が利用可能になり、モジュール所有のブラウザーゲートウェイを UI プロバイダーカタログに登録できるようになりました。プロバイダー登録はモジュールのライフサイクルに関連付けられ、モジュールの無効化、再読み込み、またはブートストラップ失敗時に削除されます。

## コミット

- [1213125](https://github.com/Cognis-Labs-HQ/Cognis/commit/121312516048ee5d51bfa6f378cd363264d668bb)
