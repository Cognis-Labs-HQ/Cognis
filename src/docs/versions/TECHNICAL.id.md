# Referensi Teknis

Indeks ini mencatat versi komponen yang dikirim serta menjelaskan batas versi dependensi teruji dan pemilihan versi dokumentasi.

## Antarmuka

### Kontrak inti

| Komponen     | Jalur       | Versi   |
| ------------ | ----------- | ------- |
| Core Package | `src/core/` | `0.6.5` |

### API

| Komponen   | Jalur      | Versi     |
| ---------- | ---------- | --------- |
| API Server | `src/api/` | `0.13.40` |

## Konfigurasi

Manifes dan package.json membawa versi. Dependensi Cognis memakai batas teruji seperti <=1.2.3; ini batas peringatan, bukan kesetaraan semua fitur lama.

## Perilaku

### Gambaran umum

Dokumen ini melacak versi terkini dari setiap gateway, adapter, dan modul dalam codebase Cognis. Dokumen ini berfungsi sebagai indeks changelog dan referensi cepat untuk menentukan apakah sebuah komponen telah diperbarui sejak rilis sebelumnya.

Komponen mendeklarasikan `version` dalam `manifest.json`, `package.json`, atau keduanya; jika keduanya ada, versinya harus selaras. Naikkan versi komponen pemilik saat implementasi, skema basis data, API publik, atau format konfigurasi berubah sesuai Semantic Versioning. Perbarui indeks ini pada saat yang sama. Catatan rilis ditempatkan dalam satu set changelog cabang yang dilokalkan di bawah `src/docs/changelog/`.

### Tanggung jawab

- Mencatat versi terkini dari setiap komponen berversi dalam codebase.
- Menjadi indeks changelog: menautkan dokumentasi per-komponen dan `src/docs/changelog/` untuk riwayat.
- Memudahkan deteksi drift versi antara komponen yang terpasang dan codebase saat ini.

Tidak bertanggung jawab untuk: menegakkan kenaikan versi (itu tanggung jawab code review) atau melacak versi paket eksternal.

### Aturan versi

Naikkan versi menggunakan [Semantic Versioning](https://semver.org/):

- **Patch** (`0.1.x`): perbaikan bug, perubahan internal yang tidak breaking.
- **Minor** (`0.x.0`): fitur baru yang kompatibel ke belakang atau tambahan API.
- **Major** (`x.0.0`): perubahan breaking pada API publik atau skema komponen.

### Aturan dependensi

Dependensi komponen internal Cognis menggunakan rentang `<=<tested-version>`. Ini mencatat versi dependensi terbaru yang telah diuji untuk komponen tersebut, sekaligus memungkinkan tampilan siklus hidup Administrasi memberi peringatan saat dependensi terpasang yang lebih baru mungkin belum diverifikasi.

### Adapter

| Komponen              | Jalur                               | Versi    |
| --------------------- | ----------------------------------- | -------- |
| SMTP Notification     | `src/adapters/notify/smtp/`         | `0.5.5`  |
| Internal Notification | `src/adapters/notify/internal/`     | `0.5.39` |
| Local File Storage    | `src/adapters/file/local/`          | `0.1.29` |
| File Quota            | `src/adapters/file/quota/`          | `1.0.27` |
| Local Auth            | `src/adapters/auth/local/`          | `0.4.4`  |
| User Keyring          | `src/adapters/auth/keyring/`        | `2.1.8`  |
| LDAP Auth             | `src/adapters/auth/ldap/`           | `0.5.40` |
| OIDC Auth             | `src/adapters/auth/oidc/`           | `0.1.26` |
| SAML Auth             | `src/adapters/auth/saml/`           | `0.1.26` |
| SMTP TFA              | `src/adapters/tfa/smtp/`            | `1.1.4`  |
| TOTP TFA              | `src/adapters/tfa/totp/`            | `1.0.30` |
| PostgreSQL Database   | `src/adapters/db/postgres/`         | `0.5.29` |
| MariaDB Database      | `src/adapters/db/mariadb/`          | `0.5.34` |
| SQLite Database       | `src/adapters/db/sqlite/`           | `0.3.29` |
| Memory Database       | `src/adapters/db/memory/`           | `0.1.26` |
| Registration Token    | `src/adapters/registration/token/`  | `0.1.42` |
| Public Registration   | `src/adapters/registration/public/` | `0.1.25` |
| Profile (Social)      | `src/adapters/social/profile/`      | `3.0.22` |
| Messages (Social)     | `src/adapters/social/messages/`     | `2.7.51` |
| Calls (Social)        | `src/adapters/social/call/`         | `0.5.39` |
| Link Share            | `src/adapters/share/link/`          | `1.1.43` |
| User Share            | `src/adapters/share/user/`          | `1.1.21` |
| Classes (Study)       | `src/adapters/study/classes/`       | `1.4.15` |
| Library (Study)       | `src/adapters/study/library/`       | `4.1.32` |
| Drawing (Study)       | `src/adapters/study/drawing/`       | `1.1.4`  |
| Adaptor Kartu Belajar | `src/adapters/study/flashcards/`    | `1.5.36` |
| Progress (Study)      | `src/adapters/study/progress/`      | `1.3.4`  |
| Leaderboard (Study)   | `src/adapters/study/leaderboard/`   | `1.2.14` |
| Console Logging       | `src/adapters/logging/console/`     | `1.1.4`  |
| File Logging          | `src/adapters/logging/file/`        | `1.1.5`  |

### Gerbang

| Komponen              | Jalur                         | Versi    |
| --------------------- | ----------------------------- | -------- |
| Database (db)         | `src/gateways/db/`            | `1.4.3`  |
| Authentication (auth) | `src/gateways/auth/`          | `2.2.11` |
| Share                 | `src/gateways/share/`         | `1.9.14` |
| Two-Factor (tfa)      | `src/gateways/tfa/`           | `1.3.11` |
| Notification (notify) | `src/gateways/notify/`        | `2.2.14` |
| Social                | `src/gateways/social/`        | `1.4.8`  |
| File Storage (files)  | `src/gateways/files/`         | `2.3.9`  |
| Registration          | `src/gateways/registration/`  | `1.2.10` |
| Logging               | `src/gateways/logging/`       | `1.5.24` |
| Observability         | `src/gateways/observability/` | `1.0.9`  |
| Study                 | `src/gateways/study/`         | `2.6.17` |
| Calendar              | `src/gateways/calendar/`      | `1.7.29` |

### Peralatan

| Komponen   | Jalur              | Versi   |
| ---------- | ------------------ | ------- |
| Cognis CLI | `src/tooling/cli/` | `0.4.5` |

[c]: https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/package.json
[a]: https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/package.json
[m]: https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/social/messages/package.json
[p]: https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/social/profile/package.json

## Keamanan

Versi atau batas teruji bukan izin mengaktifkan komponen. Integritas, dependensi, dan proteksi host tetap berlaku saat peningkatan.

## Referensi

- [src/tooling/reuse/component-files.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/tooling/reuse/component-files.js)
- [package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/package.json)
