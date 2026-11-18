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

## Studyナビゲーションの調整

表示幅が狭いときはアクセシブルな名前を維持して言語ラベルを省略します。サブナビゲーションの元のスタイルを維持します。

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
