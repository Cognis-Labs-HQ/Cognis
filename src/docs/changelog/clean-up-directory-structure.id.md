# Catatan Perubahan PR — Rapikan Struktur Direktori

## Ringkasan

Adapter Study Jepang lama di `src/adapters/study/japanese/` dihapus untuk
mengurangi struktur ganda dan membingungkan, karena konten belajar bahasa
Jepang sekarang disediakan oleh modul bahasa.

Gateway Study diperbarui agar tidak lagi memakai pengecualian legacy yang
di-hardcode saat discovery/bootstrap adapter.

Pada halaman profil, teks hint inline untuk visibilitas postingan diganti
dengan info tooltip.

File HTML, modul JavaScript, dan stylesheet CSS yang spesifik untuk
gateway/adapter dipindahkan dari `src/ui/` ke direktori adapter dan gateway
masing-masing, mengikuti prinsip kemandirian komponen. Adapter profil, pesan,
dan kelas kini masing-masing menyajikan `index.html`, `app.js`, dan CSS dari
subdirektori `ui/`. Modul preferensi notifikasi dan studi dipindahkan ke
direktori `ui/` gateway masing-masing dengan tambahan ekspor
`createSettingsSection`.

Sistem plugin `SettingsSection` ditambahkan ke `UIRegistry` agar gateway dapat
mendaftarkan bagian halaman pengaturan secara dinamis. Endpoint baru
`GET /api/v1/ui/settings-sections` mengekspos bagian yang terdaftar ke klien.
Halaman pengaturan kini memuat bagian yang dikontribusikan secara dinamis,
menghapus impor yang di-hardcode untuk notifikasi dan preferensi studi.

## Berkas/Komponen yang Diubah

- Gateway Study:
    - `src/gateways/study/gateway.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/gateways/study/manifest.json`
- Adapter legacy yang dihapus:
    - `src/adapters/study/japanese/` (dihapus)
- Adapter profil:
    - `src/adapters/social/profile/index.ts`
    - `src/adapters/social/profile/ui/app.js`
    - `src/adapters/social/profile/ui/index.html`
    - `src/adapters/social/profile/ui/profile.css`
- Adapter pesan:
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/ui/app.js`
    - `src/adapters/social/messages/ui/index.html`
    - `src/adapters/social/messages/ui/messages.css`
- Adapter kelas:
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/ui/app.js`
    - `src/adapters/study/classes/ui/index.html`
    - `src/adapters/study/classes/ui/classes.css`
- Gateway Notify:
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/ui/notification-prefs.js`
- Gateway Study:
    - `src/gateways/study/ui/study-prefs.js`
- Infrastruktur UI:
    - `src/api/ui-registry.ts`
    - `src/api/routes/ui/index.ts`
    - `src/ui/app/settings/index.js`
    - `src/ui/reuse/app-router.js`

## Commit

- [e349311](https://github.com/le-firehawk/Cognis/commit/e349311)
- [e81c254](https://github.com/le-firehawk/Cognis/commit/e81c254)
