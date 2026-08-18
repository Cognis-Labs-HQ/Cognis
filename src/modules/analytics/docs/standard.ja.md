# Analytics Content

モジュール所有のコンテンツはモジュールパス配下に配置され、有効化されたときのみ読み込まれます。

## 外部配布

Analytics は `Cognis-Labs-HQ/cognis-module-analytics` へ切り出せる自己完結構成です。マニフェストは `requiresCapabilities` に `db:executor` を宣言し、Cognis がこのケイパビリティを提供するまでモジュールを起動してはいけません。ルートマニフェスト、パッケージ、ルート、ライセンス、アセット、CLI、API、UI、マイグレーション、翻訳文書、整合性ハッシュを一緒に配布します。
