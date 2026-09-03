# Landasan panggilan video untuk Messages

**Cabang Fitur:** feature-expose-voip-calling-capability-in-messages-page

## Tindakan panggilan percakapan yang netral terhadap penyedia

Percakapan langsung dan grup kini menampilkan tindakan kamera video yang aksesibel ketika penyedia VoIP peramban tersedia. Tindakan tersebut mengirim seluruh keanggotaan ruang dan permintaan tampilan gambar-dalam-gambar melalui alur ctx bertahap tanpa mengikat Messages ke Jitsi.

## Penyedia VoIP modul dimuat sebelum Messages

Modul eksternal kini dapat mendeklarasikan kapabilitas peramban pada plug-in navigasi terdaftarnya. Cognis menyertakan skrip tersebut dalam penemuan penyedia kapabilitas sehingga Jitsi dapat menyediakan `voip:startCall` sebelum Messages memeriksa ketersediaan dan merender tindakan kamera video.

## Tindakan VoIP per ruang

Messages kini meminta tindakan kepada penyedia untuk setiap ruang. Penyedia dapat menyembunyikan panggilan, meminta jendela komponen milik host dengan konteks rapat, atau mengarahkan ke rapat yang sudah ada. Panggung komponen sementara dihapus setelah ditutup, sedangkan kegagalan peluncuran dicatat dan ditampilkan sebagai toast tanpa mengubah tinggi percakapan.

## Panggilan sebaris berpindah rapi ke gambar-dalam-gambar

Komponen panggilan kini terbuka di antara area tajuk utas dan daftar pesan, selaras dengan pendekatan jendela komponen tertanam pada papan tulis rapat. Kontrol kembali di kiri atas memindahkan panggilan ke gambar-dalam-gambar, memulihkan tata letak Messages yang normal, dan tidak meninggalkan panggung usang setelah panggilan ditutup.

## Gaya tombol bertahan setelah Meetings

Gaya tombol konsekuensi bersama kini berada dalam lembar gaya pakai ulang tersendiri dan tetap dimuat untuk shell dasbor. Saat meninggalkan Meetings, hanya gaya khusus rutenya yang dibongkar sehingga tombol netral pada menu samping dan tindakan mempertahankan bingkai, warna, status sorot, dan status nonaktif di setiap halaman tujuan.

## Gaya berversi dimuat ulang setelah pembersihan SPA

Kesiapan lembar gaya SPA kini disimpan berdasarkan jalur yang dinormalisasi, bukan URL berversi lengkap. Ketika CSS rute dihapus saat meninggalkan Meetings, halaman berikutnya dapat memuat ulang lembar gaya page-builder berversi yang sama alih-alih memakai promise lama yang sudah selesai dan dirender dengan gaya yang tidak lengkap.

## Panggilan berdering dimiliki adapter Call

Adapter Call baru kini mengelola otorisasi ruang, status undangan, batas waktu 45 detik untuk panggilan tanpa jawaban, jawaban, penutupan panggilan, notifikasi, dan penyerahan ke penyedia VoIP. Memulai panggilan langsung mengganti percakapan dengan layar berdering dan mengaktifkan kontrol kamera; penerima memperoleh notifikasi persisten dengan tindakan Jawab. Pertemuan baru dimulai setelah diterima, dan tombol panah terpisah memindahkan komponen ke gambar-dalam-gambar.

## Keputusan panggilan masuk tetap terlihat

Panggilan masuk kini tetap berada di area notifikasi singkat dengan kontrol Jawab hijau dan Tolak merah, bukan muncul di daftar lonceng notifikasi. Messages memindahkan ruang yang berdering ke posisi teratas bilah samping untuk sementara, lalu mengembalikan posisi aslinya ketika panggilan berakhir. Penelepon dan penerima memperoleh umpan balik khusus untuk pembatalan, penolakan, batas waktu, dan penolakan penyedia.

## Riwayat panggilan dan nada dering

Transisi siklus hidup panggilan kini disimpan sebagai peristiwa ruang yang terlihat oleh setiap peserta. Adapter Call memainkan nada masuk dan keluar berulang yang berbeda selama undangan berdering, dan penelepon yang membatalkan undangannya sendiri tidak lagi menerima pesan penolakan panggilan yang menyesatkan.

## Peristiwa berdering interaktif di ruang

Undangan berdering saat ini kini muncul sebagai kartu panggilan dalam riwayat ruang. Penerima dapat menjawab atau menolak dengan kontrol SVG berwarna sesuai konsekuensi, penelepon melihat status berdering, dan entri otomatis menjadi peristiwa riwayat biasa setelah status berubah atau panggilan yang lebih baru dimulai. Prompt persisten bertahan selama navigasi shell dan nada dering menggunakan denyut yang lebih kuat.

## Penyerahan PiP stabil dan panggilan menonjol

Pemindahan pertemuan ke gambar-dalam-gambar kini hanya dilakukan sekali sehingga ukuran jendela pilihan pengguna tetap dipertahankan. Messages segera memulihkan dan menggambar ulang percakapan, menyembunyikan panah, dan menonaktifkan tindakan kamera hingga komponen ditutup. Kartu panggilan masuk aktif kini memiliki latar berbayang dan batas animasi, sedangkan peristiwa lama tidak mempertahankan kontrol jawab atau tolak.

## Jendela PiP bertahan selama navigasi SPA

Jendela komponen mengambang kini dipindahkan ke shell dokumen persisten dan dapat melepaskan diri secara eksplisit dari siklus hidup halaman pemanggil. Navigasi SPA membuang jendela komponen biasa tetapi mempertahankan panggilan PiP hingga ditutup secara eksplisit. Pembongkaran popover kini memeriksa status lapisan atas sebelum menyembunyikan, sehingga mencegah NotSupportedError ketika beforetoggle mengubah status popover.

## Pembongkaran panggilan milik penyedia

Panggilan PiP yang dipertahankan kini memindahkan panggung milik broker bersama jendela komponen, sehingga ID panggung stabil yang diharapkan Jitsi Meet tetap tersedia. Ketika peserta keluar, dikeluarkan, atau konferensi berakhir, Jitsi dapat menemukan panggung induk dan memanggil `component-pages:discard`; Cognis kemudian menghapus panggung panggilan sementara tanpa menunggu pembersihan SPA.

## Pemulihan panggilan berdasarkan ruang

Messages kini memeriksa panggilan berdering atau aktif yang sudah ada di setiap ruang sebelum merender tindakan kamera. Panggilan aktif menampilkan status kamera aktif dan langsung tersambung kembali saat dipilih, termasuk setelah penyegaran. Panggilan berdering dilanjutkan atau dijawab tanpa membuat undangan kedua, dan server mengulangi pemeriksaan saat pembuatan untuk mencegah panggilan silang ketika klik terjadi bersamaan.

## Serah terima penelepon yang andal dan filter modul terisolasi

Mulai panggilan dan jawaban notifikasi kini mempertahankan izin aktivasi pengguna sekali pakai selama pensinyalan asinkron, sehingga kedua peserta dapat memasang komponen Jitsi saat undangan menjadi aktif. Filter bilah samping modul juga mempertahankan keadaan tidak aktif tanpa bingkai ketika penyedia memuat gaya tombol bersama selama panggilan.

## Panggilan berulang dan PiP yang dapat dikembalikan

Panggilan grup kini dimulai setelah undangan pertama menjawab, mengizinkan undangan lain bergabung kemudian, dan dilepas setelah peserta terakhir keluar agar tindakan kamera berikutnya memanggil semua orang lagi. Opsi pemunculan jendela mengambang dapat meminta kontrol tutup transparan sebagian; Messages menggunakannya untuk mengembalikan panggilan aktif yang sama dari PiP ke tahap komponen. `allowNavigation` yang dideklarasikan penyedia kini hanya dihormati saat panggilan mengambang dalam PiP dan dicabut ketika panggilan kembali tertanam.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9b6cc0e4d3118f80765af56f2b503c0e73aa1c10
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fddbcbf8999173159b88ee4efddf284e426b9a67
- https://github.com/Cognis-Labs-HQ/Cognis/commit/9c16bf732cf74c071bc41201a303f57d3f561e30
- https://github.com/Cognis-Labs-HQ/Cognis/commit/69e21d58c8f04c27848c9b646672d6a436891d2c
- https://github.com/Cognis-Labs-HQ/Cognis/commit/2b179ef3cd20fab51af1eac5fa36506bf46021c6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/3b62797540e433c07ee81751a58e327085f01739
- https://github.com/Cognis-Labs-HQ/Cognis/commit/0e7ff946
- https://github.com/Cognis-Labs-HQ/Cognis/commit/60ad8491
- https://github.com/Cognis-Labs-HQ/Cognis/commit/bbcc6537
- https://github.com/Cognis-Labs-HQ/Cognis/commit/263c98cc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/92f46be7
- https://github.com/Cognis-Labs-HQ/Cognis/commit/14d4fbd5
- https://github.com/Cognis-Labs-HQ/Cognis/commit/a6d746bb
- https://github.com/Cognis-Labs-HQ/Cognis/commit/53dee857
- https://github.com/Cognis-Labs-HQ/Cognis/commit/630ac8d9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/4e75f696
- https://github.com/Cognis-Labs-HQ/Cognis/commit/59245f23
- https://github.com/Cognis-Labs-HQ/Cognis/commit/86cbe55e587061e6dd58927c20dd5c1fee530be9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/7fa6ee9910ab1da664c9992dd88b5659fe0af400
- https://github.com/Cognis-Labs-HQ/Cognis/commit/930a3b084240205cd1e9ab4124e1bbfdbf6d2f52
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d4306538a8b51362f0c603c84c280eb3c00ce18d
