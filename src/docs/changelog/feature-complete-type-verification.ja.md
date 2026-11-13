# 完全な型検査

**機能ブランチ:** feature-complete-type-verification

## TypeScript ソース検査

コミット前に `npm run typecheck` を実行してください。`npm run ci:test` はテストの前に型を検査し、両方の CI パイプラインが同じ検査を使用します。`npm run build` は esbuild を使い、Node 24 向けの本番資産を別途生成します。

ルートの `tsconfig.json` が、ファイルを出力しない厳密な検査の基準です。`src` 以下のすべての `.ts`、`.tsx`、`.mts`、`.cts` を対象とし、宣言、テスト、任意のコンポーネント、入れ子のコンポーネントも含めます。除外するのは生成済みの `dist` と依存関係だけです。新しいコンポーネントのために参照一覧を更新する必要はありません。

NodeNext の解決と ES2024・DOM ライブラリでサーバーとブラウザーの契約を扱います。`@cognis/core` はこのチェックアウトのソースを参照します。インポートされた自前の JavaScript は `allowJs` による型推論を提供しますが、`checkJs` は無効のため、JavaScript 全体の検証ではありません。コンポーネント設定はルートの検査範囲を制限しません。

範囲テストはコンパイラーの一覧と空でないソース一覧を比較し、静的なテスト素材に対して実際の npm コマンドを実行します。本番とテストの型エラーを独立して検出し、正常な検査を繰り返してもファイルを生成しないことを確認します。

## コミット

- https://github.com/Cognis-Labs-HQ/Cognis/commit/d0b88d4ee27d0e4b7d7047cd3c32f77694ea3ea2
