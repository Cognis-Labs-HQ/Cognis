# 技術リファレンス

ガイド付きチュートリアル の公開インターフェースと運用規則を説明します。

## インターフェース

各機能はブラウザーの ctx から `ui:tutorials` を取得します。ホストが installTutorials で導入し、操作は `ui:tutorial:*` フローを実行します。Page Composer が画面別のガイドを登録します。

## 設定

所有元・ガイド・ステップの固定 ID、翻訳、対象画面、表示対象、highlightNext を宣言します。任意の分岐には targetAvailable と開始操作のシグナルを使い、言語ガイドには登録が必要です。

## 動作

アカウントの完了状態を取得してから自動案内を判定します。再生しても完了は消えず、戻る・再開は同じ例を使います。中止や画面終了で処理を解放し、保存成功後に完了を確定します。

## セキュリティ

表示と条件はロールと現在の権限に従います。完了の読み取り失敗を未完了として扱わず、状態は認証したアカウントごとに保存します。

## リファレンス

- [src/ui/reuse/tutorials/index.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/tutorials/index.js)
- [src/ui/reuse/tutorials/runtime.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/tutorials/runtime.js)
