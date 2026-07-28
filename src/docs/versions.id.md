<!-- Keep all src/docs/versions.*.md language variants in sync when updating this file. -->

# Versi Komponen

## Gambaran umum

Dokumen ini melacak versi terkini dari setiap gateway, adapter, dan modul dalam codebase Cognis. Dokumen ini berfungsi sebagai indeks changelog dan referensi cepat untuk menentukan apakah sebuah komponen telah diperbarui sejak rilis sebelumnya.

Setiap gateway, adapter, dan modul memiliki `package.json` dengan field `version`. Saat Anda mengubah sebuah komponen — termasuk logika internal, skema database, API publik, atau format konfigurasi — Anda harus menaikkan versi di `package.json` tersebut sesuai Semantic Versioning. Dokumen ini diperbarui pada saat yang sama. Entri changelog disimpan sebagai file per-PR di `src/docs/changelog/`.

## Tanggung jawab

- Mencatat versi terkini dari setiap komponen berversi dalam codebase.
- Menjadi indeks changelog: menautkan dokumentasi per-komponen dan `src/docs/changelog/` untuk riwayat.
- Memudahkan deteksi drift versi antara komponen yang terpasang dan codebase saat ini.

Tidak bertanggung jawab untuk: menegakkan kenaikan versi (itu tanggung jawab code review) atau melacak versi paket eksternal.

## Aturan versi

Naikkan versi menggunakan [Semantic Versioning](https://semver.org/):

- **Patch** (`0.1.x`): perbaikan bug, perubahan internal yang tidak breaking.
- **Minor** (`0.x.0`): fitur baru yang kompatibel ke belakang atau tambahan API.
- **Major** (`x.0.0`): perubahan breaking pada API publik atau skema komponen.

## Aturan dependensi

Dependensi komponen internal Cognis menggunakan rentang `<=<tested-version>`. Ini mencatat versi dependensi terbaru yang telah diuji untuk komponen tersebut, sekaligus memungkinkan tampilan siklus hidup Administrasi memberi peringatan saat dependensi terpasang yang lebih baru mungkin belum diverifikasi.

## Adapter

| Komponen              | Jalur                               | Versi    |
| --------------------- | ----------------------------------- | -------- |
| SMTP Notification     | `src/adapters/notify/smtp/`         | `0.2.12` |
| Internal Notification | `src/adapters/notify/internal/`     | `0.5.11` |
| Local File Storage    | `src/adapters/file/local/`          | `0.1.5`  |
| Kuota Berkas          | `src/adapters/file/quota/`          | `1.0.4`  |
| Local Auth            | `src/adapters/auth/local/`          | `0.3.5`  |
| LDAP Auth             | `src/adapters/auth/ldap/`           | `0.5.5`  |
| OIDC Auth             | `src/adapters/auth/oidc/`           | `0.1.5`  |
| SAML Auth             | `src/adapters/auth/saml/`           | `0.1.5`  |
| SMTP TFA              | `src/adapters/tfa/smtp/`            | `1.0.11` |
| TOTP TFA              | `src/adapters/tfa/totp/`            | `1.0.8`  |
| PostgreSQL Database   | `src/adapters/db/postgres/`         | `0.4.6`  |
| MariaDB Database      | `src/adapters/db/mariadb/`          | `0.4.6`  |
| SQLite Database       | `src/adapters/db/sqlite/`           | `0.3.6`  |
| Memory Database       | `src/adapters/db/memory/`           | `0.1.4`  |
| Registration Invite   | `src/adapters/registration/invite/` | `0.1.7`  |
| Registration Token    | `src/adapters/registration/token/`  | `0.1.6`  |
| Public Registration   | `src/adapters/registration/public/` | `0.1.4`  |
| Profile (Social)      | `src/adapters/social/profile/`      | `1.1.20` |
| Messages (Social)     | `src/adapters/social/messages/`     | `1.4.28` |
| Classes (Study)       | `src/adapters/study/classes/`       | `1.3.7`  |
| Japanese (Study)      | `src/adapters/study/japanese/`      | `1.0.0`  |

## Gerbang

| Komponen              | Jalur                        | Versi    |
| --------------------- | ---------------------------- | -------- |
| Database (db)         | `src/gateways/db/`           | `1.2.2`  |
| Authentication (auth) | `src/gateways/auth/`         | `1.7.16` |
| Share                 | `src/gateways/share/`        | `1.6.23` |
| Two-Factor (tfa)      | `src/gateways/tfa/`          | `1.1.11` |
| Notification (notify) | `src/gateways/notify/`       | `1.4.11` |
| Social                | `src/gateways/social/`       | `1.2.7`  |
| File Storage (files)  | `src/gateways/files/`        | `2.1.2`  |
| Registration          | `src/gateways/registration/` | `1.1.10` |
| Logging               | `src/gateways/logging/`      | `1.5.2`  |
| Study                 | `src/gateways/study/`        | `1.5.7`  |
| Calendar              | `src/gateways/calendar/`     | `1.4.24` |

## Kontrak inti

| Komponen     | Jalur       | Versi   |
| ------------ | ----------- | ------- |
| Core Package | `src/core/` | `0.3.4` |

## API

| Komponen   | Jalur      | Versi    |
| ---------- | ---------- | -------- |
| API Server | `src/api/` | `0.1.16` |

## Modul

| Komponen             | Jalur                               | Versi   |
| -------------------- | ----------------------------------- | ------- |
| Analytics            | `src/modules/analytics/`            | `2.0.4` |
| Jitsi Meet           | `src/modules/jitsi-meet/`           | `1.3.9` |
| Nextcloud Whiteboard | `src/modules/nextcloud-whiteboard/` | `2.2.8` |
| Cognis Japanese      | `src/modules/study/languages/ja/`   | `1.2.6` |
| Cognis English       | `src/modules/study/languages/en/`   | `1.2.4` |
