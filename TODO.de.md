# Zurückgestellte Feedback-Punkte

- [ ] Die automatische Prüfung für `src/gateways/calendar/ui/app.js` schlug vor, `mountWhenDirect(mount)` durch `await mount(document.querySelector('#app'))` zu ersetzen. Das wurde nicht umgesetzt, weil diese Seite dynamisch vom SPA-Router geladen wird und ein direkter Mount beim Import bei Router-Navigationen zu einem doppelten Mount führen würde.
