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

### Profil lingkungan

Nilai default Docker tetap berada di `docker/env/default.env`. `./setup.sh` menulis nilai aplikasi dan basis data ke `docker/env/runtime.env`, serta hanya pengaturan TLS web ke `docker/env/cognis-web.env`. Compose hanya memberikan file web kepada `cognis-web`, sehingga container itu tidak dapat membaca kunci enkripsi Cognis atau kredensial basis data. Penyiapan menanyakan apakah reverse proxy atau CDN terpisah menghentikan HTTPS sebelum `cognis-web`; jawaban ya menulis `COGNIS_WEB_TLS_MODE=deferred`, sedangkan tidak mempertahankan terminasi TLS lokal dengan `terminate`.

File env hanyalah kemudahan untuk Compose, bukan persyaratan runtime. Orkestrator seperti Kubernetes dapat menyuntikkan nilai yang sama langsung ke container. Orkestrator dapat memberikan `DB_TYPE` beserta variabel koneksi khusus penyedia, atau memberikan `DATABASE_URL` secara langsung. Jika `DB_TYPE` tidak diberikan, entrypoint menentukan tipenya dari skema URL PostgreSQL atau MySQL/MariaDB.

Saat Traefik atau reverse proxy lain mengakhiri TLS, hubungkan upstream-nya ke
port HTTP 80 `cognis-web` dan gunakan `COGNIS_WEB_TLS_MODE=deferred`. Image hanya
mengiklankan port 80 untuk penemuan layanan container otomatis agar proxy tidak
keliru memilih listener TLS pada port 443 dan mengembalikan HTTP 421. Port 443
tetap tersedia melalui publikasi Compose eksplisit ketika `cognis-web`
mengakhiri TLS sendiri.

```sh
./setup.sh
docker compose up --build
```

## Konfigurasi

| Variabel                         | Default                        | Keterangan                                                                                                  |
| -------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `DB_TYPE`                        | `postgresql`                   | Backend database: `postgresql` atau `mariadb`                                                               |
| `DATABASE_URL`                   | —                              | Dibangun oleh entrypoint container dari pengaturan mesin                                                    |
| `LOG_LEVEL`                      | `info`                         | Verbositas stream log runtime                                                                               |
| `LOG_ROTATE_MAX_BYTES`           | `10485760`                     | Rotasi file log aktif saat ukuran ini tercapai (byte)                                                       |
| `LOG_ROTATE_MAX_FILES`           | `10`                           | Jumlah arsip log hasil rotasi yang disimpan                                                                 |
| `LOG_ROTATE_COMPRESS`            | `true`                         | Kompres log hasil rotasi dengan gzip (`.gz`)                                                                |
| `PORT`                           | `3000`                         | Port HTTP                                                                                                   |
| `COGNIS_WEB_TLS_MODE`            | `terminate`                    | Mode TLS web: `terminate` untuk HTTPS lokal atau `deferred` untuk HTTP di belakang terminator TLS tepercaya |
| `COGNIS_WEB_TLS_CERTIFICATE`     | `/etc/nginx/tls/fullchain.pem` | Path sertifikat di `cognis-web`; hanya dibaca dalam mode `terminate`                                        |
| `COGNIS_WEB_TLS_CERTIFICATE_KEY` | `/etc/nginx/tls/privkey.pem`   | Path kunci privat; hanya dibaca dalam mode `terminate`                                                      |
| `HOST`                           | —                              | Hostname layanan internal yang wajib                                                                        |
| `EXTERNAL_HOST`                  | —                              | URL publik yang wajib dan dapat dijangkau                                                                   |
| `CONTACT_EMAIL`                  | —                              | Alamat kontak publik yang wajib                                                                             |
| `COGNIS_SMTP_HOST`               | —                              | Hostname server SMTP                                                                                        |

Nilai default Docker dan penggantian penyiapan aktif tercantum langsung dalam file env di bawah `docker/env/`.
