# DevOps

## Ikhtisar

Cognis dikirimkan sebagai satu image Docker yang dibangun dari Node 22. Pipeline CI/CD mencakup pengujian otomatis pada setiap push atau pull request dan pengiriman image otomatis ke container registry saat rilis.

Image sengaja dibuat minimal: hanya menginstal dependensi produksi, berjalan sebagai pengguna `cognis` non-root, dan mengekspos satu port.

## Tanggung Jawab

- Membangun image Docker Node 22 yang dapat dijalankan dan non-root dari sumber repositori.
- Menjalankan instalasi, pengecekan tipe, dan pengujian pada setiap push dan pull request (CI).
- Membangun dan mendorong image ke container registry saat rilis (CD).
- Menyediakan file Compose produksi dan pengembangan khusus database untuk PostgreSQL dan MariaDB.

## Arsitektur

### Dockerfile

Dockerfile di `docker/Dockerfile` menggunakan satu stage `FROM node:22`:

- Membuat pengguna dan grup sistem `cognis` non-root.
- Membuat direktori runtime dengan kepemilikan yang benar.
- Menyalin `docker/cognisctl`, `docker/entrypoint.sh`, dan `docker/healthcheck.sh`.
- Menginstal dependensi dengan `npm ci --ignore-scripts` sebagai pengguna non-root.

```dockerfile
EXPOSE 3000
CMD ["node", "src/api/main.js"]
```

### Profil lingkungan

Nilai default Docker disimpan di luar image dalam `docker/env/default.env`, yang ditautkan ke `.env` di root repositori. PostgreSQL dan MariaDB memiliki file env driver, pengembangan, dan produksi yang terpisah. Compose mewajibkan host, port, database, nama pengguna, dan kata sandi mesin yang dipilih lalu membangun `DATABASE_URL` dari nilai tersebut. Profil produksi juga mewajibkan `DATA_ENCRYPTION_KEY` sehingga container tidak dapat dibuat dengan pengaturan yang belum lengkap.

```sh
docker compose --env-file docker/env/default.env --env-file docker/env/postgres.env --env-file docker/env/production.env --env-file docker/env/postgres-production.env -f docker-compose.postgres.yaml up
docker compose --env-file docker/env/default.env --env-file docker/env/mariadb.env --env-file docker/env/production.env --env-file docker/env/mariadb-production.env -f docker-compose.mariadb.yaml up
docker compose --env-file docker/env/default.env --env-file docker/env/postgres.env --env-file docker/env/development.env --env-file docker/env/postgres-development.env -f docker-compose.postgres.dev.yaml up
docker compose --env-file docker/env/default.env --env-file docker/env/mariadb.env --env-file docker/env/development.env --env-file docker/env/mariadb-development.env -f docker-compose.mariadb.dev.yaml up
```

## Konfigurasi

| Variabel               | Default      | Keterangan                                               |
| ---------------------- | ------------ | -------------------------------------------------------- |
| `DB_TYPE`              | `postgresql` | Backend database: `postgresql` atau `mariadb`            |
| `DATABASE_URL`         | —            | Dibangun oleh Compose dari pengaturan mesin yang dipilih |
| `LOG_LEVEL`            | `info`       | Verbositas stream log runtime                            |
| `LOG_ROTATE_MAX_BYTES` | `10485760`   | Rotasi file log aktif saat ukuran ini tercapai (byte)    |
| `LOG_ROTATE_MAX_FILES` | `10`         | Jumlah arsip log hasil rotasi yang disimpan              |
| `LOG_ROTATE_COMPRESS`  | `true`       | Kompres log hasil rotasi dengan gzip (`.gz`)             |
| `PORT`                 | `3000`       | Port HTTP                                                |
| `COGNIS_SMTP_HOST`     | —            | Hostname server SMTP                                     |

Nilai default Docker dan penggantian penyiapan aktif tercantum langsung dalam file env di bawah `docker/env/`.
