# Adapter Database PostgreSQL

## Ikhtisar

Adapter PostgreSQL menghubungkan Cognis ke server database PostgreSQL. Adapter ini menggunakan driver npm `pg` dan merupakan adapter yang direkomendasikan untuk deployment produksi yang memerlukan fitur SQL lanjutan, pencarian teks lengkap, atau layanan PostgreSQL terkelola. Diaktifkan dengan `DB_TYPE=postgresql`.

## Tanggung Jawab

- Mengimplementasikan antarmuka `DatabaseGateway`: `query`, `execute`, dan `transaction`.
- Mengelola connection pool PostgreSQL menggunakan string koneksi `DATABASE_URL`.
- Menyediakan dukungan placeholder posisi `$1`, `$2`, ….

## Arsitektur

`PostgresDbGateway` di `src/adapters/db/postgres/index.ts` memiliki `pg.Pool`. Kueri biasa dijalankan langsung melalui pool. Transaksi mencadangkan satu klien untuk `BEGIN`, semua pernyataan callback, serta `COMMIT` atau `ROLLBACK`, lalu melepaskannya. Adapter mendaftarkan pengosongan pool melalui kapabilitas ctx `system:lifecycle` agar penghentian server berhenti menerima pekerjaan sebelum menutup koneksi.

Pemulihan mandiri skema mempertahankan klausa kunci asing saat menambahkan kolom yang hilang dan melaporkan kegagalan perbaikan indeks atau kolom alih-alih mengabaikannya.

### Sintaks Placeholder

PostgreSQL menggunakan placeholder bernomor `$N`:

```sql
INSERT INTO accounts (id, email) VALUES ($1, $2)
```

## Konfigurasi

| Variabel                              | Default | Keterangan                                                             |
| ------------------------------------- | ------- | ---------------------------------------------------------------------- |
| `DB_TYPE`                             | —       | Harus `postgresql` untuk mengaktifkan adapter ini                      |
| `DATABASE_URL`                        | —       | URL koneksi PostgreSQL, mis. `postgresql://user:pass@host:5432/cognis` |
| `POSTGRES_POOL_MAX`                   | `10`    | Ukuran maksimum pool (1–100)                                           |
| `POSTGRES_POOL_IDLE_TIMEOUT_MS`       | `30000` | Batas waktu klien menganggur dalam milidetik (1.000–600.000)           |
| `POSTGRES_POOL_CONNECTION_TIMEOUT_MS` | `5000`  | Batas waktu koneksi dalam milidetik (100–120.000)                      |
| `POSTGRES_POOL_STATEMENT_TIMEOUT_MS`  | —       | Batas waktu pernyataan opsional dalam milidetik (1–3.600.000)          |

## Memperbarui kunci relasi lama

PostgreSQL dan MariaDB kini memperluas kunci utama gabungan yang sudah ada ketika deklarasi menambah kolom sambil mempertahankan semua kolom kunci sebelumnya. Tabel referensi Library lama memperoleh group_index dan position dalam kuncinya, sehingga Kana yang sama dapat muncul pada beberapa pelafalan atau posisi tanpa kesalahan kunci duplikat. Baris lama dipertahankan; kunci yang sudah sesuai serta deklarasi yang berbeda atau lebih sempit tidak diubah. Perluasan dicatat dan dijalankan saat inisialisasi skema berikutnya.

## Perbaikan kunci referensi

Inisialisasi skema menghapus indeks unik lama yang dibuat otomatis jika kolomnya merupakan bagian dari kunci primer saat ini, setelah memastikan kunci primer sesuai. Ini memperbaiki indeks uq_study_library_references_208386997ea7 yang menolak Kana berulang pada posisi sama di kelompok bacaan berbeda. Kunci unik yang dinyatakan secara eksplisit, indeks dengan nama mandiri, dan baris yang ada tetap dipertahankan. Tidak diperlukan penghapusan data manual.
