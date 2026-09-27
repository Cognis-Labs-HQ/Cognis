# Latihan Menulis

## Tujuan

Adapter Drawing menyediakan `study:drawing:open` melalui `uiCtx` peramban. Pemanggil memberikan kartu Library lengkap beserta `strokePattern` tervalidasi; adapter membuka papan tulis PiP yang dapat dipindahkan dan diubah ukurannya.

## Model latihan

Papan menerima pena, sentuhan, dan tetikus, menegakkan urutan goresan dari penyedia, menilai arah serta kedekatan jalur, dan mengganti setiap masukan yang diterima dengan goresan kanonis milik penyedia. Pada awal percobaan, semua goresan terlihat. Setelah goresan pertama diterima, papan hanya menampilkan goresan berikutnya yang diperlukan sambil mempertahankan goresan kanonis yang sudah selesai.

Goresan salah menghasilkan umpan balik merah yang lembut tanpa memulai ulang animasi pembukaan papan. Saat karakter selesai, aplikasi memainkan bunyi keberhasilan singkat dan menampilkan lapisan penyelesaian stabil berisi tanda centang, jumlah kesalahan percobaan, serta tindakan Tutup dan Coba Lagi. Coba Lagi memulai percobaan baru dengan semua panduan terlihat. Masukan penunjuk digambar paling banyak sekali per bingkai animasi agar kanvas tetap stabil.

Judul diukur mengikuti kanvas yang dirender dan dipusatkan tepat di atasnya. Teks kartu dan definisi terlokalisasi tetap sejajar, dan tombol tutup seukuran konten memakai animasi penutupan khusus.

Tampilan panduan pertama memberi nomor pada setiap goresan dan menunjukkan arahnya. Sepuluh kesalahan berturut-turut mengakhiri percobaan dengan hasil gagal. Percobaan berhasil dengan paling banyak satu kesalahan meningkatkan tingkat kesulitan kartu tersebut dalam memori untuk percobaan berikutnya, dan pad yang terbuka dapat langsung beralih ke kartu Pustaka lain.

Tindakan panduan **?** mempertahankan goresan yang diterima dan hasil percobaan sambil menampilkan anotasi hanya untuk goresan yang belum selesai. Mencoba lagi mempertahankan panduan progresif. Pola gabungan membawa batas tiap bagian sehingga setiap karakter yang baru dicapai memperoleh satu pratinjau beranotasi lengkap. Arah anotasi dihitung dalam koordinat kanvas yang dirender agar panah tetap akurat pada pola panjang dengan banyak karakter.

Kartu gabungan kini menyusun semua pola unit tulisan dari nilai tulisan utama secara berdampingan dengan skala konsisten dan jarak minimal. Papan gambar melebar agar ukuran karakter tetap terjaga, sedangkan judul ringkasnya menampilkan pelafalan dan definisi yang tersedia.

Papan gambar tetap berada di dalam area pandang, memakai tinggi ringkas yang mengikuti konten, dan membatasi lebarnya hingga empat puluh persen area pandang agar kata yang lebih panjang diperkecil alih-alih menghasilkan jendela terlalu besar. Pengubahan ukuran tidak lagi menukar ukuran minimum papan, dan setiap panduan satu goresan tetap menampilkan anotasi urutan serta arah.

Label anotasi mengevaluasi posisi terdekat di sekitar awal setiap goresan dan memilih tempat pertama yang bebas dari label lain serta semua jalur goresan yang dirender. Dengan demikian, penanda bernomor tetap terbaca dan dekat dengan goresannya tanpa menutupi goresan pengguna yang sudah selesai.

Percobaan berhasil dengan paling banyak satu kesalahan kini meningkatkan kesulitan ingatan khusus kartu dengan menyembunyikan satu panduan goresan tambahan yang dipilih secara acak. Goresan tersembunyi diwakili tanda tanya di sudut kanvas dan tetap divalidasi seperti biasa. Tindakan panduan kanan atas menampilkan goresan tersembunyi untuk percobaan saat ini tanpa menghapus input yang diterima atau mengurangi kesulitan kartu yang telah dipelajari. Penempatan anotasi memilih posisi dekat pertama yang bebas benturan alih-alih memaksimalkan jarak kosong, sehingga label tetap lebih dekat ke awal goresan.
