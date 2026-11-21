# 技術リファレンス

クラス の公開インターフェースと運用規則を説明します。

## インターフェース

`GET /api/v1/study/classes`

`GET /api/v1/study/my-classes`

`GET /api/v1/study/available-classes`

`GET /api/v1/study/preferences`

`PUT /api/v1/study/preferences`

`POST /api/v1/study/teacher-requests`

`GET /api/v1/study/teacher-requests`

`POST /api/v1/study/teacher-requests/:id/approve`

`POST /api/v1/study/teacher-requests/:id/reject`

`POST /api/v1/study/classes/:classId/join`

`DELETE /api/v1/study/classes/:classId/membership`

`GET /api/v1/study/classrooms`

`PATCH /api/v1/study/classrooms/:classId/layout`

`DELETE /api/v1/study/classrooms/:classId/students/:studentId`

`GET /api/v1/study/classes/:classId/members`

`GET /api/v1/study/classes/:classId/join-requests`

`POST /api/v1/study/classes/:classId/invite`

`POST /api/v1/study/classes/:classId/join-requests/:studentId/approve`

`POST /api/v1/study/classes/:classId/join-requests/:studentId/reject`

## 設定

学習言語、教師の資格、参加者、教室の上限は Study とクラスで設定します。独立したデータベース接続の設定はありません。

## 動作

教師は自分のクラスと参加の可否を管理します。学習者は参加可能なクラスを検索して参加を申請し、所属する教室を利用します。状態はデータベースのゲートウェイで保存します。

## セキュリティ

各操作で認証、所有権、クラスへの参加を確認します。教師や参加のポリシーに応じて、管理者の承認が必要です。

## リファレンス

### 技術仕様

| ページ・画面               | ガイド             | アクセス           |
| -------------------------- | ------------------ | ------------------ |
| `/classes` · `#class-list` | クラスの使い方     | ログイン済み利用者 |
| `/my-classes`              | 参加しているクラス | ログイン済み利用者 |

公開機能 `ui:tutorials` を通じて、コンポーネント所有の定義、カタログ、対象、ライフサイクルのシグナルを登録します。ページ、表示中の領域、アクセス権により利用可否が決まります。コンポーネントを解除するとガイドも解除します。共通の表示と完了動作は[ホストのチュートリアル契約](/docs/tutorials)を参照してください。
