# Rapikan Direktori

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

---

## Pass 2 — Co-lokasi Auth, Profil, dan UI Notify

### Ringkasan

File-file inti yang salah lokasi dipindahkan ke lokasi pemilik kanoniknya. Utilitas token autentikasi (`access-tokens.ts`, `guard.ts`) dipindahkan dari `src/api/auth/` ke `src/gateways/auth/`. Handler route auth dan tesnya dipindahkan ke `src/gateways/auth/routes/` dan `src/gateways/auth/tests/`. Handler route profil dan antarmuka store dipindahkan dari `src/api/` ke `src/adapters/social/profile/`. Halaman verify-email (HTML, JS, CSS) dipindahkan dari `src/ui/` ke `src/gateways/notify/ui/`; gateway notify sekarang memiliki dan melayani halaman ini. Stub `src/modules/study-language-ja/` dihapus dan manifestnya digabungkan ke modul Jepang di `src/modules/study/languages/ja/`. Dokumen `src/docs/profile.*` yang usang dihapus.

### Commit Pass 2

- [34fc21c](https://github.com/le-firehawk/Cognis/commit/34fc21c)
- [47a2c1a](https://github.com/le-firehawk/Cognis/commit/47a2c1a)
- [7916873](https://github.com/le-firehawk/Cognis/commit/7916873)

---

## Pass 3 — Perlindungan Nonaktif Gateway, Perbaikan Modul Jepang, Instruksi AI

### Ringkasan

Memperbaiki regresi di mana bagian pengaturan dan plugin navbar Study gateway tetap terlihat di UI setelah gateway dinonaktifkan. `isEnabled` ditambahkan ke antarmuka `SettingsSection` sesuai dengan predikat yang sudah ada pada `NavbarPlugin`, dan endpoint `GET /api/v1/ui/settings-sections` kini memfilter bagian saat merespons.

Mengembalikan modul bahasa Jepang dalam daftar modul administrasi. Sesi sebelumnya menghapus stub `src/modules/study-language-ja/` tanpa memperluas pemindai bootstrap ke jalur manifest asli di `src/modules/study/languages/ja/`; pemindai kini juga membaca jalur tersebut.

Instruksi kontributor AI diperkuat: bagian baru "Kebersihan codebase adalah hal utama" menegaskan bahwa kode yang tidak sesuai tidak pernah dapat diterima dan semua umpan balik yang menunjuk pelanggaran harus ditindaklanjuti.

### File yang Diubah

- `.github/copilot-instructions.md` — Mandat kebersihan codebase ditambahkan.
- `src/api/ui-registry.ts` — `isEnabled` ditambahkan ke `SettingsSection`.
- `src/api/routes/ui/index.ts` — Respons bagian pengaturan difilter berdasarkan `isEnabled`.
- `src/gateways/study/bootstrap.ts` — Bagian pengaturan dan plugin navbar dikontrol melalui predikat `isEnabled`.
- `src/api/main.ts` — Bootstrap juga memindai `study/languages/` untuk manifest modul bahasa.
- `src/api/tests/ui/ui-routes.test.ts` — Tiga pengujian baru untuk endpoint bagian pengaturan.

### Commit Pass 3

- [f4aa63b](https://github.com/le-firehawk/Cognis/commit/f4aa63b)
