# 保留したフィードバック項目

## Code Review — Classroom ワークスペース追補

### classroom-meeting-embed.js の CSS クラス名

**Reviewer suggestion:** `src/modules/jitsi-meet/ui/classroom-meeting-embed.js` の `classes-meeting-window` を、よりモジュールに即したクラス名へ変更する。

**Reason ignored:** このクラス名は meeting embed と classes アダプター間の既存スタイリング契約の一部です。安全に変更するには、このタスクの範囲外となる、より大きなクロスモジュール CSS リファクタリングが必要です。

### classroom.js の interactionsBound フラグ

**Reviewer suggestion:** `src/adapters/study/classes/ui/classroom.js` の `interactionsBound` フラグを削除または見直す。

**Reason ignored:** これは false positive です。このフラグはすでに `mount()` スコープ内にあり、ページが新しく mount されるたびに再生成されます。現在の挙動から確認済みの回帰はありません。

### classroom-presence.js の heartbeat タイミング

**Reviewer suggestion:** classroom presence の heartbeat 間隔を `src/gateways/social/bootstrap.ts` の away しきい値に合わせる。

**Reason ignored:** これは既存のクロスコンポーネント挙動に関する大きめの変更であり、workspace/notepad/whiteboard 修正とは直接関係しません。別タスクの追補として扱うべき内容です。

### classroom-render.js の rosterItemClass 検証

**Reviewer suggestion:** `src/adapters/study/classes/ui/classroom-render.js` の `member?.rosterItemClass` をエスケープだけでなくホワイトリスト検証する。

**Reason ignored:** 現在の値はアダプター側の定数から供給されています。この契約強化は、member データを組み立てる側のコードと合わせて行うべきであり、今回の workspace 変更へ混ぜ込むべきではありません。

### gateways/social/bootstrap.ts の claims.sub JSON 構築

**Reviewer suggestion:** `src/gateways/social/bootstrap.ts` の `claims.sub` 用 JSON ペイロードを安全に組み立てる。

**Reason ignored:** これは今回の classroom タスクで変更したファイル範囲外にある、独立した gateway 側の問題です。
