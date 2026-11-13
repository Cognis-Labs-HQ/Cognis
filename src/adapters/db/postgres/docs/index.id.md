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

## Rekonsiliasi Kunci Unik

PostgreSQL `ensureTable()` menyelaraskan deklarasi kolom `unique: true` dan `uniqueKeys` gabungan pada tabel yang sudah ada maupun tabel baru. Indeks unik yang valid, langsung berlaku, dan tidak parsial dikenali berdasarkan kolom kuncinya; hanya indeks yang belum tersedia yang dibuat. Beberapa nilai NULL tetap diizinkan. Kunci primer yang sudah ada tidak diganti.

Inisialisasi skema berjalan dalam transaksi dengan kunci advisory per tabel, termasuk saat dipanggil dalam transaksi executor yang sudah aktif. Nilai duplikat atau benturan nama indeks menggagalkan inisialisasi dan membatalkan perubahan skema; tidak ada rekaman yang dihapus atau dialihkan. Kegagalan dicatat pada batas transaksi.

Pasang pembaruan adaptor host sebelum menginisialisasi ulang skema modul yang terdampak. Mulai ulang host atau nonaktifkan lalu aktifkan kembali modul untuk mengosongkan cache inisialisasi skema. Peran basis data harus memiliki tabel terkait atau hak DDL yang setara. Pembuatan indeks memindai data dan memblokir penulisan; sediakan waktu pemeliharaan serta batas waktu pernyataan yang cukup. Periksa kunci non-NULL yang duplikat dan selesaikan melalui proses pemulihan data yang disetujui sebelum mencoba kembali; jangan menghapus tabel atau mereset konten.

Jalankan pengujian adaptor dengan `COGNIS_TEST_POSTGRES_URL` yang menunjuk ke basis data PostgreSQL khusus pengujian. Pengujian integrasi membuat dan menghapus skema acaknya sendiri dan memerlukan izin pembuatan skema. Tanpa variabel ini, pengujian tersebut dilewati secara eksplisit.
