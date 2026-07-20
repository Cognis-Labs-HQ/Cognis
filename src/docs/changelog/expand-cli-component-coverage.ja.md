# CLI コンポーネント

## CLI 検出

CLI は、マニフェストで宣言された CLI エントリポイントを含め、モジュール、ゲートウェイ、アダプターからコマンドプラグインを検出し、動的に登録されたコマンドにも標準で整形済み出力を適用します。

## コンポーネント操作

`component:list` は、モジュール、ゲートウェイ、アダプターをコンポーネント種別で表示するようになりました。GitHub インポートコマンドは `component:import` になり、アダプター設定とテスト操作は `component:config:get`、`component:config:set`、`component:test` から利用できます。
