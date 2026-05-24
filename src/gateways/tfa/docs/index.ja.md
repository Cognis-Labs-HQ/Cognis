# TFAゲートウェイ

## 目的

二要素認証の方式、ログイン検証、復旧コード、強制設定状態を管理します。

## 主な責務

- `src/adapters/tfa/*` から TFA アダプターを検出して読み込みます。
- メソッドのセットアップ、有効化/無効化、優先順設定 API を提供します。
- 構成済みメソッドでログインチャレンジを検証します。
- 復旧コードを発行し、使用状態を追跡します。
- UI ルーティングがセットアップ必須判定を行える状態を返します。

## 主な API

- `GET /api/v1/tfa/methods`
- `POST /api/v1/tfa/methods/:id/setup/begin`
- `POST /api/v1/tfa/methods/:id/setup/verify`
- `POST /api/v1/tfa/methods/:id/setup/cancel`
- `POST /api/v1/tfa/methods/:id/enable`
- `POST /api/v1/tfa/methods/:id/disable`
- `PUT /api/v1/tfa/methods/preferences`
- `GET /api/v1/tfa/recovery-codes`
- `POST /api/v1/tfa/recovery-codes/rotate`
- `GET /api/v1/tfa/status`
