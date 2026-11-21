# 技術リファレンス

認証アプリによる確認 の公開インターフェースと運用規則を説明します。

## インターフェース

方式は TFA 契約を実装し、設定で manualSecret と qrSvg を返し、確認コードを検証します。保存した secret、algorithm、digits、period を使います。

## 設定

### 設定

アダプターには管理者向け設定が 1 つあります。

- `algorithm` — セットアップ検証とログイン検証に使う HMAC アルゴリズム。

このメソッドはログインのプレースホルダー、言語リソース、設定ラベルを宣言し、ゲートウェイはプロバイダーIDで分岐せず表示します。

## 動作

### TOTPアダプター

`COGNIS_TOTP_ISSUER` の上書きはこのアダプターが所有します。無効なコードは共通の `invalid_verification_code` を返し、ゲートウェイに方式固有のエラー処理を要求しません。

### 目的

TFAゲートウェイ向けに時間ベースワンタイムパスワード検証を提供します。

### セットアップの流れ

1. アダプターが Base32 シークレットを生成します。
2. セットアップ UI 用に `manualSecret` と `qrSvg` を返します。
3. ユーザーが 6 桁コードでセットアップを確認します。
4. 成功時は `secret`、`algorithm`、`digits`、`period` を保存します。

### 検証ルール

- トークン桁数: `6` 桁。
- 時間ステップ: `30` 秒。
- 許容ずれ: 前後 1 ウィンドウを含む 3 ウィンドウ。
- 既定アルゴリズム: `SHA256`。
- 対応アルゴリズム: `SHA1`、`SHA256`、`SHA512`。

## セキュリティ

有効な六桁の確認後に有効化します。秘密情報を保護し、三十秒の現在の期間と前後一期間のみを許容します。

## リファレンス

- [src/adapters/tfa/totp/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/tfa/totp/manifest.json)
- [src/adapters/tfa/totp/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/tfa/totp/package.json)
- [src/adapters/tfa/totp/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/tfa/totp/index.ts)
