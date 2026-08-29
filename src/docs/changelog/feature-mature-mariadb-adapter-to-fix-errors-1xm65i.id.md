# Startup MariaDB Andal

**Cabang Fitur:** feature-mature-mariadb-adapter-to-fix-errors-1xm65i

## Menunggu MariaDB siap

Cognis kini mencoba ulang kegagalan koneksi MariaDB sementara dalam jendela startup terbatas, alih-alih menggagalkan migrasi saat inisialisasi database. Deployment mengikuti rilis container MariaDB stabil terbaru, sementara pemeriksaan kesehatannya memberi MariaDB waktu inisialisasi yang lebih lama. Container baru selalu membuat kata sandi root acak dan meningkatkan tabel sistem database secara otomatis; deployment tidak lagi menerima kata sandi root yang ditentukan pengguna. MariaDB kini menghasilkan tipe string yang dapat diindeks untuk kolom kunci asing, serta perbaikan skema MariaDB dan PostgreSQL mempertahankan batasan dan melaporkan perbaikan yang gagal. Skema notifikasi internal kini menggunakan pengenal portabel `is_read` agar MariaDB tidak menafsirkan kolom status baca sebagai sintaks SQL. MariaDB kini memperlakukan setiap kolom teks yang diindeks secara eksplisit sebagai string yang dapat diindeks dan memperbaiki kolom `TEXT` yang sudah dibuat sebelum membuat indeksnya, sehingga mencegah kegagalan startup akibat kunci yang terlalu besar. MariaDB juga mengonversi nilai ISO 8601 hanya untuk kolom stempel waktu yang dideklarasikan dalam skema, sehingga mencegah nilai `DATETIME` pendaftaran yang tidak valid tanpa mengubah data teks. Skema SQL mentah kini mendapat perlindungan yang sama: perintah yang ditolak karena nilai waktu dicoba sekali lagi dengan nilai waktu MariaDB yang dinormalisasi. Eksekutor skema autentikasi SQL mentah mandiri untuk MariaDB, PostgreSQL, dan SQLite telah dihapus. Pemeriksaan arsitektur kini memastikan kode produksi menggunakan pembungkus gateway DB dan membatasi eksekusi pernyataan mentah pada gateway DB serta titik masuk eksekutor pemiliknya.

## Komit

- [34bbe100](https://github.com/Cognis-Labs-HQ/Cognis/commit/34bbe10095d802269dd2beb66b3d30853b459063)
- [43d363ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/43d363ae93b555b6d4bbbc06177aa4c5474f9287)
- [09c787ee](https://github.com/Cognis-Labs-HQ/Cognis/commit/09c787eebba30e4c38fda39b3f0bc60a76028f77)
- [fed2f599](https://github.com/Cognis-Labs-HQ/Cognis/commit/fed2f599a47a100cb3367a25fa637fa720679d76)
- [15ed1e6e](https://github.com/Cognis-Labs-HQ/Cognis/commit/15ed1e6e57bf03459e5b905598c9d8bab227fe2e)
- [3eb5682a](https://github.com/Cognis-Labs-HQ/Cognis/commit/3eb5682a932b611ef3f65357c3d5523037ee7756)
- [31881fb2](https://github.com/Cognis-Labs-HQ/Cognis/commit/31881fb29340bac55ddc78eb149caeec13fa22ae)
