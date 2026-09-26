# Latihan Menulis

## Tujuan

Adapter Drawing menyediakan `study:drawing:open` melalui `uiCtx` peramban. Pemanggil memberikan kartu Library lengkap beserta `strokePattern` tervalidasi; adapter membuka papan tulis PiP yang dapat dipindahkan dan diubah ukurannya.

## Model latihan

Papan menerima pena, sentuhan, dan tetikus, menegakkan urutan goresan dari penyedia, menilai arah serta kedekatan jalur, dan mengganti setiap masukan yang diterima dengan goresan kanonis milik penyedia. Pada awal percobaan, semua goresan terlihat. Setelah goresan pertama diterima, papan hanya menampilkan goresan berikutnya yang diperlukan sambil mempertahankan goresan kanonis yang sudah selesai.

Goresan salah menghasilkan umpan balik merah yang lembut tanpa memulai ulang animasi pembukaan papan. Saat karakter selesai, aplikasi memainkan bunyi keberhasilan singkat dan menampilkan lapisan penyelesaian stabil berisi tanda centang, jumlah kesalahan percobaan, serta tindakan Tutup dan Coba Lagi. Coba Lagi memulai percobaan baru dengan semua panduan terlihat. Masukan penunjuk digambar paling banyak sekali per bingkai animasi agar kanvas tetap stabil.

Judul diukur mengikuti kanvas yang dirender dan dipusatkan tepat di atasnya. Teks kartu dan definisi terlokalisasi tetap sejajar, dan tombol tutup seukuran konten memakai animasi penutupan khusus.

Tampilan panduan pertama memberi nomor pada setiap goresan dan menunjukkan arahnya. Sepuluh kesalahan berturut-turut mengakhiri percobaan dengan hasil gagal. Percobaan berhasil dengan paling banyak satu kesalahan meningkatkan tingkat kesulitan kartu tersebut dalam memori untuk percobaan berikutnya, dan pad yang terbuka dapat langsung beralih ke kartu Pustaka lain.

Panduan lengkap hanya muncul sebelum percobaan pertama sebuah kartu atau setelah pengguna menekan tindakan atur ulang **?**. Mencoba lagi mempertahankan panduan progresif. Pola gabungan membawa batas tiap bagian sehingga setiap karakter yang baru dicapai memperoleh satu pratinjau beranotasi lengkap.
