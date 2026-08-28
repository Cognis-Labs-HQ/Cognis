# 信頼できる会議チャット

**Feature Branch:** feature-fix-meeting-chat-generation-issue

## 再利用会議を再接続

再利用された会議に新しく解決されたチャットルームを保存し、参加者が削除済みのルームを要求して未検出応答を受け取らないようにしました。

## LDAP参加者が招待に参加可能

会議参加者の検索ではフォロー要件を維持し、現在のユーザーを除外します。招待は招待者の認証済みアカウントに配信され、LDAPで提供された参加者は表示ハンドルが変更されても安定したアカウント識別子によって認証されます。

## Commits

- [f4538f6](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4538f6775857d81af67d624d800e27ee8b09548)
