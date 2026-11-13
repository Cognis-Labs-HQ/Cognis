# DevOps

## Ikhtisar

Cognis mengirimkan image aplikasi Node 24 dan menggabungkannya dengan image `nginx:stable-alpine` tanpa modifikasi. Pipeline CI/CD mencakup pengujian otomatis pada setiap push atau pull request dan pengiriman image otomatis ke container registry saat rilis.

Image aplikasi menginstal dependensi produksi, berjalan sebagai pengguna `cognis` non-root, dan mengekspos satu port internal. Compose menempatkan nginx generik di depannya dengan templat konfigurasi native yang dipasang.

## Tanggung Jawab

- Membangun image aplikasi Node 24 yang dapat dijalankan dan non-root dari sumber repositori.
- Menjalankan instalasi, pengecekan tipe, dan pengujian pada setiap push dan pull request (CI).
- Membangun dan mendorong image aplikasi ke container registry saat rilis (CD).
- Menyediakan file Compose produksi dan pengembangan khusus database untuk PostgreSQL dan MariaDB.

## Arsitektur

### Dockerfile

Dockerfile di `docker/Dockerfile` menggunakan satu stage `FROM node:24`:

- Membuat pengguna dan grup sistem `cognis` non-root.
- Membuat direktori runtime dengan kepemilikan yang benar.
- Menyalin `docker/cognisctl`, `docker/entrypoint.sh`, dan `docker/healthcheck.sh`.
- Menyalin sumber, memasang dependensi build, memverifikasi kedua build, dan menghapus paket khusus pengembangan sebagai pengguna non-root.

```dockerfile
EXPOSE 3000
CMD ["node", "src/api/main.js"]
```

### Default kontainer

Default yang dapat dijalankan tetap berada dalam image aplikasi, sedangkan kredensial basis data dan `DATA_ENCRYPTION_KEY` harus disediakan oleh lingkungan penerapan. Setiap profil Compose meneruskan field koneksi PostgreSQL atau MariaDB yang sesuai ke kontainer aplikasi, lalu entrypoint menyusunnya menjadi `DATABASE_URL`. Penerapan lain dapat menyediakan field khusus penyedia yang sama atau `DATABASE_URL` lengkap.

Profil web menggunakan image `nginx:stable-alpine` tanpa modifikasi dengan `docker/cognis-web/default.conf.template` yang dipasang ke direktori templat native nginx. Caching HTTP dan header proksi tidak memerlukan image web atau entrypoint khusus. Penerapan yang menghentikan TLS di nginx dapat memasang konfigurasi TLS nginx native sendiri; ingress Kubernetes dan proksi eksternal dapat menghentikan TLS tanpa mengubah image Cognis.

Compose membaca rahasia wajib dari lingkungan proses dan berhenti dengan galat yang jelas jika ada nilai yang hilang. Sediakan nilai yang dikelola penerapan sebelum memulai profil PostgreSQL:

```sh
export POSTGRES_PASSWORD='<kata sandi basis data>'
export DATA_ENCRYPTION_KEY='<kunci enkripsi 64 karakter>'
docker compose up --build
```

Untuk MariaDB, tetapkan `MARIADB_PASSWORD`, lalu mulai `docker-compose.mariadb.yaml`; container membuat dan mencatat kata sandi root acak sehingga `MARIADB_ROOT_PASSWORD` tidak diperlukan maupun dibaca. Orkestrator seperti Kubernetes harus memasukkan nilai tersebut melalui fasilitas pengelolaan rahasia native dan tidak memerlukan skrip penyiapan repositori.

## Konfigurasi

| Variabel                                 | Default      | Keterangan                                            |
| ---------------------------------------- | ------------ | ----------------------------------------------------- |
| `DB_TYPE`                                | `postgresql` | Backend database: `postgresql` atau `mariadb`         |
| `DATABASE_URL`                           | —            | URL koneksi lengkap sebagai alternatif field penyedia |
| `POSTGRES_HOST` / `MARIADB_HOST`         | —            | Nama host layanan basis data                          |
| `POSTGRES_PORT` / `MARIADB_PORT`         | —            | Port layanan basis data                               |
| `POSTGRES_DB` / `MARIADB_DATABASE`       | —            | Nama basis data                                       |
| `POSTGRES_USER` / `MARIADB_USER`         | —            | Akun basis data                                       |
| `POSTGRES_PASSWORD` / `MARIADB_PASSWORD` | —            | Kata sandi akun basis data                            |
| `LOG_LEVEL`                              | `info`       | Verbositas stream log runtime                         |
| `LOG_ROTATE_MAX_BYTES`                   | `10485760`   | Rotasi file log aktif saat ukuran ini tercapai (byte) |
| `LOG_ROTATE_MAX_FILES`                   | `10`         | Jumlah arsip log hasil rotasi yang disimpan           |
| `LOG_ROTATE_COMPRESS`                    | `true`       | Kompres log hasil rotasi dengan gzip (`.gz`)          |
| `PORT`                                   | `3000`       | Port HTTP                                             |
| `HOST`                                   | —            | Hostname layanan internal yang wajib                  |
| `EXTERNAL_HOST`                          | —            | URL publik yang wajib dan dapat dijangkau             |
| `CONTACT_EMAIL`                          | —            | Alamat kontak publik yang wajib                       |
| `COGNIS_SMTP_HOST`                       | —            | Hostname server SMTP                                  |

Default aplikasi dideklarasikan dalam `docker/Dockerfile`; perilaku proksi nginx dideklarasikan dalam `docker/cognis-web/default.conf.template`.
