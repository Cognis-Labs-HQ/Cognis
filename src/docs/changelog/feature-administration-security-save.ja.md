# 管理設定の保存

**機能ブランチ:** feature-administration-security-save

## 管理設定の保存

管理画面では未保存の変更がある項目だけを保存します。セキュリティ設定とパスワードポリシーの読み込みが両方とも成功すると、セキュリティ項目を編集できます。フォームを再表示しても変更は保持されますが、変更した項目から移動する場合は従来どおり破棄の確認が必要です。一部の保存に失敗した場合や保存中に新しく編集した場合は、その変更が未保存のまま残り、再試行で保存済みの設定を再送しません。セキュリティのチュートリアルでは引き続きセッションポリシーと信頼するドメインを説明します。

## 翻訳の復旧

接続復旧時はページの再描画前に読み込み済みの翻訳を更新します。通常の読み込みはオフラインキャッシュを即座に利用し、不正なXMLは拒否して更新付きで再試行します。 非公開翻訳はドキュメントやライフサイクルのリセット後も更新し、保存済みの古いXMLが新しいリビジョンとして保持されることを防ぎます。

## 初期選択時のメール認証

初期選択方式が配送を必要とする場合にメールのチャレンジを要求します。初回送信と再送には15秒の期限があり、認証アプリや復旧コードの検証を妨げません。待機中の要求は重複させず、新しいログイン画面を開くと中止します。

## 診断出力の一元管理

ログ機能はゲートウェイの権限と重要度に基づき、サーバー送信とブラウザー表示を制御します。サーバーとブラウザーはレベル、優先順位、コンソール別名の共通カタログを利用します。メタデータに資格情報や生のエラーメッセージを含めません。 ログ機能はゲートウェイがctxを通じて提供し、コアは汎用の機能準備処理と上限付きの遅延呼び出しのみを提供します。

## ログ出力の境界

ソース検査はアプリと外部モジュールのブラウザースクリプトやイベント処理にもゲートウェイ経由のログ出力を適用します。スクリプト抽出はブラウザーが受理する終了タグの空白や属性、引用符内の区切り、終了タグのないスクリプトを扱います。コマンドとビルドの報告は端末出力を維持します。

## コミット

- [996af37783915d3246df5c1fc1044b01c4f46fa1](https://github.com/Cognis-Labs-HQ/Cognis/commit/996af37783915d3246df5c1fc1044b01c4f46fa1)
- [bce901458c323767adc2321ac3b5d1a1146c95c7](https://github.com/Cognis-Labs-HQ/Cognis/commit/bce901458c323767adc2321ac3b5d1a1146c95c7)
- [947677579880703dff73f7acdfd27c9ee3ef02cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/947677579880703dff73f7acdfd27c9ee3ef02cb)
- [18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa)
- [fa239f1b4e9dc5f0ca34c10e6ada95b95014a227](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa239f1b4e9dc5f0ca34c10e6ada95b95014a227)
- [57fe89b2259021a0e015d76a950bd35f64376184](https://github.com/Cognis-Labs-HQ/Cognis/commit/57fe89b2259021a0e015d76a950bd35f64376184)
- [3167a5a53da2ed87485b7b9df244b7edc9bf5089](https://github.com/Cognis-Labs-HQ/Cognis/commit/3167a5a53da2ed87485b7b9df244b7edc9bf5089)
- [753f9e4893d00853626fd21392e7ce21f560353e](https://github.com/Cognis-Labs-HQ/Cognis/commit/753f9e4893d00853626fd21392e7ce21f560353e)
- [7b407892012761c643cbc3f9350e7464b949650a](https://github.com/Cognis-Labs-HQ/Cognis/commit/7b407892012761c643cbc3f9350e7464b949650a)
