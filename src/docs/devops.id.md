# DevOps

## Ikhtisar

Cognis mengirimkan image aplikasi Node 22 dan menggabungkannya dengan image `nginx:stable-alpine` tanpa modifikasi. Pipeline CI/CD mencakup pengujian otomatis pada setiap push atau pull request dan pengiriman image otomatis ke container registry saat rilis.

Image aplikasi menginstal dependensi produksi, berjalan sebagai pengguna `cognis` non-root, dan mengekspos satu port internal. Compose menempatkan nginx generik di depannya dengan templat konfigurasi native yang dipasang.

## Tanggung Jawab

- Membangun image aplikasi Node 22 yang dapat dijalankan dan non-root dari sumber repositori.
- Menjalankan instalasi, pengecekan tipe, dan pengujian pada setiap push dan pull request (CI).
- Membangun dan mendorong image aplikasi ke container registry saat rilis (CD).
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

Default yang dapat dijalankan tetap berada dalam image aplikasi, sedangkan nilai sensitif seperti `DATABASE_URL` dan `DATA_ENCRYPTION_KEY` harus disediakan oleh lingkungan penerapan. Entrypoint aplikasi mencatat kegagalan konfigurasi basis data dan dapat menyusun `DATABASE_URL` dari field khusus penyedia sebelum menjalankan Cognis. Compose meneruskan nilai sensitif melalui interpolasi lingkungan native.

Profil web menggunakan image `nginx:stable-alpine` tanpa modifikasi dengan `docker/cognis-web/default.conf.template` yang dipasang ke direktori templat native nginx. Caching HTTP dan header proksi tidak memerlukan image web atau entrypoint khusus. Penerapan yang menghentikan TLS di nginx dapat memasang konfigurasi TLS nginx native sendiri; ingress Kubernetes dan proksi eksternal dapat menghentikan TLS tanpa mengubah image Cognis.

```sh
docker compose up --build
```

## Konfigurasi

| Variabel               | Default      | Keterangan                                                |
| ---------------------- | ------------ | --------------------------------------------------------- |
| `DB_TYPE`              | `postgresql` | Backend database: `postgresql` atau `mariadb`             |
| `DATABASE_URL`         | —            | URL koneksi basis data; ganti untuk penyedia yang dipilih |
| `LOG_LEVEL`            | `info`       | Verbositas stream log runtime                             |
| `LOG_ROTATE_MAX_BYTES` | `10485760`   | Rotasi file log aktif saat ukuran ini tercapai (byte)     |
| `LOG_ROTATE_MAX_FILES` | `10`         | Jumlah arsip log hasil rotasi yang disimpan               |
| `LOG_ROTATE_COMPRESS`  | `true`       | Kompres log hasil rotasi dengan gzip (`.gz`)              |
| `PORT`                 | `3000`       | Port HTTP                                                 |
| `HOST`                 | —            | Hostname layanan internal yang wajib                      |
| `EXTERNAL_HOST`        | —            | URL publik yang wajib dan dapat dijangkau                 |
| `CONTACT_EMAIL`        | —            | Alamat kontak publik yang wajib                           |
| `COGNIS_SMTP_HOST`     | —            | Hostname server SMTP                                      |

Default aplikasi dideklarasikan dalam `docker/Dockerfile`; perilaku proksi nginx dideklarasikan dalam `docker/cognis-web/default.conf.template`.
