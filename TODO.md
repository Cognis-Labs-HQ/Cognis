# Deferred Feedback Items

- [ ] `src/gateways/calendar/ui/app.js` automated review suggested replacing `mountWhenDirect(mount)` with `await mount(document.querySelector('#app'))`. Not applied because this page is dynamically loaded by the SPA router and direct mounting on import would double-mount during router navigation.
