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

### ルートと権限

アダプターは Study ゲートウェイと ctx を介してルートと永続化処理を登録します。教師向けルートには教師の役割が必要で、教師申請の承認・却下には管理者権限が必要です。参加情報や教室の変更では、アカウントとクラスの権限確認を引き続き適用します。

### アカウント削除の確認結果

`deprovision-user` → `cleanup-dependencies` では、`system:contracts` を介して `auth:deprovisionOutcome` バージョン 1 を取得し、その実行で使われた元のオブジェクトを `deletedAccount(input, stageResults)` に渡します。削除の確定を示す Auth 所有の確認結果がある場合に限り、対象アカウントの参加情報、教師の割り当て、教室関連データを削除します。コピーした結果、無効化・アーカイブの結果、欠落した確認結果、利用できない確認結果では、この後処理は許可されません。

同梱の Auth 2.2.12、またはこのバージョン付き契約を実装する代替プロバイダーと組み合わせて導入します。変更可能な公開フロー結果で代用することはできません。削除後に再認可するのではなく、確定済みの削除結果に基づいて後処理を行います。開始済みの外部変更は、後続処理が失敗する前に一部が完了する場合があり、コンポーネントをまたぐロールバックは保証されません。通常の画面操作とチュートリアルは変わりません。

この変更で保護されるのは同梱の後処理コンポーネントです。導入環境でアカウント削除を有効にする前に、変更可能な公開フロー結果を依然として信頼する外部の後処理フックを更新するか、無効にしてください。

## セキュリティ

各操作で認証、所有権、クラスへの参加を確認します。教師や参加のポリシーに応じて、管理者の承認が必要です。

## リファレンス

### 技術仕様

| ページ・画面               | ガイド             | アクセス           |
| -------------------------- | ------------------ | ------------------ |
| `/classes` · `#class-list` | クラスの使い方     | ログイン済み利用者 |
| `/my-classes`              | 参加しているクラス | ログイン済み利用者 |

公開機能 `ui:tutorials` を通じて、コンポーネント所有の定義、カタログ、対象、ライフサイクルのシグナルを登録します。ページ、表示中の領域、アクセス権により利用可否が決まります。コンポーネントを解除するとガイドも解除します。共通の表示と完了動作は[ホストのチュートリアル契約](/docs/tutorials)を参照してください。
