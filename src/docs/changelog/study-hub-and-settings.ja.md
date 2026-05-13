# 学習ハブページと設定セクションの削除

## 概要

ユーザー設定の「学習」セクションを、専用の `/study` ページに置き換えました。ナビゲーションバーの「学習」ボタンは、ポップアップを開かずに直接 `/study` へ遷移するようになりました。新しいページは、学習言語が未設定の場合にアニメーション付きのウェルカム画面を表示し、言語が選択済みの場合は各言語の登録モジュールへのリンクを含む学習ハブを表示します。

## 変更されたファイル / コンポーネント

- `src/gateways/study/bootstrap.ts` — 設定セクション登録を削除；`/study` ページルートを追加；バージョンを 1.3.0 に更新
- `src/gateways/study/manifest.json` — バージョンを 1.3.0 に更新
- `src/gateways/study/ui/study-prefs.js` — 削除（設定セクション削除後は参照されなくなったため）
- `src/gateways/study/ui/navbar.js` — 通常のナビリンクに簡略化；ポップアップハンドラーを削除
- `src/gateways/study/ui/study.html` — `/study` ページ用の新しい HTML シェル
- `src/gateways/study/ui/study.js` — `createPageComposer` を使用した新しい学習ハブページモジュール
- `src/gateways/study/ui/study.css` — 学習ハブとウェルカム画面用の新しい CSS
- `src/ui/reuse/app-router.js` — `/study` ルートを追加
- `src/ui/layouts/dashboard-layout.js` — 学習ショートカットを `/study` に更新
- `src/ui/styles/settings.css` — 不要な学習用 CSS クラスを削除
- `src/ui/languages/*/strings.xml` — `ui.app.settings.study.*` キーを `ui.app.study.*` に置き換え；`ui.page.title.study` を追加（4 言語すべて）
- `src/docs/versions.en.md` — Study Gateway バージョンを 1.3.0 に更新

## コミット

- https://github.com/le-firehawk/Cognis/commit/1170b58
