# 技術リファレンス

Study は有効な言語の記述情報を検出し、登録された内容をホストの学習画面に表示します。

## インターフェース

Study の起動処理は、有効なモジュールの `study:language:<code>` 機能を検出します。記述情報には `code`、`name`、`flag`、`version`、任意の `moduleId`、`childComponents` を含めます。子項目は `id`、`label` または `labelKey`、`pageUrl`、任意のスクリプトとスタイル、順序、最小ロールを持ちます。

## 設定

外部パッケージの導入と有効化は[モジュール](/docs/modules/external/usage)で行います。学習言語の登録はアカウント設定です。内容のスキーマと取り込みは [Library](/docs/adapters/study/library/technical)、移動と提供者のライフサイクルは [Study](/docs/gateways/study/technical)が担当します。

## 動作

記述情報の同期は利用可能な言語を登録し、提供者の変更に合わせて子ルートを更新します。ホストの Explore を使うために、言語ごとの独自ブラウザーページは必要ありません。レイヤーの移動先には宣言したスラッグを使います。言語データは提供者が所有し、共通の閲覧、お気に入り、練習フローはホストのクライアントが扱います。

## セキュリティ

言語の記述情報は、クラスへの所属や内容へのアクセスを付与しません。可視性、正規参照、保護された変更、練習報酬は各アダプターが検証します。無効化で利用可能性が取り消され、処理中のブラウザー操作はページまたは提供者のシグナルに従います。

## リファレンス

- [src/gateways/study/bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/study/bootstrap.ts)
- [src/gateways/study/gateway.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/study/gateway.ts)
- [src/adapters/study/library/contracts.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/study/library/contracts.ts)
