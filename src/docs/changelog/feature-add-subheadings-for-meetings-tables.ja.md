# 管理画面のミーティング表見出し

**Feature Branch:** feature-add-subheadings-for-meetings-tables

## アクティブと今後のミーティングを明確に区分

Administration → Meetings ビューでは、アクティブな Jitsi Meet と今後の Jitsi Meet の各表の上に明示的な小見出しを追加し、管理者が進行中のミーティング状況と予定されたミーティングをひと目で区別できるようにしました。

## 今後のミーティング詳細を均等に表示

今後のミーティング行は ID 列をコンパクトに保ちながら残りの詳細列を均等にし、「作成者」欄に作成者の表示名と作成日時を表示し、最後の列を予定日時として、ミーティングの予定開始日時を示すようにしました。

## ミーティング URL 列の表示

ミーティング列はミーティング URL というラベルになり実際の URL を表示します。ID 列は必要な幅だけを使うようコンパクトに保ちます。

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/944f645f21aac7c511cd60646c76923a382f7e8a
