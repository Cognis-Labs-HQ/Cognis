# Referensi Teknis

Antarmuka publik dan aturan operasional SQLite.

## Antarmuka

SQLite terintegrasi melalui gerbang pemilik; manifesnya mengidentifikasi komponen dan dependensi yang diperlukan.

## Konfigurasi

### Konfigurasi

Pilih backend SQLite dengan `DB_TYPE=sqlite` ketika deployment Anda dikonfigurasi untuk menggunakan adapter ini. Konfigurasikan path file database melalui pengaturan SQLite yang digunakan lingkungan runtime Anda, seperti `SQLITE_PATH` jika didukung.

Lihat [dokumentasi Gateway Database](/docs/gateways/db) untuk detail konfigurasi gateway secara umum.

## Perilaku

### Ikhtisar

Adapter SQLite menyediakan gateway database ringan untuk deployment berbasis SQLite, pengembangan lokal, dan pengujian yang membutuhkan penyimpanan relasional tertanam.

### Tanggung Jawab

- Mengimplementasikan antarmuka `DatabaseGateway` melalui `SqliteDbGateway`.
- Menjalankan kueri, perintah, dan transaksi terhadap klien SQLite yang disediakan.
- Mendukung perintah database terstruktur dengan sintaks placeholder dan konflik SQLite.
- Menyediakan helper skema auth khusus SQLite serta skrip inisialisasi dan migrasi SQL.

## Keamanan

Akses SQLite diatur oleh pemanggil dan gerbang pemilik. Mengaktifkan komponen tidak menambah izin akun.

## Referensi

Kode sumber dan metadata paket: `src/adapters/db/sqlite/`.
