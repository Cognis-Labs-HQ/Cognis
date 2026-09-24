# Pilihan, filter permintaan, dan penulisan audio Study Library

**Cabang Fitur:** work

## Pilihan jamak yang dapat diprediksi

Ketika semua kartu yang terlihat dipilih, tindakan mengambang berubah menjadi “Batalkan Semua Pilihan”. Membatalkan pilihan atau berpindah halaman SPA kini selalu keluar dari mode pilihan jamak.

## Penelusuran permintaan yang terarah

Halaman Permintaan kini menyediakan filter status dan kepemilikan, sedangkan antrean peninjauan hanya ditampilkan kepada administrator dan pengajar.

## Penulisan kartu yang lebih aman

Audio bersifat opsional dan disimpan dengan kunci deterministik yang berasal dari kartu. Enter pada masukan tag tidak lagi mengirim formulir, kotak centang memakai gaya Cognis, tindakan batal memakai gaya pembatalan, dan catatan lapisan karakter tidak dapat dibuat atau disunting.

## Pengguliran Library alami

Tampilan Library kini menggunakan perilaku pengguliran alami dari penyusun halaman.

## Perancang kartu komposit terpandu

Kartu komposit kini memakai carousel horizontal berurutan untuk setiap lapisan relasi. Tindakan buat selalu terlihat dan dapat membuka penyusun kartu bertingkat, sehingga komponen yang belum ada dapat dibuat tanpa menghilangkan draf induk. Komposisi teks bebas menampilkan komponen yang cocok dan menandai teks yang belum cocok.

## Visibilitas komposisi dan pemutaran audio yang aman

Layanan kini menolak komposit bila bagian yang dirujuk tidak terlihat pada tujuan komposit. Placeholder audio lama yang tidak valid tidak lagi memicu permintaan audio yang gagal.

## Tombol Pilih Semua yang andal

Pilih Semua kini memiliki status tindakan eksplisit dan tidak lagi menyimpulkan perilaku klik dari status kotak centang. Aktivasi pertama memilih semua kartu yang terlihat dan mengubah tindakan menjadi Batalkan Semua Pilihan; hanya tindakan tersebut yang keluar dari mode pilihan jamak. Deteksi kartu terlihat kini berlaku untuk kartu pelajar maupun baris administrasi.

## Pembuatan lapisan dan teks tak cocok terpandu

Alur pembuatan kini dimulai dengan pemilih jenis kartu yang diizinkan. Teks bebas yang belum cocok dapat langsung dipilih untuk membuka penyusun bertingkat yang sesuai, dengan teks tersebut sudah disalin ke label kartu.

## Penyuntingan berbasis cakupan dan tinjauan pembaruan

Baris administrasi kini hanya membuka penyunting administrasi dan tetap memiliki kontrol sunting independen. Dialog detail pengguna menampilkan tindakan sunting di kanan atas hanya untuk catatan yang memenuhi syarat: pemilik dapat menyunting kartu sendiri, administrator dapat menyunting kartu global, dan konten penyedia yang dilindungi tetap tidak dapat diubah. Perubahan penulis pada kartu global disimpan sebagai permintaan pembaruan dan baru diterapkan setelah disetujui. Halaman Permintaan membedakannya dan menyimpan riwayat status selesai.

## Ketersediaan tindakan buat

Setiap lapisan pengguna selain karakter kini menyediakan tindakan buat. Konstruktor generik berbasis skema digunakan bila penyedia tidak memasok konstruktor khusus.

## Penyedia bahasa yang dinonaktifkan langsung disembunyikan

Study kini mencocokkan preferensi bahasa belajar yang tersimpan dengan registri penyedia aktif milik gateway sebelum merender pengaturan, kartu dasbor, grup pencarian, atau subhalaman. Penyedia yang dinonaktifkan hilang dari Bahasa Aktif dan dasbor Study tanpa menghapus preferensi tersimpan, sehingga muncul kembali secara alami ketika administrator mengaktifkannya lagi.

## Kontrol kelas dan penyuntingan yang terlihat

Detail komposit dan kalimat berurutan kini selalu menampilkan pil kelas yang mudah dipahami, termasuk fallback Composite untuk catatan lama tanpa kelas tersimpan. Administrasi Library kembali menampilkan kontrol sunting untuk setiap catatan yang terlihat dan mengizinkan administrator menyunting catatan yang dikelola penyedia dari sana. Kartu pelajar menampilkan tindakan sunting ketika server memberikan izin, dan popup detail yang memenuhi syarat menyediakan tindakan sama di kanan atas. Petunjuk izin dari server menjaga penyuntingan global administrator, penyuntingan pemilik, dan pembaruan penulis yang memerlukan tinjauan tetap konsisten tanpa bergantung pada status peran browser yang usang.

## Kapasitas payload keyring diperluas

Kapasitas bawaan brankas keyring terenkripsi kini menjadi 2.000 MiB, seribu kali lipat dari batas lama 2 MiB, sehingga rahasia terenkripsi berukuran besar yang memuat audio dapat disimpan tanpa respons 413.

## Penulisan dan penyuntingan kartu terstruktur

Kontrol sunting kartu kini hanya muncul di dialog detail dan memakai aset sunting yang mengikuti tema. Editor yang lebih lebar memisahkan konten, hubungan, dan definisi agregat ke dalam tab; definisi terlokalisasi menyediakan semua bahasa antarmuka yang didukung dan definisi tertaut dapat disunting langsung. Pembuatan kini menghasilkan label dari bagian komposisi yang telah diselesaikan, mewajibkan teks yang belum cocok untuk diselesaikan atau dibuat, memulihkan gaya karosel horizontal, dan memperbesar tindakan buat yang mengikuti tema.

## Kontrol pembuatan disempurnakan

Tindakan buat Library mempertahankan ukuran tombol normal dan hanya menggandakan ukuran tanda tambah. Tab pembuatan kini diinisialisasi dengan benar, cakupan pengguna menjadi bawaan, administrator yang berhak dapat memilih publikasi global, dan pengajar hanya melihat opsi publikasi kelas untuk kelas yang dapat ditulis dalam bahasa aktif. Kelas konten memakai dropdown sesuai peran hanya saat relevan, bidang komposisi bernama Input, dan memfokuskannya menampilkan karosel hubungan.

## Komposisi permanen yang lebih cerdas

Koleksi hubungan kini menampilkan semua item tanpa bilah gulir atau panah arah. Pratinjau hover menampilkan kartu minimal beserta definisi dalam bahasa antarmuka saat ini, sedangkan pilihan karosel dan saran teks bebas langsung menjadi blok Input yang dapat diseret. Mengurutkan ulang blok memperbarui urutan hubungan, konten terpilih menyimpulkan referensi terkait, pelafalan menelusuri unit tulisan yang dirujuk, dan pembuatan definisi meminta setiap bahasa antarmuka yang didukung.

## Alur komposisi terpadu

Kartu yang telah diselesaikan kini berada di dalam Input, pelafalan diperbarui saat mengetik, label karusel duplikat disatukan, dan pratinjau tidak lagi terpotong oleh dialog. Hubungan menggunakan hierarki hanya-baca, definisi dapat dibuat sebagai set semua bahasa yang dapat diulang, penerbitan memberikan panduan peninjauan yang lebih jelas, dan penulis pengguna tidak lagi melihat kontrol administratif Tersembunyi.

## Kartu dengan gambar dan definisi aman

Rekaman definisi kini hanya dapat dibuat sebagai anak tertaut dari kartu lain, dan penutupan penyusun memakai perlindungan kehilangan data bersama. Kontrol pengeras suara ringkas hanya memutar rangkaian audio komposit lengkap jika setiap komponen tersedia. Kontrak pola goresan tervalidasi baru mendukung adapter menggambar PiP dengan penilaian urutan goresan, progres langsung, urungkan/atur ulang, dan panduan yang dapat disesuaikan.

## Commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/7d00b6a7c8e6c0eaaf5315d595618f33c32dc3dc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/0c9c4e376ffde5af485772367430d3122b589b0e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/32ca0df41b363566394ac0d4026ec73ed53ce9ae
- https://github.com/Cognis-Labs-HQ/Cognis/commit/a66d08376445e937ea0e57d64c5975c9c02ed504
- https://github.com/Cognis-Labs-HQ/Cognis/commit/800b1809b0378fcf6aaa480461d0e22b703c2ca4
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ea81a944257040a042c1d0c0c9b2447768390221
- https://github.com/Cognis-Labs-HQ/Cognis/commit/3b51abc17cc6ed3a75921bfa242d16c33aae2ce0
- https://github.com/Cognis-Labs-HQ/Cognis/commit/2e2d092813312978c2f69640389f6401ec0230f5
- https://github.com/Cognis-Labs-HQ/Cognis/commit/cff7223cd64c36372e64484c362ba9b1a1f4e2f7
- https://github.com/Cognis-Labs-HQ/Cognis/commit/bbb6bb8bd8e2d70a6ec571c2a69e58665a90ca04
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e1e564bf66580e7a1e8eaf24080c646f686d982c
- https://github.com/Cognis-Labs-HQ/Cognis/commit/344ccb5b
- https://github.com/Cognis-Labs-HQ/Cognis/commit/40da0c7a
- https://github.com/Cognis-Labs-HQ/Cognis/commit/584fb0b46ebb77bd43e585b3b41a279a0e6e9bfa
