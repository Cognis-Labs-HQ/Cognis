# Versi Komponen

## Ikhtisar

Dokumen ini melacak versi terkini setiap gateway, adapter, dan modul dalam kodebase Cognis. Dokumen ini berfungsi sebagai indeks changelog dan referensi cepat.

Setiap gateway, adapter, dan modul membawa `package.json` dengan field `version`. Saat Anda memodifikasi komponen, Anda harus menaikkan versi di `package.json` tersebut mengikuti Semantic Versioning.

## Adapter

| Komponen               | Path                        | Versi   |
| ---------------------- | --------------------------- | ------- |
| Notifikasi SMTP        | `src/adapters/notify/smtp/` | `0.1.0` |
| Penyimpanan File Lokal | `src/adapters/file/local/`  | `0.1.0` |
| Autentikasi Lokal      | `src/adapters/auth/local/`  | `0.2.0` |
| Database SQLite        | `src/adapters/db/sqlite/`   | `0.1.0` |
| Database PostgreSQL    | `src/adapters/db/postgres/` | `0.1.0` |
| Database MariaDB       | `src/adapters/db/mariadb/`  | `0.1.0` |

## Gateway

| Komponen                 | Path                    | Versi   |
| ------------------------ | ----------------------- | ------- |
| Database (db)            | `src/gateways/db/`      | `1.1.0` |
| Autentikasi (auth)       | `src/gateways/auth/`    | `1.1.0` |
| Notifikasi (notify)      | `src/gateways/notify/`  | `0.1.0` |
| Profil                   | `src/gateways/profile/` | `1.1.0` |
| Penyimpanan File (files) | `src/gateways/files/`   | `1.1.0` |
| Logging                  | `src/gateways/logging/` | `1.1.0` |

## Modul

| Komponen         | Path                            | Versi   |
| ---------------- | ------------------------------- | ------- |
| Sample Analytics | `src/modules/sample-analytics/` | `0.1.0` |
