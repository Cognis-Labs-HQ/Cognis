# Penemuan Modul Andal

## Lewati repositori tidak valid

Marketplace Modul kini mengabaikan repositori yang tidak menyediakan manifes modul yang lengkap dan valid. Satu repositori yang tidak terkait atau sumber yang tidak tersedia tidak lagi dapat menggagalkan pemuatan halaman Modul.

## Gunakan ikon pengganti

Kartu modul kini mengganti gambar eksternal yang tidak tersedia dengan ikon tanda tanya yang sesuai tema tanpa membuka popup kesalahan runtime.

## Segarkan sumber modul

Halaman Modul kini menyediakan kontrol Segarkan di samping Sumber Modul untuk meminta ulang setiap penyedia yang dikonfigurasi dan membangun kembali katalog yang terlihat.

## Kelola dan temukan sumber secara bertahap

Sumber Modul kini terbuka sebagai pengelola daftar dan editor khusus. Organisasi tepercaya bawaan tetap terlihat dan hanya-baca, sedangkan sumber khusus dapat ditambah, disunting, atau dihapus. Halaman Modul langsung menampilkan modul yang sudah diketahui dan menambahkan hasil secara independen saat setiap sumber yang dikonfigurasi merespons.

## Pilih cabang dan deteksi pembaruan

Detail marketplace kini menampilkan setiap cabang repositori dan otomatis memilih cabang bawaan. Instalasi mencatat cabang dan commit yang dipilih sehingga kartu dan detail modul dapat menawarkan tindakan Perbarui saat cabang tersebut berubah.

## Sajikan gambar marketplace dengan aman

Gambar marketplace kini diambil oleh server dan disajikan melalui URL asal sama yang sulit ditebak. Gambar yang hilang memakai ikon tanda tanya bawaan tanpa melonggarkan Content Security Policy.

## Kurasi modul rekomendasi

Status rekomendasi kini berasal dari daftar UUID terbitan yang dapat dikonfigurasi administrator, bukan dari manifes modul. Pengaturan marketplace kini memuat konfigurasi rekomendasi dan sumber.

## Selesaikan instalasi modul

Modul yang dipasang langsung diimpor ke runtime dan tetap nonaktif sampai administrator mengaktifkannya. Gambar marketplace dimuat melalui URL publik asal sama yang sulit ditebak.

## Sempurnakan detail marketplace

Lisensi ditampilkan terpisah dari tag, detail memakai seluruh lebar hasil, dan kontrol SVG ringkas menggantikan tindakan kembali dan segarkan yang panjang.

## Pisahkan pemasangan dari aktivasi

Modul yang dipasang kini tetap nonaktif sampai administrator mengaktifkannya secara eksplisit. Mengaktifkan atau menonaktifkan modul langsung menyegarkan plugin bilah navigasi agar kontribusi navigasi baru tampil tanpa memuat ulang halaman.

## Sesuaikan kontrol marketplace dengan tema

Kontrol kembali dan segarkan kini memakai aset SVG terang dan gelap khusus yang dipilih sesuai tema dasbor aktif.

## Pertahankan modul yang ditemukan

Manifes marketplace disimpan dalam cache per sumber terkonfigurasi. Mencopot modul segera mengembalikannya ke Tersedia, kegagalan sumber sementara mempertahankan entri cache, dan modul baru menghilang setelah semua sumber terkonfigurasi berhasil memastikan modul tersebut tidak ada.

## Keluarkan core dari daftar modul

Cognis Core tidak lagi dikembalikan oleh daftar administrasi modul karena inti platform bukan modul yang dapat dipasang.

## Verifikasi lisensi yang dinyatakan

Metadata lisensi hanya ditampilkan bila berkas lisensi yang dikenali tersedia di akar repositori. Validasi instalasi menolak metadata lisensi tanpa bukti repositori tersebut.

## Beri waktu untuk pemasangan modul

Pemasangan marketplace kini memakai jendela permintaan dua menit agar kloning dan validasi repositori besar seperti Jitsi Meet tidak gagal karena batas waktu API umum tiga puluh detik.

## Tampilkan semua modul terlebih dahulu

Filter status modul kini memiliki Semua dan memilihnya secara bawaan sehingga modul terpasang, tersedia, dan direkomendasikan tampil bersama saat halaman dibuka.

## Instal rilis dengan umpan balik responsif

Penemuan modul kini menyertakan tag repositori bersama cabang, sementara pemilih detail tetap menggunakan cabang bawaan repositori secara default. Tombol siklus hidup menampilkan indikator proses di dalam tombol, dan instalasi modul memakai batas waktu permintaan dua menit.

## Satukan pengaturan marketplace

Sumber Modul kini hanya tersedia sebagai bagian khusus dalam dialog pengaturan marketplace. Penyedia dan versi dipisahkan dari tag kategori, serta ikon pengaturan mendukung tema terang dan gelap.

## Uji modul sebelum aktivasi

Saat modul diaktifkan, semua pengujian JavaScript dan TypeScript standar yang disediakan checkout modul kini dijalankan sebelum status runtime berubah. Pengujian yang gagal atau kehabisan waktu akan membatalkan aktivasi dan melaporkan kegagalan pengujian modul.

## Sertakan modul eksternal dalam perintah pengujian inti

Perintah utama `npm test` kini menemukan pengujian di pohon sumber Cognis dan akar checkout modul eksternal yang dikonfigurasi. Checkout di luar repositori juga didukung melalui `COGNIS_EXTERNAL_MODULES_ROOT`.
