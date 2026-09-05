# 柔軟な学習ライブラリ

## 関係フレームワークの再設計を定義

固定ライブラリレイヤーを利用側所有のスキーマへ置き換え、汎用関係制約、交換可能な解決・lookup flow、完全な詳細 UI、deep link、ロールバック可能な移行を実現する段階的な実装計画を追加しました。

## 再設計を実装

固定レイヤーを永続化されたバージョン付き利用側スキーマへ置き換えました。型付きフィールド、多重度、順序付きエッジ、スキーマバージョン、可視な関係対象を検証し、Unicode 書記素解決と、出典を持ち解除可能な lookup プロバイダーを追加しました。

## 関係を完全に閲覧

中立なスキーマ、詳細、追跡、解決、lookup API とスキーマ駆動 UI により、任意のレイヤー、フィールド、構成要素、使用元を再読み込み可能な詳細 URL で表示します。

## 互換性のない capability 変更

互換性のないスキーマ capability はアダプター 2.0.0 で導入され、宣言的パック取り込みにより 2.1.0 になりました。利用側はスキーマを登録し、削除された固定カタログ、テンプレート複製、レイヤー固有の import・export メソッドに代えてスキーマ ID と関係 ID を指定する必要があります。

## 宣言的言語パックを追加

言語パックはデータ専用ディレクトリをライブラリ capability に渡し、決定的な検査と原子的な取り込みを行えるようになりました。Cognis は安全なパス、manifest、license、schema、全レコードと関係を検証し、安定した名前空間 ID とバージョン付き導入 receipt を保存します。言語 framework には必要な manifest、schema、レイヤーディレクトリ、レコードファイルと、実行可能 resolver・lookup アダプターとの境界を記載しました。

## コミット

- [2db6fd1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/2db6fd1a147194de35f45b07090d0b5356206933)
- [45c1c7e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/45c1c7e011bfde255e69e0dcf87b01e95600c49a)
- [2b1ff9e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b1ff9e205cab5fb1645370b367efa76f1e9b199)
