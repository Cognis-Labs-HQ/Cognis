# Generalisasi String i18n dan Pengurangan Bloat Inti

## Ringkasan

Kunci i18n yang spesifik untuk komponen dipindahkan dari file bahasa inti ke direktori `languages/` milik masing-masing komponen. Lapisan i18n diperluas dengan `loadComponentStrings` dan `extendI18n` agar komponen dapat memuat string mereka sendiri tanpa mengotori namespace global. Sekitar 90 kunci yang sudah tidak digunakan dan salah tempat dihapus dari file string inti.

## File dan Komponen yang Diubah

- `src/ui/reuse/i18n.js` — menambahkan `loadComponentStrings`, `extendI18n`, dan opsi `componentStringBaseUrls`
- `src/api/ui-registry.ts` — menambahkan field `stringsBaseUrl` ke interface `AdminSection`
- `src/ui/app/administration/index.js` — memperbarui `loadGatewaySection` untuk menggunakan `extendI18n`
- `src/adapters/notify/internal/ui/languages/*/strings.xml` — string komponen baru (en, de, ja, id)
- `src/gateways/notify/ui/languages/*/strings.xml` — string komponen baru (en, de, ja, id)
- `src/gateways/auth/ui/languages/*/strings.xml` — string komponen baru (en, de, ja, id)
- `src/gateways/registration/ui/languages/*/strings.xml` — string komponen baru (en, de, ja, id)
- `src/gateways/study/ui/languages/*/strings.xml` — string komponen baru (en, de, ja, id)
- `src/gateways/notify/bootstrap.ts` — menambahkan `stringsBaseUrl` pada registrasi seksi admin
- `src/gateways/auth/bootstrap.ts` — menambahkan `registerAdminSection` dengan `stringsBaseUrl`
- `src/gateways/registration/bootstrap.ts` — menambahkan `stringsBaseUrl` pada registrasi seksi admin
- `src/adapters/notify/internal/ui/navbar-plugin.js` — diperbarui menggunakan kunci string komponen
- `src/gateways/notify/ui/admin-section.js` — diperbarui menggunakan kunci string komponen
- `src/gateways/auth/ui/admin-section.js` — diperbarui menggunakan kunci string komponen
- `src/gateways/registration/ui/admin-section.js` — diperbarui menggunakan kunci string komponen
- `src/gateways/study/ui/navbar.js` — diperbarui menggunakan kunci string komponen
- `src/ui/app/profile/index.js` — label statistik diperbarui ke `ui.reuse.profile_preview.*`
- `src/ui/app/settings/index.js` — kunci judul font diperbarui
- `src/ui/app/settings/study-prefs.js` — kunci aplikasi pengajar diperbarui
- `src/ui/app/classes/index.js` — kunci label bahasa diperbarui
- `src/ui/app/users/index.js` — kunci save_failed diperbarui ke `ui.reuse.generic.save_failed`
- `src/ui/languages/*/strings.xml` — ~90 kunci usang/dipindahkan dihapus, `ui.reuse.generic.save_failed` ditambahkan
