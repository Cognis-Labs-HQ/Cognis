# 学習進捗イベント

**機能ブランチ:** feature-create-study-progress-adapter-with-features

## 不変の進捗追跡

プライバシー範囲付きの冪等な学習イベント、補償訂正、再構築可能な習熟度プロジェクション、多次元集計、段階的な拡張フローを追加します。

## メタデータフィルターの修正

ライブラリのメタデータグループで、排他的な単一選択または複数選択を宣言できるようになりました。ピルを選択すると、グリッド表示のスタイルが以前 `hidden` 状態を上書きしていたカードを含め、一致しないカードが直ちに非表示になります。

## 認証済みテーマ対応音声

ライブラリ音声は未認証のネイティブメディア要求ではなく、認証済み Study ゲートウェイクライアントから読み込まれます。一時メディア URL は使用後に破棄され、ネイティブ操作部はライトまたはダークのアプリケーションテーマに従います。

## ライブラリ UI 構造の準拠

ライブラリブラウザーのエントリーポイントを必須のアダプター構造 `ui/app/index.js` へ移動し、実行時ルートと構造テストを更新しました。ドキュメント検査は生成済みビルド出力を除外し、命名検査は移動後のソースを正しく検査します。ルーターテストも動的ゲートウェイルートと保持されるナビゲーション状態を反映します。

## 繰り返し可能なコンテンツ導入

学習ライブラリのコンテンツパックは、レコード、資産、参照に対してアトミックなデータベース upsert を使用するようになり、重複キーや同時導入によってモジュールの再有効化が中断されなくなりました。

## コミット

- [1d65413](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d65413154f89efbd91422bbfdc94bc8196e9f16)
- [656b59f](https://github.com/Cognis-Labs-HQ/Cognis/commit/656b59feef1ff344ce911a042eecae788a228cc4)
- [e183481](https://github.com/Cognis-Labs-HQ/Cognis/commit/e18348130104134eaa7962aa3020a03a22325e86)
- [ba25e44](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba25e4481d6c71a35ebe2ecc8d0143b85f0125b3)
- [ef782975](https://github.com/Cognis-Labs-HQ/Cognis/commit/ef782975)
- [68bd7478](https://github.com/Cognis-Labs-HQ/Cognis/commit/68bd7478dbf6343109087bd83a9fba643452a838)
- [eeabc5e1](https://github.com/Cognis-Labs-HQ/Cognis/commit/eeabc5e1231e3de246a14ee4ff49582a7169768c)
