# 技術リファレンス

ブラウザーホストは、ルーティング、共通表示、言語処理、公開アセットの復旧を管理します。

## インターフェース

`uiCtx.capabilities` は有効なブラウザー提供者を取得し、`bindCapability(id)` は登録まで起動時の呼び出しを上限付きで保留します。`ui:log` は診断を [Logging](/docs/gateways/logging/technical) に送ります。ページには AbortSignal を渡し、終了時に登録を解除します。[Page Composer](/docs/page-composer/technical)、[チュートリアル](/docs/tutorials/technical)、[コンポーネントウィンドウ](/docs/focus-control/technical)が公開 UI 契約を定義します。

## 設定

言語、テーマ、フォントはアカウント設定から取得します。共通ラベルは平坦な `ui.reuse.*`、各カタログは所有者の名前空間を使用します。言語は選択言語、英語の順で解決し、英語キーも欠ける場合はエラーにします。表示にはテーマトークンを使います。設定の保存は [Profile](/docs/adapters/social/profile/technical) が担当します。

## 動作

SPA ルーターは宣言済みのページを読み、置き換えられたマウントを取り消します。直接 URL も同じ入口を使います。シェルのアセットは各ゲートウェイやアダプターのページから分離されています。

サービスワーカーは公開アセットを保存し、私的 API 応答や認証済み文書は保存しません。変更可能なリソースはキャッシュを返しながら、要求に応じて最大毎分1回ネットワークを更新できます。内容ハッシュ付きアセットは不変のデータを再利用します。ワーカー更新は制御中の既存タブが閉じるまで待機します。接続復旧では保護された再読み込みを提供します。

私的なオフライン記録と変更キューはアカウント、セッション、所有者に属します。公開コードのキャッシュはデータの権限を付与しません。バナー、読み込み表示、ポップアップはホストのライフサイクルに従い、提供者の失敗はゲートウェイ経由で記録します。

## セキュリティ

読み取りと変更の前に所有者が権限を検証します。移動先の非表示は表示上の規則です。公開キャッシュ API にアカウントのデータ、認証情報、認証済み HTML を渡してはいけません。リッチテキストには適切なレンダラーを使います。

## リファレンス

- [src/ui/reuse/ui-ctx.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/ui-ctx.js)
- [src/ui/reuse/app-router.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/app-router.js)
- [src/ui/reuse/i18n.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/i18n.js)
- [src/ui/public/sw.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/public/sw.js)
