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

学習ライブラリのコンテンツ ID はパッケージ版が変わっても安定し、各項目は正規コンテンツハッシュを保存します。導入時に、以前の版依存 ID と同一ハッシュの重複を 1 つの正規項目へ統合し、入出力の参照を保持するため、文字表や語彙カードが繰り返し表示されません。

## 明確な音声エラー

ライブラリ音声の読み込みに失敗した場合、ライブラリ全体の失敗を通知せず、そのプレーヤーだけを同じテーマ背景のローカライズ済みメッセージに置き換えます。ダークモードの操作部はアプリのアクセント色と浮き上がった背景色を使用します。

## 方向付き文字バリエーション

文字と代替文字の関係は、左、右、上、下のバリエーション方向を宣言できます。ライブラリは各バリエーションを独立した項目として保持し、親カードのホバーまたはキーボードフォーカス時に周囲へ子操作部を展開します。

## 所有者によるライブラリ削除

コンテンツ所有者、管理者、所有者は、複数のライブラリ項目を選択し、関係とともに完全に削除できるようになりました。通常はモジュールの有効化で不足した提供内容が復元されますが、削除時のチェックボックスを選ぶと対象のコンテンツハッシュがブロックリストに登録され、同一レコードの復元を防止します。

## 操作しやすいバリエーションと選択

方向付きバリエーションは、少し透明な浮遊シャドウ付きの完全なライブラリカード表示になりました。ホバー領域は親とつながっているため、ポインターを移動して開けます。複数選択チェックボックスは、権限のあるカードを長押しするまで非表示で、ダークモードに対応します。また、ライブラリルートで Study サブナビゲーションの完全なスタイルを再び読み込みます。

## 発音の配置

書記単位のカードと詳細タイトルでは文字の発音を文字の横に表示し、単語と文の発音はテキストの下に残します。意味を持つ 1 文字の単語は、モジュール側で 1 文字への語彙関係として宣言でき、文字の詳細には対応する入力側の単語が表示されます。

## 的確なリンクと操作

長押し選択で既存の浮動アクションバーを開き、すべて選択、削除、閉じるを表示します。通常のカードクリックでは選択モードを終了します。チェック印を中央揃えにし、ダークテーマの音声操作部からネイティブのオレンジ色を除去し、関係クリックでは移動先カテゴリを有効化して強調表示します。定義テキスト自体にディープリンクを統合し、構成要素ボックスを宣言済みリゾルバー関係のみに限定して、重複した無関係なカタカナリンクを除去しました。

## コミット

- [1d65413](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d65413154f89efbd91422bbfdc94bc8196e9f16)
- [656b59f](https://github.com/Cognis-Labs-HQ/Cognis/commit/656b59feef1ff344ce911a042eecae788a228cc4)
- [e183481](https://github.com/Cognis-Labs-HQ/Cognis/commit/e18348130104134eaa7962aa3020a03a22325e86)
- [ba25e44](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba25e4481d6c71a35ebe2ecc8d0143b85f0125b3)
- [ef782975](https://github.com/Cognis-Labs-HQ/Cognis/commit/ef782975)
- [68bd7478](https://github.com/Cognis-Labs-HQ/Cognis/commit/68bd7478dbf6343109087bd83a9fba643452a838)
- [eeabc5e1](https://github.com/Cognis-Labs-HQ/Cognis/commit/eeabc5e1231e3de246a14ee4ff49582a7169768c)
- [2cc37134](https://github.com/Cognis-Labs-HQ/Cognis/commit/2cc371343c54afed45e545d523a751cad101be3c)
- [ad01aa56](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad01aa561321b7db5982b0fbfe7f1b28ed11347b)
- [9fe9af00](https://github.com/Cognis-Labs-HQ/Cognis/commit/9fe9af0021f9a093ba432fca9761368e8df0e5f6)
- [51c727ea](https://github.com/Cognis-Labs-HQ/Cognis/commit/51c727eaeb923bd3d4a569ed9e924945f56e286c)
- [17756b2f](https://github.com/Cognis-Labs-HQ/Cognis/commit/17756b2fb83d82f25bf7c349f63170fc738db995)
- [86d3162c](https://github.com/Cognis-Labs-HQ/Cognis/commit/86d3162c19544032fa2ccc6d55f80de58f9495fb)
- [77611b4e](https://github.com/Cognis-Labs-HQ/Cognis/commit/77611b4ed1c6d7afa1221f966cf80ec9b1292316)
- [4ff6b5ec](https://github.com/Cognis-Labs-HQ/Cognis/commit/4ff6b5ec7825a19626c371347c04c43785971216)
- [1190320b](https://github.com/Cognis-Labs-HQ/Cognis/commit/1190320be506d0c74feefa441a4188d05d3892ae)
- [5bb5607e](https://github.com/Cognis-Labs-HQ/Cognis/commit/5bb5607ec3cd60ff7ff2d1329dd66cb4cfc907a8)
- [83297da5](https://github.com/Cognis-Labs-HQ/Cognis/commit/83297da5d62dcbaa8166af88531432b8468d721e)
- [164297bd](https://github.com/Cognis-Labs-HQ/Cognis/commit/164297bda76fa834f5a0e988260c7b2580ef4b87)
