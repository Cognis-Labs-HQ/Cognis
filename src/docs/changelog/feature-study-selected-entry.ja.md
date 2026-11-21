# 選択した学習言語を開く

**機能ブランチ:** feature-study-selected-entry

## Explore に直接移動

`/study` を開くと、選択した利用可能な言語の Explore が直接表示されます。Study のナビゲーションと同じ選択規則を使い、意図的に選択した登録済み言語は学習登録がなくても維持します。それ以外は、学習登録した利用可能な言語の先頭を選びます。有効な選択も学習登録もない場合は、オンラインで言語設定に進みます。カタログや Explore の提供元が利用できない場合は既存の利用不可ページを表示します。オフラインのメタデータがない場合は Page Composer の空の Study ページを表示します。

## ナビゲーションとガイド

`study:navigation:enter` フローは `resolve` と `navigate` の段階で構成されます。共通の Study ナビゲーションモデルと提供元のスキーマを使い、解決した言語と履歴置換を指定して `ui:navigate` を呼び出します。コンテンツ、デッキ、Library、その他の Study ページへの直接リンクは維持します。ページの置換、中止、提供元の破棄によって待機中の解決を無効にし、学習登録や提供元の変更時は再解決します。アクセス拒否を隠さず、ルーターによる中止を尊重し、待機中に言語一覧を表示しません。

旧言語一覧専用のチュートリアル対象 `modules` は削除します。外部のガイドは廃止した一覧ではなく、現在のナビゲーションまたは自身のコンテンツを対象にしてください。

## コミット

- [cc25a6568920324c31a1812c02e3790c7d12e791](https://github.com/Cognis-Labs-HQ/Cognis/commit/cc25a6568920324c31a1812c02e3790c7d12e791)
- [2de2715bf0f046d950eed9f294e3dfd6f815f043](https://github.com/Cognis-Labs-HQ/Cognis/commit/2de2715bf0f046d950eed9f294e3dfd6f815f043)
- [bf407ef2b0a68e6bdaa05c3e8ace44f544cb0488](https://github.com/Cognis-Labs-HQ/Cognis/commit/bf407ef2b0a68e6bdaa05c3e8ace44f544cb0488)
- [aea21af67ac61ff988b27fd636091a77a5998c5c](https://github.com/Cognis-Labs-HQ/Cognis/commit/aea21af67ac61ff988b27fd636091a77a5998c5c)
