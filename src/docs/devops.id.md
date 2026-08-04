# DevOps

## Ikhtisar

Cognis dikirimkan sebagai satu image Docker yang dibangun dari Node 22. Pipeline CI/CD mencakup pengujian otomatis pada setiap push atau pull request dan pengiriman image otomatis ke container registry saat rilis.

Image sengaja dibuat minimal: hanya menginstal dependensi produksi, berjalan sebagai pengguna `cognis` non-root, dan mengekspos satu port.

## Tanggung Jawab

- Membangun image Docker Node 22 yang dapat dijalankan dan non-root dari sumber repositori.
- Menjalankan instalasi, pengecekan tipe, dan pengujian pada setiap push dan pull request (CI).
- Membangun dan mendorong image ke container registry saat rilis (CD).
- Menyediakan `docker-compose.yaml` untuk pengembangan lokal dengan database PostgreSQL.

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

Nilai default Docker disimpan di luar image dalam `docker/env/defaults.env`. `docker-compose.yaml` menambahkan `postgres.env` dan `production.env`; `docker-compose.dev.yaml` menambahkan `postgres.env` dan `development.env`. Ubah kredensial PostgreSQL dan kunci enkripsi produksi sebelum deployment. File env mencegah peringatan interpolasi variabel kosong dan membuat setiap penyiapan menjadi jelas.

## Konfigurasi

| Variabel               | Default      | Keterangan                                            |
| ---------------------- | ------------ | ----------------------------------------------------- |
| `DB_TYPE`              | `postgresql` | Backend database: `postgresql` atau `mariadb`         |
| `DATABASE_URL`         | —            | String koneksi untuk PostgreSQL atau MariaDB          |
| `LOG_LEVEL`            | `info`       | Verbositas stream log runtime                         |
| `LOG_ROTATE_MAX_BYTES` | `10485760`   | Rotasi file log aktif saat ukuran ini tercapai (byte) |
| `LOG_ROTATE_MAX_FILES` | `10`         | Jumlah arsip log hasil rotasi yang disimpan           |
| `LOG_ROTATE_COMPRESS`  | `true`       | Kompres log hasil rotasi dengan gzip (`.gz`)          |
| `PORT`                 | `3000`       | Port HTTP                                             |
| `COGNIS_SMTP_HOST`     | —            | Hostname server SMTP                                  |
