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

Nilai default Docker tetap berada di `docker/env/default.env` yang terlacak. Jalankan `./setup.sh` untuk memilih PostgreSQL atau MariaDB, memilih pengembangan atau produksi, dan memasukkan pengaturan koneksi. Skrip menulis semua nilai khusus pengguna ke satu file `docker/env/runtime.env` yang diabaikan Git, membuat rahasia saat input dibiarkan kosong, dan memperbarui `docker-compose.yaml` untuk memilih driver tersebut. Compose mengimpor kedua file env melalui path relatif repositori yang eksplisit. Entrypoint container memvalidasi pengaturan yang dibuat dan membangun `DATABASE_URL`. Penyiapan juga mewajibkan `HOST` internal, `EXTERNAL_HOST` publik, dan `CONTACT_EMAIL` publik; container memvalidasi ketiganya, dan aplikasi secara mandiri menolak host publik atau kontak yang tidak ada.

```sh
./setup.sh
docker compose up --build
```

## Konfigurasi

| Variabel               | Default      | Keterangan                                               |
| ---------------------- | ------------ | -------------------------------------------------------- |
| `DB_TYPE`              | `postgresql` | Backend database: `postgresql` atau `mariadb`            |
| `DATABASE_URL`         | —            | Dibangun oleh entrypoint container dari pengaturan mesin |
| `LOG_LEVEL`            | `info`       | Verbositas stream log runtime                            |
| `LOG_ROTATE_MAX_BYTES` | `10485760`   | Rotasi file log aktif saat ukuran ini tercapai (byte)    |
| `LOG_ROTATE_MAX_FILES` | `10`         | Jumlah arsip log hasil rotasi yang disimpan              |
| `LOG_ROTATE_COMPRESS`  | `true`       | Kompres log hasil rotasi dengan gzip (`.gz`)             |
| `PORT`                 | `3000`       | Port HTTP                                                |
| `HOST`                 | —            | Hostname layanan internal yang wajib                     |
| `EXTERNAL_HOST`        | —            | URL publik yang wajib dan dapat dijangkau                |
| `CONTACT_EMAIL`        | —            | Alamat kontak publik yang wajib                          |
| `COGNIS_SMTP_HOST`     | —            | Hostname server SMTP                                     |

Nilai default Docker dan penggantian penyiapan aktif tercantum langsung dalam file env di bawah `docker/env/`.
