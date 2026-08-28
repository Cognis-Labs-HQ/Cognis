# Orbitronフォントの復元

**機能ブランチ:** copilot/restore-orbitron-font-option

## Orbitronフォントが正しく表示されるようになりました

Orbitronフォントはフォントピッカーには表示されていましたが、ブラウザに読み込まれていなかったため実際にはレンダリングされていませんでした。ベーススタイルシートにGoogle Fontsのインポートを追加したことで、Orbitron（およびAudiowide、Rajdhani、Exo 2、Interなどのアプリケーションフォント）が正しく読み込まれ、設定で選択できるようになりました。また、Google FontsのスタイルシートおよびGoogleのフォントCDNからのフォントファイルの読み込みを許可するよう、コンテンツセキュリティポリシーも更新されました。

## コミット

- [f5e3113](https://github.com/Cognis-Labs-HQ/Cognis/commit/f5e3113eb90b58fc10f5ea1d5355b10358d6051e)
