# 端末に合わせた表示

**機能ブランチ:** feature-core-device-layouts

## 画面に合わせた作業領域

狭いカレンダー領域には予定一覧を表示し、メッセージは下書きを保持しながら表示領域に会話を収めます。

## Composer

幅と入力方法に応じた表示、レスポンシブな読み順、内容の更新、閲覧ダイアログを[Page Composer](/docs/page-composer)に集約します。

アカウント用と共有用のカレンダーで、画面サイズ検証用フィクスチャも含め、検証済みの日付・表示操作を共通化します。

## ページとサイドバーの操作

小さな画面ではページ選択画面で移動先を切り替えます。サイドバーは共通の二重山括弧ボタンとキーボードによる終了操作を使います。

## 読みやすいモバイル表示

スマートフォンとタブレットではプロフィール情報と投稿を優先します。Studyカードは高さの限られた画面でも内容と移動操作を利用でき、ヘッダーとフッターの端も揃います。

## コンポーネントの分離

画面サイズ検証用のフィクスチャは各コンポーネントに置き、明示的なアセットルートと外部契約の代替を使います。機能リファレンスは動作を、チュートリアルリファレンスは対象を説明し、詳細へリンクします。

## コンパクトなサイドバー

ドロワーの空白を減らし、長い会話一覧には一つのスクロール領域を使います。デッキはボタンではなくメニュー項目で表示します。

フォーム用スタイルがサイドメニューに適用される問題を修正し、操作部品と入力欄のテーマを維持します。スマートフォン、タブレット、デスクトップで明暗両テーマを検証します。

## Studyナビゲーションの調整

表示幅が狭いときはアクセシブルな名前を維持して言語ラベルを省略します。サブナビゲーションの元のスタイルを維持します。

## Composerのパネル表示

Composerがサイドバーとメイン領域の透明度を統一し、メニュー表示をページごとの変更から保護します。カレンダー・メッセージ・モジュールの余分な背景指定を取り除きます。

表示領域を埋めるページの共通余白を復元し、カレンダーのメニュー項目を囲む不透明なリスト背景を除去します。どちらもComposerで保護します。

カレンダーとメッセージは、操作部や余白とは別に最低閲覧領域を確保して画面に合わせます。Composerでサイドバー見出しを揃え、カレンダーメニュー項目の余白と選択表示を保護します。

内容が増えるStudy Exploreの階層に、Composerの画面調整と最低閲覧領域を適用します。提供元の固定表は配置を維持し、新規項目はComposer経由で再表示します。

デスクトップで非表示のメッセージ操作をガイドのステップ数から除き、サイドメニューの移動でドロワーを閉じ、共有カレンダーの期間見出しを画面幅による再描画後も保ちます。

サイドバーのフィルターと操作の意味を示すクラスを保ち、メニューの外観はComposerが管理します。初回のオフライン表示に備えて公開UIテンプレートを準備し、共有カレンダーの押下状態を選択中の表示に揃えます。

## コミット

- [f4f6d3a84](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4f6d3a84b587d4eb169b5db76b850956544ad31)
- [1ab4a71b2babcede98fe870eac78989dca014b38](https://github.com/Cognis-Labs-HQ/Cognis/commit/1ab4a71b2babcede98fe870eac78989dca014b38)
- [883db306dce10da3bf67b4fac29ca6c89f2ae5b9](https://github.com/Cognis-Labs-HQ/Cognis/commit/883db306dce10da3bf67b4fac29ca6c89f2ae5b9)
- [a0e4d976a436221c63c31eb622a55524de1b6bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0e4d976a436221c63c31eb622a55524de1b6bf0)
- [7127b6fa0650fb93631a2650e8014ceb8daffa6c](https://github.com/Cognis-Labs-HQ/Cognis/commit/7127b6fa0650fb93631a2650e8014ceb8daffa6c)
- [2920069afb9d94aa4a1d4f36cbfa479c33460bdc](https://github.com/Cognis-Labs-HQ/Cognis/commit/2920069afb9d94aa4a1d4f36cbfa479c33460bdc)
- [b5e4e290a216185f9dbc6fddebd34f3779bfca24](https://github.com/Cognis-Labs-HQ/Cognis/commit/b5e4e290a216185f9dbc6fddebd34f3779bfca24)
- [ca32c7cc5577eefa3e0068638013bbb7ec6d3d5e](https://github.com/Cognis-Labs-HQ/Cognis/commit/ca32c7cc5577eefa3e0068638013bbb7ec6d3d5e)
- [bbcf6b7249ac7f3a2d7ce6d1890c5401e6f4e4ca](https://github.com/Cognis-Labs-HQ/Cognis/commit/bbcf6b7249ac7f3a2d7ce6d1890c5401e6f4e4ca)
- [122aff36a39ece336a7690014f0e1430a52ec0b4](https://github.com/Cognis-Labs-HQ/Cognis/commit/122aff36a39ece336a7690014f0e1430a52ec0b4)
- [5d47fdb3b621bcf1a686f675b925af446a988c9e](https://github.com/Cognis-Labs-HQ/Cognis/commit/5d47fdb3b621bcf1a686f675b925af446a988c9e)
- [ed1b78f54d5dd5dfdcffa29c7f6d4864fb7529d9](https://github.com/Cognis-Labs-HQ/Cognis/commit/ed1b78f54d5dd5dfdcffa29c7f6d4864fb7529d9)
- [b43f5f30405bd3392cd89b1f29873ab8f9c56756](https://github.com/Cognis-Labs-HQ/Cognis/commit/b43f5f30405bd3392cd89b1f29873ab8f9c56756)
- [12bf7ba55d5912fa34132a8077af5d70964f6c04](https://github.com/Cognis-Labs-HQ/Cognis/commit/12bf7ba55d5912fa34132a8077af5d70964f6c04)
- [5a0be4f7eeb6ee529b81485b0f3db2efbd629356](https://github.com/Cognis-Labs-HQ/Cognis/commit/5a0be4f7eeb6ee529b81485b0f3db2efbd629356)
- [c17ca37c9e28e0c7ac0aca0d0a95884f1abee0e5](https://github.com/Cognis-Labs-HQ/Cognis/commit/c17ca37c9e28e0c7ac0aca0d0a95884f1abee0e5)
- [5107cce0fcb6f13d4dbc9e9e52d0f50f12fbedc2](https://github.com/Cognis-Labs-HQ/Cognis/commit/5107cce0fcb6f13d4dbc9e9e52d0f50f12fbedc2)
