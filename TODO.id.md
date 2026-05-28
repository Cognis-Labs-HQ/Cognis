# Item Umpan Balik Ditunda

- [ ] Tinjauan otomatis untuk `src/gateways/calendar/ui/app.js` menyarankan mengganti `mountWhenDirect(mount)` dengan `await mount(document.querySelector('#app'))`. Ini tidak diterapkan karena halaman ini dimuat secara dinamis oleh SPA router dan direct mount saat impor akan menyebabkan mount ganda saat navigasi router.
