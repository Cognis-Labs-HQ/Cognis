# Penggunaan

Prosedur praktis untuk DevOps.

## Prasyarat

Siapkan Docker Compose, kredensial basis data, dan kunci enkripsi yang dikelola penerapan.

## Contoh

Sediakan POSTGRES_PASSWORD dan DATA_ENCRYPTION_KEY, jalankan `docker compose up --build`, lalu periksa kesehatan serta log.

```sh
export POSTGRES_PASSWORD='<kata sandi basis data>'
export DATA_ENCRYPTION_KEY='<kunci enkripsi 64 karakter>'
docker compose up --build
```

## Hasil yang Diharapkan

Aplikasi berjalan di belakang nginx dengan basis data terkonfigurasi; rahasia wajib yang hilang menghentikan startup.

## Pemecahan Masalah

Periksa galat Compose, koneksi basis data, dan kepemilikan direktori. Cadangkan basis data serta media bersama sebelum peningkatan.
