# 保留したフィードバック項目

- [ ] `src/gateways/calendar/ui/app.js` の自動レビューでは `mountWhenDirect(mount)` を `await mount(document.querySelector('#app'))` に置き換える提案がありました。SPA ルーターがこのページを動的に読み込むため、import 時に直接マウントするとルーター遷移で二重マウントになるため未適用です。
