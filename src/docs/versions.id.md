# Versi Komponen

## Ikhtisar

Dokumen ini melacak versi terkini setiap gateway, adapter, dan modul dalam kodebase Cognis. Dokumen ini berfungsi sebagai indeks changelog dan referensi cepat.

Setiap gateway, adapter, dan modul membawa `package.json` dengan field `version`. Saat Anda memodifikasi komponen, Anda harus menaikkan versi di `package.json` tersebut mengikuti Semantic Versioning. Entri changelog disimpan sebagai file per-PR di `src/docs/changelog/`.

## Adapter

| Komponen               | Path                                | Versi   |
| ---------------------- | ----------------------------------- | ------- |
| Notifikasi SMTP        | `src/adapters/notify/smtp/`         | `0.2.4` |
| Notifikasi Internal    | `src/adapters/notify/internal/`     | `0.5.2` |
| Penyimpanan File Lokal | `src/adapters/file/local/`          | `0.1.0` |
| Autentikasi Lokal      | `src/adapters/auth/local/`          | `0.2.5` |
| Autentikasi LDAP       | `src/adapters/auth/ldap/`           | `0.1.4` |
| Autentikasi OIDC       | `src/adapters/auth/oidc/`           | `0.1.1` |
| Autentikasi SAML       | `src/adapters/auth/saml/`           | `0.1.1` |
| Database PostgreSQL    | `src/adapters/db/postgres/`         | `0.1.0` |
| Database MariaDB       | `src/adapters/db/mariadb/`          | `0.1.0` |
| Undangan Registrasi    | `src/adapters/registration/invite/` | `0.1.1` |
| Token Registrasi       | `src/adapters/registration/token/`  | `0.1.1` |
| Registrasi Publik      | `src/adapters/registration/public/` | `0.1.0` |
| Profil (Sosial)        | `src/adapters/social/profile/`      | `1.0.7` |
| Pesan (Sosial)         | `src/adapters/social/messages/`     | `1.4.4` |

## Gateway

| Komponen                 | Path                         | Versi    |
| ------------------------ | ---------------------------- | -------- |
| Database (db)            | `src/gateways/db/`           | `1.1.3`  |
| Autentikasi (auth)       | `src/gateways/auth/`         | `1.4.9`  |
| Share                    | `src/gateways/share/`        | `1.2.6`  |
| Dua Faktor (tfa)         | `src/gateways/tfa/`          | `1.1.5`  |
| Notifikasi (notify)      | `src/gateways/notify/`       | `1.4.11` |
| Sosial                   | `src/gateways/social/`       | `1.2.6`  |
| Penyimpanan File (files) | `src/gateways/files/`        | `1.1.0`  |
| Registrasi               | `src/gateways/registration/` | `1.1.3`  |
| Logging                  | `src/gateways/logging/`      | `1.4.0`  |
| Kalender                 | `src/gateways/calendar/`     | `1.2.0`  |

## API

| Komponen   | Path       | Versi   |
| ---------- | ---------- | ------- |
| Server API | `src/api/` | `0.1.3` |

## Modul

| Komponen             | Path                                | Versi    |
| -------------------- | ----------------------------------- | -------- |
| Analitik             | `src/modules/analytics/`            | `2.0.1`  |
| Jitsi Meet           | `src/modules/jitsi-meet/`           | `1.2.3`  |
| Nextcloud Whiteboard | `src/modules/nextcloud-whiteboard/` | `2.1.29` |
| Cognis Jepang        | `src/modules/study/languages/ja/`   | `1.2.4`  |
| Cognis Inggris       | `src/modules/study/languages/en/`   | `1.2.2`  |
