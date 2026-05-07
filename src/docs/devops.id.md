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
ENV NODE_ENV=production
ENV DB_TYPE=sqlite
CMD ["node", "--import", "tsx", "/app/src/api/main.ts"]
```

## Konfigurasi

| Variabel           | Default  | Keterangan                                   |
| ------------------ | -------- | -------------------------------------------- |
| `DB_TYPE`          | `sqlite` | Backend database                             |
| `DATABASE_URL`     | —        | String koneksi untuk PostgreSQL atau MariaDB |
| `LOG_LEVEL`        | `info`   | Verbositas log                               |
| `PORT`             | `3000`   | Port HTTP                                    |
| `COGNIS_SMTP_HOST` | —        | Hostname server SMTP                         |
