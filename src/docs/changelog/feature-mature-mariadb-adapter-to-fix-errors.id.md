# Startup MariaDB Andal

## Menunggu MariaDB siap

Cognis kini mencoba ulang kegagalan koneksi MariaDB sementara dalam jendela startup terbatas, alih-alih menggagalkan migrasi saat inisialisasi database. Deployment mengikuti rilis container MariaDB stabil terbaru, sementara pemeriksaan kesehatannya memberi MariaDB waktu inisialisasi yang lebih lama. Container baru selalu membuat kata sandi root acak dan meningkatkan tabel sistem database secara otomatis; deployment tidak lagi menerima kata sandi root yang ditentukan pengguna. MariaDB kini menghasilkan tipe string yang dapat diindeks untuk kolom kunci asing, serta perbaikan skema MariaDB dan PostgreSQL mempertahankan batasan dan melaporkan perbaikan yang gagal. Skema notifikasi internal kini menggunakan pengenal portabel `is_read` agar MariaDB tidak menafsirkan kolom status baca sebagai sintaks SQL.
