# PR Changelog — 教室

## 概要

教室体験を `/classroom` に統合し、従来の `/classes` と `/my-classes`
ページはそこへリダイレクトされるようにしました。

クラス選択を共通の Study フッターへ移動し、言語モジュールの
Classroom サブナビ項目を削除し、統合後の Classroom ページを
教師/生徒ビュー切り替え、教室内チャット/会議アクション、参加可能
クラスの閲覧、ポップアップでのクラス作成に対応させました。

Classes アダプターには参加方式、同一言語クラスの重複防止、アジェンダ
予定、Classroom チャット解決、常に存在する Classroom レコードの対応を
追加し、新しい導線に合わせて翻訳と回帰テストも更新しました。

クラス選択ドロップダウンをページ本体から削除し、page-composer の
footer 要素としてグローバルフッターに「クラス: [ドロップダウン]」の
形式で即時適用で統合しました。クラス一覧および教師表示から
「Teacher:」プレフィックスを削除しました。

教室ビューを 2D 俯瞰コンポジットとして完全に再設計しました。
部屋は壁を表す枠線で囲まれています。前面の壁には、カーシブなチョーク
スタイルのフォントでアクティブなアジェンダを表示するダークグリーンの
黒板とアクションボタンがあります。黒板の左にはスクロール可能な生徒名簿
パネルがあり、右の壁には揺れ弧付きの木製ドアがあります。床は生徒数に
応じて動的に拡張される机と椅子のペア行で埋められます。
Page-composer が `footer` パラメーターに対応しました。

## 変更したコンポーネントとファイル

- Study/classes アダプターのルートとストア:
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/routes/index.ts`
    - `src/adapters/study/classes/routes/route-helpers.ts`
    - `src/adapters/study/classes/routes/available-classes-route.ts`
    - `src/adapters/study/classes/routes/enrolled-classes-route.ts`
    - `src/adapters/study/classes/store/classes.ts`
    - `src/adapters/study/classes/store/memberships.ts`
    - `src/adapters/study/classes/store/schema.ts`
    - `src/adapters/study/classes/store/teacher-requests.ts`
    - `src/adapters/study/classes/store/types.ts`
    - `src/adapters/study/classes/store/rows.ts`
- Classroom UI と共通 Study ナビゲーション:
    - `src/adapters/study/classes/ui/classroom.js`
    - `src/adapters/study/classes/ui/classroom-render.js`
    - `src/adapters/study/classes/ui/study-footer.js`
    - `src/adapters/study/classes/ui/view-mode.js`
    - `src/adapters/study/classes/ui/classes.css`
    - `src/modules/study/languages/reuse/study-sub-navigation.js`
    - `src/modules/study/languages/reuse/classroom-page.js`
    - `src/modules/study/languages/reuse/classroom-page.css`
    - `src/modules/study/languages/reuse/alphabet-page.js`
    - `src/modules/study/languages/reuse/library-page.js`
    - `src/ui/reuse/page-composer/init.js`
- 関連統合、文字列、テスト:
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/store/schema.ts`
    - `src/adapters/social/messages/store/rooms.ts`
    - `src/adapters/social/messages/store/db-messages-store.ts`
    - `src/gateways/study/ui/classes-dashboard-element.js`
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
    - `src/ui/tests/app-router.test.js`
    - `src/ui/tests/study-followups.test.js`
