# 技術リファレンス

メールによる認証 の公開インターフェースと運用規則を説明します。

## インターフェース

二段階方式の設定と検証を提供し、notify:registerEmailPurpose で目的を登録します。送信には notify:sendEmail と notify:emailDeliveryPolicy を使います。

## 設定

### 設定

コード長はメール配送プロバイダーで設定し、このメソッドは現在のポリシーを参照します。

## 動作

### 概要

このアダプターはブートストラップ中に`notify:registerEmailPurpose`でコード通知アクションを登録し、`notify:sendEmail`で送信します。登録、コード通知内容、送信アダプターとの同期をこのアダプターが所有します。TFAゲートウェイは共通のライフサイクル用フックだけを提供します。ゲートウェイの無効化で所有するSMTPキューを中止し、再有効化で登録を復元します。

### 前提条件

- Notificationゲートウェイで検証メール送信が利用可能であること。
- Notificationゲートウェイ管理画面でSMTP送信者が設定・有効化されていること。
- ユーザーアカウントに検証済みのプライマリメールが設定されていること。

### 実行時の挙動

- チャレンジコードはプロセスメモリに保存されます。アプリを再起動すると、保留中のセットアップ/ログインコードは無効になります。
- 複数インスタンス構成では、チャレンジ有効期間中のリクエストが同じインスタンスに固定される場合にのみ、このアダプターを利用してください。

### 配送ポリシー

コード長と再送間隔は `notify:emailDeliveryPolicy` から取得します。このアダプターに独立したコード長設定はありません。共通の確認ヘルパーが暗号学的に安全な乱数で数字を生成し、このメソッドが表示情報と言語リソースを宣言します。

## セキュリティ

確認済みの主メールと配信機能が必要です。コードはプロセス内のみで再起動時に無効になります。コードや秘密情報をオフラインキューに入れてはいけません。

## リファレンス

- [src/adapters/tfa/smtp/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/tfa/smtp/manifest.json)
- [src/adapters/tfa/smtp/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/tfa/smtp/package.json)
- [src/adapters/tfa/smtp/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/tfa/smtp/index.ts)
