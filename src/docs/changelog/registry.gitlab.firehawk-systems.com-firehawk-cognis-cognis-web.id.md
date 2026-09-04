# Konfigurasi Portabel

**Cabang Fitur:** N/A

## Berjalan tanpa file env

Orkestrator container kini dapat menyuntikkan seluruh konfigurasi melalui variabel lingkungan. `DATABASE_URL` yang diberikan digunakan secara langsung, dan skema URL yang didukung memilih penyedia basis data ketika `DB_TYPE` tidak tersedia.

## Galat netral deployment

Validasi entrypoint kini menjelaskan nilai lingkungan container yang hilang tanpa mewajibkan file hasil Compose atau perintah penyiapan.

## Komit
