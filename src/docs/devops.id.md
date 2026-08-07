# DevOps

## Ikhtisar

Cognis dikirimkan sebagai image aplikasi Node 22 ditambah image web Nginx `cognis-web`. Pipeline CI/CD mencakup pengujian otomatis pada setiap push atau pull request dan pengiriman image otomatis ke container registry saat rilis.

Image aplikasi sengaja dibuat minimal: hanya menginstal dependensi produksi, berjalan sebagai pengguna `cognis` non-root, dan mengekspos satu port internal. Compose produksi menempatkan image web `cognis-web` di depannya; GitLab CI menerbitkan artefak web yang sama sebagai `$CI_REGISTRY_IMAGE/cognis-web:<ref>` dan `:sha-<commit>`.

## Tanggung Jawab

- Membangun image aplikasi Node 22 yang dapat dijalankan dan non-root dari sumber repositori.
- Membangun image web `cognis-web` dari `docker/cognis-web` untuk trafik TLS yang dipublikasikan.
- Menjalankan instalasi, pengecekan tipe, dan pengujian pada setiap push dan pull request (CI).
- Membangun dan mendorong image aplikasi serta `cognis-web` ke container registry saat rilis (CD).
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

### Default kontainer

Default yang dapat dijalankan tertanam langsung dalam image aplikasi dan web. `docker compose up --build` menjalankan stack PostgreSQL tanpa file lingkungan yang dibuat; gunakan `docker compose -f docker-compose.mariadb.yaml up --build` untuk MariaDB. Penerapan dapat mengganti default image melalui konfigurasi lingkungan normalnya. Entrypoint aplikasi hanya menjalankan perintah yang dikonfigurasi.

Image web mendengarkan HTTP secara default. HTTPS dan pengalihan HTTP ke HTTPS juga diaktifkan ketika kedua path sertifikat yang dikonfigurasi tersedia dan dapat dibaca. Variabel mode TLS tidak diperlukan.

```sh
docker compose up --build
```

## Konfigurasi

| Variabel                         | Default                        | Keterangan                                                                        |
| -------------------------------- | ------------------------------ | --------------------------------------------------------------------------------- |
| `DB_TYPE`                        | `postgresql`                   | Backend database: `postgresql` atau `mariadb`                                     |
| `DATABASE_URL`                   | —                              | URL koneksi basis data; ganti untuk penyedia yang dipilih                         |
| `LOG_LEVEL`                      | `info`                         | Verbositas stream log runtime                                                     |
| `LOG_ROTATE_MAX_BYTES`           | `10485760`                     | Rotasi file log aktif saat ukuran ini tercapai (byte)                             |
| `LOG_ROTATE_MAX_FILES`           | `10`                           | Jumlah arsip log hasil rotasi yang disimpan                                       |
| `LOG_ROTATE_COMPRESS`            | `true`                         | Kompres log hasil rotasi dengan gzip (`.gz`)                                      |
| `PORT`                           | `3000`                         | Port HTTP                                                                         |
| `COGNIS_WEB_TLS_CERTIFICATE`     | `/etc/nginx/tls/fullchain.pem` | Path sertifikat; file sertifikat dan kunci yang dapat dibaca mengaktifkan HTTPS   |
| `COGNIS_WEB_TLS_CERTIFICATE_KEY` | `/etc/nginx/tls/privkey.pem`   | Path kunci privat; file sertifikat dan kunci yang dapat dibaca mengaktifkan HTTPS |
| `HOST`                           | —                              | Hostname layanan internal yang wajib                                              |
| `EXTERNAL_HOST`                  | —                              | URL publik yang wajib dan dapat dijangkau                                         |
| `CONTACT_EMAIL`                  | —                              | Alamat kontak publik yang wajib                                                   |
| `COGNIS_SMTP_HOST`               | —                              | Hostname server SMTP                                                              |

Default aplikasi dideklarasikan dalam `docker/Dockerfile`; default web dideklarasikan dalam `docker/cognis-web/Dockerfile`.
