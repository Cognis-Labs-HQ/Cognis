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
| SMTP Notification     | `src/adapters/notify/smtp/`         | `0.2.36` |
| Internal Notification | `src/adapters/notify/internal/`     | `0.5.30` |
| Local File Storage    | `src/adapters/file/local/`          | `0.1.25` |
| File Quota            | `src/adapters/file/quota/`          | `1.0.23` |
| Local Auth            | `src/adapters/auth/local/`          | `0.3.30` |
| User Keyring          | `src/adapters/auth/keyring/`        | `1.0.51` |
| LDAP Auth             | `src/adapters/auth/ldap/`           | `0.5.37` |
| OIDC Auth             | `src/adapters/auth/oidc/`           | `0.1.23` |
| SAML Auth             | `src/adapters/auth/saml/`           | `0.1.23` |
| SMTP TFA              | `src/adapters/tfa/smtp/`            | `1.0.37` |
| TOTP TFA              | `src/adapters/tfa/totp/`            | `1.0.26` |
| PostgreSQL Database   | `src/adapters/db/postgres/`         | `0.5.25` |
| MariaDB Database      | `src/adapters/db/mariadb/`          | `0.5.31` |
| SQLite Database       | `src/adapters/db/sqlite/`           | `0.3.27` |
| Memory Database       | `src/adapters/db/memory/`           | `0.1.24` |
| Registration Token    | `src/adapters/registration/token/`  | `0.1.38` |
| Public Registration   | `src/adapters/registration/public/` | `0.1.22` |
| Profile (Social)      | `src/adapters/social/profile/`      | `2.0.13` |
| Messages (Social)     | `src/adapters/social/messages/`     | `2.7.19` |
| Calls (Social)        | `src/adapters/social/call/`         | `0.5.34` |
| Link Share            | `src/adapters/share/link/`          | `1.1.36` |
| User Share            | `src/adapters/share/user/`          | `1.1.19` |
| Classes (Study)       | `src/adapters/study/classes/`       | `1.3.11` |
| Library (Study)       | `src/adapters/study/library/`       | `2.9.2`  |
| Progress (Study)      | `src/adapters/study/progress/`      | `1.1.7`  |
| Leaderboard (Study)   | `src/adapters/study/leaderboard/`   | `1.1.5`  |
| Console Logging       | `src/adapters/logging/console/`     | `1.1.4`  |
| File Logging          | `src/adapters/logging/file/`        | `1.1.5`  |

## Gerbang

| Komponen              | Jalur                         | Versi     |
| --------------------- | ----------------------------- | --------- |
| Database (db)         | `src/gateways/db/`            | `1.3.9`   |
| Authentication (auth) | `src/gateways/auth/`          | `1.9.69`  |
| Share                 | `src/gateways/share/`         | `1.7.48`  |
| Two-Factor (tfa)      | `src/gateways/tfa/`           | `1.1.20`  |
| Notification (notify) | `src/gateways/notify/`        | `1.5.13`  |
| Social                | `src/gateways/social/`        | `1.3.6`   |
| File Storage (files)  | `src/gateways/files/`         | `2.1.10`  |
| Registration          | `src/gateways/registration/`  | `1.1.39`  |
| Logging               | `src/gateways/logging/`       | `1.5.14`  |
| Observability         | `src/gateways/observability/` | `1.0.7`   |
| Study                 | `src/gateways/study/`         | `1.8.21`  |
| Calendar              | `src/gateways/calendar/`      | `1.4.115` |

## Kontrak inti

| Komponen     | Jalur       | Versi     |
| ------------ | ----------- | --------- |
| Core Package | `src/core/` | `0.3.112` |

## API

| Komponen   | Jalur      | Versi   |
| ---------- | ---------- | ------- |
| API Server | `src/api/` | `0.6.8` |

## Peralatan

| Komponen   | Jalur              | Versi   |
| ---------- | ------------------ | ------- |
| Cognis CLI | `src/tooling/cli/` | `0.2.5` |
