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

## Navigasi PiP stabil dan gaya yang dipertahankan

Cognis kini membaca izin navigasi penyedia Jitsi dari konteks komponen dan menerapkan ukuran minimum PiP yang diminta. Gaya rute tetap terpasang selama navigasi SPA, sedangkan Social Call memakai nama kelas khusus kapabilitas agar rapat PiP aktif mempertahankan seluruh gayanya tanpa membocorkan aturan tahap panggilan ke halaman lain.

## Instalasi image lebih cepat dan deterministik

Instalasi serta pemangkasan dependensi image produksi kini melewati permintaan jaringan audit dan pendanaan npm. Build Docker tidak lagi menunggu endpoint registri opsional setelah seluruh paket selesai diekstrak dan tidak lagi menimpa konfigurasi proksi dengan kunci lingkungan npm yang tidak didukung.

## Penyelarasan capability Jitsi lengkap

Messages kini menerbitkan resolver keanggotaan ruang yang diwajibkan manifest Jitsi Meet saat ini. Capability memvalidasi bahwa pemohon adalah anggota aktif dan hanya mengembalikan ID akun ruang aktif, sehingga Jitsi dapat mengizinkan pembuatan rapat VoIP sekali pakai tanpa mengakses penyimpanan Messages secara langsung.

## Konfigurasi modul nonaktif tetap tersedia

Core kini memuat entrypoint modul eksternal nonaktif dalam konteks terbatas yang hanya menerima rute yang secara eksplisit ditandai untuk operasi nonaktif. Endpoint konfigurasi Jitsi dapat dibuka sebelum aktivasi, sedangkan rute fitur, kontribusi UI, flow, dan capability tetap tidak aktif.

## Katalog capability UI host lengkap

Core kini mengumumkan capability browser untuk memunculkan halaman komponen, membuang halaman komponen, dan jendela mengambang melalui registri penyedia UI. Aktivasi modul dapat memvalidasi setiap capability yang dideklarasikan manifest Jitsi Meet saat ini tanpa menolak kontrak browser milik Core tersebut, dan pemuatan penyedia mengimpor bundel router yang memasangnya.

## Tindakan notifikasi dan flow Messages yang netral terhadap penyedia

Notifikasi internal kini merender label tindakan dan SVG yang telah disanitasi dari produsen melalui kontrak notifikasi berkelanjutan yang netral. Messages memiliki flow tindakan ruang generik yang diperluas Calls, sehingga pengetahuan statis tentang Call dihapus dari Messages. Nada dering memakai pola denyut ganda yang lebih panjang.

## Penemuan ruang khusus pengguna

Pemilih Ruang Baru di Messages kini meneruskan kategori pengguna dan filter tipe milik utilitas pencarian bersama, sesuai dengan parameter pencarian terfilter Jitsi Meet dan mengecualikan tipe hasil lain.

## Status pencarian yang responsif

Pencarian kini mengganti petunjuk panjang minimum dengan status pemuatan segera setelah kueri yang memenuhi syarat dijalankan. Permintaan yang gagal atau melewati batas waktu menampilkan galat yang jelas, bukan membiarkan hasil lama atau petunjuk yang tidak responsif.

## Prompt panggilan masuk yang tersinkronisasi

Panggilan masuk kini muncul dalam bilah tepat di atas tajuk utas Messages. Jawab dan Tolak menyelesaikan notifikasi berkorelasi serta prompt dalam obrolan bersama-sama, sedangkan lease dering per pengguna mencegah beberapa tab atau permukaan memutar nada dering ganda.

## Bilah panggilan terlihat dan PiP terfokus

Status panggilan masuk kini menyegarkan ruang terpilih sehingga bilah tindakannya muncul tepat di bawah tajuk utas sementara notifikasi dapat tetap terlihat. Komponen VoIP yang dimunculkan ditandai secara eksplisit dengan konteks `voipCall` Jitsi Meet agar chat rapat tidak tampil pada permukaan PiP.

## Pembongkaran PiP yang aman

Saat panggilan VoIP dalam PiP ditutup, hierarki portal asal kini divalidasi dan memakai jalur cadangan dengan aman jika peramban menolak pemindahan atomik penjaga status. Pembongkaran komponen selesai tanpa `HierarchyRequestError` yang tidak tertangani.

## Panggung panggilan tertambat setinggi penuh

Panggilan penyedia yang tertambat kini memakai seluruh sisa tinggi kartu widget Messages. Utas aktif menyusut menjadi baris tajuk dan panggung panggilan, sedangkan panggung, host komponen, serta jendela komponen meregang memenuhi baris konten yang tersedia.

## Pembersihan dering andal dan kembali dari gambar-dalam-gambar

Permintaan lease dering yang terlambat kini berhasil dengan hasil tanpa dering setelah panggilan berakhir. Menutup panggilan dari gambar-dalam-gambar setelah navigasi SPA menawarkan Kembali ke Messages, Tutup Panggilan, dan Batal dengan gaya tindakan yang sesuai konsekuensi. Kembali akan bernavigasi ke ruang panggilan dan memulihkan komponen penyedia yang ada tanpa memasangnya ulang.

## Kontrol tutup gambar-dalam-gambar yang stabil

Tindakan tutup gambar-dalam-gambar kini menyimpan panggilan aktif dalam siklus hidup stage sehingga menghapus `ReferenceError` setelah navigasi. Kontrol tutup kembali menggunakan ukuran standar jendela mengambang dan kini memakai kelas destruktif `btn-cancel`.

## Keluar idempoten dan persistensi gambar-dalam-gambar berulang

Pembongkaran penyedia yang terlambat tidak lagi melaporkan kesalahan ketika server telah mengakhiri panggilan. Keluar kini berhasil secara idempoten dan pembersihan menekan kondisi balapan panggilan-tidak-tersedia yang telah diketahui. Setelah kembali ke Messages, perpindahan kedua ke gambar-dalam-gambar kini mempertahankan panggilan selama navigasi SPA berikutnya.

## Perbaikan keamanan, siklus hidup, dan rangkaian pengujian

Perenderan panggilan kini memasukkan label yang dikendalikan peserta melalui simpul teks, operasi panggilan memvalidasi ulang keanggotaan Messages saat ini, ruang yang diarsipkan dikecualikan, peserta grup aktif didaftarkan, penolakan perpanjangan dering menghentikan audio, pembatalan polling keluar membatalkan undangan, dan kontrak penyedia mempertahankan jenis ruang sebenarnya. Teks panggilan masuk disediakan dalam semua bahasa yang didukung melalui metadata notifikasi netral. Pencocok pencarian bersama dipisah menjadi modul hasil API khusus untuk memenuhi batas 1.000 baris, dan pengujian Messages, notifikasi, serta string hardcode yang usang diperbaiki tanpa menghapus baris baru.

## Ikon panggilan mandiri yang dapat digunakan kembali

SVG tindakan panggilan kini berada dalam file aset milik adapter Call. Aset video yang sama menyediakan tindakan ruang Messages, sedangkan kontrol jawab dan tolak di notifikasi serta ruang menggunakan kembali aset yang sesuai tanpa menyematkan markup SVG dalam kode sumber.

## Integrasi riwayat panggilan terisolasi

Messages kini menyediakan capability persistensi peristiwa ruang yang generik dan flow pemformatan bertahap. Calls memiliki serta menyuntikkan jenis peristiwa, teks terlokalisasi, dan tampilannya sehingga store, renderer, dan sumber bahasa Messages tidak lagi memuat kontrak khusus panggilan.

## Siklus hidup panggilan dan modul diperkuat

Panggilan aktif kini hanya dapat diakhiri peserta yang sudah bergabung, pemanggil dan undangan bergabung kembali ke pensinyalan sebelum tersambung ulang, serta kegagalan keluar mempertahankan status bergabung yang dapat dicoba kembali. Calls memiliki penerjemahan notifikasi ke status ruang, label Meeting Window yang berulang telah dihapus, modul nonaktif memakai titik masuk konfigurasi terisolasi tanpa menjalankan bootstrap normal, ekspor hasil API didokumentasikan lengkap, dan flow peristiwa ruang memakai camel case.

## Komit

- [6bf285c](https://github.com/Cognis-Labs-HQ/Cognis/commit/6bf285c42a978273d039d2547d17e827512f4b26)
- [ea66545](https://github.com/Cognis-Labs-HQ/Cognis/commit/ea665452e791853c2fd72b8dfa141b0a7a1f1ecb)
- [968d9fb](https://github.com/Cognis-Labs-HQ/Cognis/commit/968d9fb49a0df9e137ab7ab0606b5950ef759e26)
- [9b6cc0e](https://github.com/Cognis-Labs-HQ/Cognis/commit/9b6cc0e4d3118f80765af56f2b503c0e73aa1c10)
- [fddbcbf](https://github.com/Cognis-Labs-HQ/Cognis/commit/fddbcbf8999173159b88ee4efddf284e426b9a67)
- [9c16bf7](https://github.com/Cognis-Labs-HQ/Cognis/commit/9c16bf732cf74c071bc41201a303f57d3f561e30)
- [69e21d5](https://github.com/Cognis-Labs-HQ/Cognis/commit/69e21d58c8f04c27848c9b646672d6a436891d2c)
- [2b179ef](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b179ef3cd20fab51af1eac5fa36506bf46021c6)
- [3b62797](https://github.com/Cognis-Labs-HQ/Cognis/commit/3b62797540e433c07ee81751a58e327085f01739)
- [86cbe55](https://github.com/Cognis-Labs-HQ/Cognis/commit/86cbe55e587061e6dd58927c20dd5c1fee530be9)
- [7fa6ee9](https://github.com/Cognis-Labs-HQ/Cognis/commit/7fa6ee9910ab1da664c9992dd88b5659fe0af400)
- [930a3b0](https://github.com/Cognis-Labs-HQ/Cognis/commit/930a3b084240205cd1e9ab4124e1bbfdbf6d2f52)
- [d430653](https://github.com/Cognis-Labs-HQ/Cognis/commit/d4306538a8b51362f0c603c84c280eb3c00ce18d)
- [55fe7ac](https://github.com/Cognis-Labs-HQ/Cognis/commit/55fe7acc297c636ffa38791b448775f62b063159)
- [734aa1e](https://github.com/Cognis-Labs-HQ/Cognis/commit/734aa1e505f092db36fe2853ada1515ac0f0712a)
- [b6e47c6](https://github.com/Cognis-Labs-HQ/Cognis/commit/b6e47c6553f8b24ae90e42631e3712617082c7a6)
- [ff335be](https://github.com/Cognis-Labs-HQ/Cognis/commit/ff335be25d9d3858ae287ec0d84ee7c041fbc635)
- [81b69dd](https://github.com/Cognis-Labs-HQ/Cognis/commit/81b69ddc13d7ffba92acfaa9e3067907bfa0b55b)
- [e9735b3](https://github.com/Cognis-Labs-HQ/Cognis/commit/e9735b3df0ec8a939a9598eadc7d3681fa512594)
- [6c387ba](https://github.com/Cognis-Labs-HQ/Cognis/commit/6c387ba7c86b8218a9dc9b43211e5f0a95845a1d)
- [aa9c83f](https://github.com/Cognis-Labs-HQ/Cognis/commit/aa9c83fcc501bfede1e9d392a2dbdd9e7a6e943e)
- [87e5e5e](https://github.com/Cognis-Labs-HQ/Cognis/commit/87e5e5e0d7ee3403d421fbe099e94425932a3a4e)
- [d3d242f](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3d242f8921775d346b655c2699d3e174c6e4373)
- [fa2b598](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa2b5983f609ce6932d5ded0aa5f3c24afead9ca)
- [e2b9683](https://github.com/Cognis-Labs-HQ/Cognis/commit/e2b9683158388267faea8ede560a681c45518ba9)
- [738a98d](https://github.com/Cognis-Labs-HQ/Cognis/commit/738a98d449247b89ce94cfda908042dbe8c28043)
- [ea5a087](https://github.com/Cognis-Labs-HQ/Cognis/commit/ea5a087cdcc7d7cce9ece27fff4d90353c7e8fe7)
- [5e89962](https://github.com/Cognis-Labs-HQ/Cognis/commit/5e8996297422cc379e6747e980fcd613a482716f)
- [e7560ca](https://github.com/Cognis-Labs-HQ/Cognis/commit/e7560cabcb987acf49dbbfdc74a1135755ce3713)
