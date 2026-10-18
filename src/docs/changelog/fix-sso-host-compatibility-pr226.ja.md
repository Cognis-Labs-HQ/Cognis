# SSO ホストの互換性

**機能ブランチ:** fix-sso-host-compatibility-pr226

## コールバック用ホストエクスポートの検証

外部 SSO コールバックには、ホストの `page-entry.js` が提供する `mountWhenDirect` と `navigateToDocument` が必要です。ソースでは `npm run check:ui-host`、ビルド済みアセットでは `npm run check:ui-build` を実行します。配備後はホストに到達できるネットワークから `npm run check:ui-host -- --origin https://your-cognis-host.example` を実行します。リモート検証は公開 JavaScript の読み取りだけを行い、認証情報を送信せず、ダウンロードしたコードを実行せずにエクスポートを解析します。プロキシ環境では `NODE_USE_ENV_PROXY=1` で Node の環境プロキシ対応を有効にできます。

コールバックモジュールを更新する前に、UI アセットとアセットマニフェストを含む対応する Core ホストを配備し、旧リリースを使用しているプロセスを再起動します。公開ホストのエクスポート検証に成功してからコールバックページを再読み込みしてください。モジュールのバージョンだけでは配信中のホストアセットを確認できません。公開登録が無効な場合、未知の外部 ID には引き続き登録認可が必要ですが、既に関連付けられた ID はアカウント作成認可を繰り返しません。HTTP 403 だけでは拒否理由を特定できません。認証情報や Cookie を共有せず、応答のエラーコードと登録継続用フィールドを確認してください。

## コミット

- [dd1b1fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/dd1b1fac635d28ef8ee9f223e86eb41fd3e08120)
