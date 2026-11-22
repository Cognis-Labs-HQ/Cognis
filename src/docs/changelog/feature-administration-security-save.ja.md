# 管理設定の保存

**機能ブランチ:** feature-administration-security-save

## 管理設定の保存

管理画面では未保存の変更がある項目だけを保存します。セキュリティ設定とパスワードポリシーの読み込みが両方とも成功すると、セキュリティ項目を編集できます。フォームを再表示しても変更は保持されますが、変更した項目から移動する場合は従来どおり破棄の確認が必要です。一部の保存に失敗した場合や保存中に新しく編集した場合は、その変更が未保存のまま残り、再試行で保存済みの設定を再送しません。セキュリティのチュートリアルでは引き続きセッションポリシーと信頼するドメインを説明します。

## 翻訳の復旧

接続の復旧時にはページの再描画前にコアとコンポーネントの翻訳キャッシュを無効化します。明示的な更新では最新のサーバー内容を取得し、障害時は完全なオフラインコピーを維持します。不正なXML応答は保存せず、次の読み込みでは強制再読み込みなしで復旧できます。

## 初期選択時のメール認証

`tfa:getLoginMethods(accountId)` は利用可能な方式が1つで未使用の復旧コードがない場合のみチャレンジを準備します。それ以外では、ログイン画面が `challengeOnSelect` を持つ初期選択方式と、既存のチャレンジがない後続の選択に対し `POST /api/v1/tfa/login/resend` でチャレンジを要求します。サーバー側で準備済みのチャレンジは再利用します。配送の失敗は選択言語で表示し、ログには方式、アカウント、準備状態、失敗理由を記録します。コードやメール本文は記録しません。

## 診断出力の一元管理

翻訳、TFA、オフラインワーカーの診断について、サーバーへの送信とブラウザーコンソールへの出力を Logging ゲートウェイで一元管理します。権限と重大度に基づいてブラウザー出力を決定し、メタデータから認証情報や未加工のエラーメッセージを除去します。

## ログ出力の境界

ブラウザースクリプトやイベントハンドラーを含め、アプリケーションと外部モジュールのソースでゲートウェイ経由のログを検査します。診断はゲートウェイを直接利用し、コマンドやビルドのレポートは端末へ出力します。

## コミット

- [996af37783915d3246df5c1fc1044b01c4f46fa1](https://github.com/Cognis-Labs-HQ/Cognis/commit/996af37783915d3246df5c1fc1044b01c4f46fa1)
- [bce901458c323767adc2321ac3b5d1a1146c95c7](https://github.com/Cognis-Labs-HQ/Cognis/commit/bce901458c323767adc2321ac3b5d1a1146c95c7)
- [947677579880703dff73f7acdfd27c9ee3ef02cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/947677579880703dff73f7acdfd27c9ee3ef02cb)
- [18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa)
- [fa239f1b4e9dc5f0ca34c10e6ada95b95014a227](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa239f1b4e9dc5f0ca34c10e6ada95b95014a227)
- [57fe89b2259021a0e015d76a950bd35f64376184](https://github.com/Cognis-Labs-HQ/Cognis/commit/57fe89b2259021a0e015d76a950bd35f64376184)
- [3167a5a53da2ed87485b7b9df244b7edc9bf5089](https://github.com/Cognis-Labs-HQ/Cognis/commit/3167a5a53da2ed87485b7b9df244b7edc9bf5089)
