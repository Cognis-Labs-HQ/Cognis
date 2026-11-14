# ブランドアイコンの軽量化

**機能ブランチ:** perf-small-brand-icons

## 表示箇所ごとの解像度

ページのファビコン、ダッシュボードのウィジェット、認証画面、エラー画面、ショートカットには384pxの画像を使用し、ページのヘッダーには、余白のない元画像から直接縮小・拡大した高さ512pxの専用画像を使用します。元の縦横比とアルファを保持し、インストール用アイコンの余白は追加しません。既存のヘッダーのCSS寸法は変更しません。通常版とマスク可能版の384px画像は、それぞれの512px画像からLanczos方式で決定的に縮小し、構図、縦横比、アルファを保持します。元画像とプラットフォーム用のインストールアイコン（192px/512pxおよびApple Touch用180px）は引き続き利用できます。

## 起動時の画像転送

Service Workerは大きな元画像を取得せず、通常版の192px、384px、512pxアイコンを事前にキャッシュします。キャッシュのバージョン更新により、既存クライアントのアセット一覧も更新されます。ルートとインストールのテストでは、永続トークンを作成せずに認証契約を注入し、画像寸法と画質を優先して拡大した転送量の上限を検証します。 専用ヘッダー画像も事前にキャッシュします。

## コミット

- [eaa76ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/eaa76ae32f517fd4b2a52fd1c064aa19720dc9ac)
- [b1fd6cd](https://github.com/Cognis-Labs-HQ/Cognis/commit/b1fd6cd8f41b6b03855eef1f87a21e98989e46b8)
- [0d6fbe8](https://github.com/Cognis-Labs-HQ/Cognis/commit/0d6fbe8efa1621057a43e721b949beca339cdf82)
- [46d4b23](https://github.com/Cognis-Labs-HQ/Cognis/commit/46d4b23d3f2c77a30f35317bbad9dbe609ef0363)
