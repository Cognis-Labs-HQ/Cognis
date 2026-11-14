# ピクチャーインピクチャーへの移行中も会議を維持

**機能ブランチ:** feature-honor-new-flag-in-pip-payload

## 閲覧コンテキスト維持要求への対応

フローティングウィンドウがプロバイダーの `preserveBrowsingContext` オプションに対応しました。ブラウザーが状態維持 DOM API でコンポーネントを移動できない場合、Cognis は既存の親要素内にコンポーネントを維持してそこで最上位レイヤーを使用し、稼働中の iframe の再配置による会議の再接続を防ぎます。

## コミット

- [bae46cbe](https://github.com/Cognis-Labs-HQ/Cognis/commit/bae46cbe55f7352a4fe023e859a2b0502c2fa9db)
