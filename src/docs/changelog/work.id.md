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

## Adapter Drawing siap diterapkan

Adapter Drawing kini mendeklarasikan titik masuk paket TypeScript dan dependensi gateway Study yang telah diuji, sehingga validasi build server produksi dapat mengimpornya dengan berhasil.

## Komposisi kartu ringkas yang tepat

Karusel hubungan kini menempati tepat dua baris yang bergulir vertikal dan pratinjau hover memakai popup tertambat yang sadar area pandang. Pencocokan tepat seluruh Input menggantikan inferensi per karakter sehingga node hubungan yang tidak terkait tidak muncul. Definisi memakai dialog khusus semua bahasa, bukan karusel atau penyusun kartu bertingkat; kontrol terbitkan/buat, audio sesuai tema, tindakan gambar/edit, dan tooltip juga disempurnakan.

## Gambar adaptif dan karusel horizontal

Karusel dua baris kini bergulir horizontal, data goresan tidak tampil dalam detail kartu, dan mode menggambar menutup dialog asal. Aset gambar serta warna papan yang sesuai tema meningkatkan kontras. PiP yang diskalakan memuat seluruh kanvas dan kontrol, sedangkan penilaian jalur dengan sampel ulang seragam mendukung karakter kompleks dan menyesuaikan panduan otomatis dari tingkat keberhasilan serta umpan balik kesulitan.

## Pengguliran Library dan pembuatan bersarang

Halaman Study Library kini menggunakan pengguliran dokumen alami dan ukuran pratinjau kartu yang konsisten. Pratinjau karusel tetap mengikuti ukuran konten dan menghilang dengan benar, sementara setiap kontrol tambah membuka komposer bersarang yang bertumpuk dengan benar, bertipe terkunci, dan menampilkan tipe kartu pada judulnya. Tindakan buat utama kini memakai gaya standar pengalih tema dan pemilih bahasa.

## Tautan pelafalan lintas relasi

Tautan detail pelafalan kini menggunakan larik `input.linkRelationships` yang dideklarasikan penyedia. Referensi dari relasi kosakata dan partikel digabungkan berdasarkan posisi yang ditulis, lalu setiap segmen yang ditampilkan dicocokkan dengan label dan alias pelafalan kartu referensi sambil mempertahankan kartu asli sebagai tujuan navigasi.

## Umpan balik menggambar otomatis

Pad menggambar kini menyembunyikan penghitung goresan dan kontrol panduan. Pad dimulai dengan panduan lengkap, secara bertahap memulihkan panduan dari goresan saat ini hingga goresan terakhir setelah kesalahan berulang, berguncang merah untuk goresan salah, dan merayakan karakter yang selesai dengan guncangan hijau serta bunyi keberhasilan yang dibuat aplikasi.

## Panduan menggambar terfokus dan kontrol bertema

Latihan menulis kini hanya memandu goresan saat ini, memperpendek panduan setelah keberhasilan, dan memperpanjang goresan yang sama setelah kesalahan; Atur ulang mempertahankan panduan yang berkurang dan Urungkan dihapus. Pad menyejajarkan teks kartu dengan definisinya, menyesuaikan ukuran Tutup dengan konten, serta menganimasikan pembukaan dan penutupan. Pembuatan Library memakai tanda tambah dua rem sesuai tema, judul serta isi karusel lapisan tujuan penyedia, dan aset pengeras suara yang mengikuti tema aplikasi.

## Hasil gambar sejajar dan kanonis

Judul Drawing kini mengikuti lebar kanvas dan berada tepat di atasnya. Guncangan umpan balik dibuat lebih lembut, dan goresan pengguna yang diterima diganti dengan jalur kanonis penyedia agar karakter akhir dirender dengan benar.

## Menggambar stabil dan penyusunan kartu

Panduan menggambar kini hanya menampilkan goresan kanonis yang lengkap, menjadwalkan pembaruan kanvas per bingkai animasi, dan mempertahankan keluaran yang diterima dalam bentuk kanonis. Tab tampilan Library tetap interaktif, penyusun bertingkat mengikuti tipe target relasi, karakter gabungan menerima label bebas dengan relasi pelafalan atomis, karusel target ganda dihapus, tag dapat diedit, dan bilah gulir karusel disembunyikan.

## Pencarian penyusun berbantuan penyedia

Penyedia konten yang kompatibel kini dapat mendaftarkan layanan pencarian terlokalisasi melalui kapabilitas ctx Library publik. Penyusun kartu menampilkan satu tindakan per layanan, mengirim masukan mentah ke layanan tersebut, lalu menerapkan label kanonis, bidang, dan referensi berurutan dengan tingkat keyakinan tertinggi.

## Pengaktifan kapabilitas publik

Pengaktifan modul kini mengenali kapabilitas server publik yang dikontribusikan melalui ctx sistem. Modul bahasa Jepang dan bahasa lainnya dapat memerlukan `study:library:provider` tanpa menerima konflik palsu bahwa kapabilitas tidak tersedia, sementara kapabilitas privat tetap tersembunyi.

## Formulir Library yang andal

Pembaruan kartu kini mempertahankan referensi tak berurutan tanpa posisi yang tidak valid. Tab relasi hanya tersedia dalam tampilan, karakter gabungan memakai bidang Masukan bebas dan karusel pelafalan, tindakan pencarian muncul sebaris setelah mengetik, pola goresan tetap dimiliki penyedia dan tersembunyi, kontrol tambah definisi lebih besar dan netral, serta pratinjau mengelilingi seluruh isinya.

## Penyuntingan kartu bawaan yang andal dan audio dalam paket

Pembaruan Pustaka kini memakai kontrak pembaruan terstruktur milik gateway basis data sehingga penyuntingan kartu bawaan tidak lagi gagal di PostgreSQL. Pemutaran audio hanya tersedia untuk berkas yang dikirim melalui paket konten dan disimpan oleh gateway Berkas; URL placeholder eksternal tidak ditampilkan maupun diambil. Ringkasan definisi menampilkan terjemahan yang dilokalkan dalam tata letak ringkas berlabel bahasa, bukan mengekspos kunci penyedia dan JSON mentah.

## Penyelesaian latihan menggambar yang stabil

Umpan balik menggambar kini hanya menganimasikan area kanvas sehingga akhir animasi tidak dapat mengulang transisi pembukaan papan atau membuat jendela berkedip. Percobaan baru dimulai dengan panduan karakter lengkap, lalu maju satu goresan utuh setiap kali setelah goresan pertama diterima. Penyelesaian menampilkan tanda centang, pesan Bagus Sekali, jumlah kesalahan percobaan, serta tindakan Tutup atau Coba Lagi.

## Pemutaran audio dan penyuntingan pelafalan

Halaman terautentikasi mengizinkan URL media yang dibuat peramban sehingga audio kartu yang baru diunggah dapat diputar tanpa melanggar Kebijakan Keamanan Konten. Penyunting audio menampilkan nama berkas saat ini dan ikon pengeras suara mengikuti tema aplikasi. Karusel pelafalan karakter gabungan menggantikan kontrol masukan tag di dalam bidang Pelafalan, memakai nama lapisan tujuan dari penyedia, dan memberi nomor karakter menurut urutannya dalam teks kartu, bukan posisi relasi yang usang.

## Pelafalan tertaut penyedia dan perubahan kartu yang bertahan

Kolom pelafalan yang ditautkan ke relasi penyedia kini menampilkan pemilih berurutannya langsung di dalam kolom, bukan mempertahankan masukan tag bebas. Setelah pengguna mengubah kartu yang dipasang penyedia, rekonsiliasi penyedia berikutnya mempertahankan kartu beserta relasinya.

## Komposisi pelafalan dua langkah dan audio stabil

Penyunting pelafalan kini memilih kartu komponen yang sesuai secara semantik, menampilkan pelafalan kartu, dan menyimpan setiap bacaan turunan sebelum menyusun bacaan berikutnya. Pratinjau karusel membungkus seluruh teksnya, kontrol audio tetap terlihat pada semua tema, dan unggahan audio pengganti memakai kembali kunci khusus kartu yang stabil.

## Urutan goresan terpandu dan Latihan Menggambar adaptif

Panduan awal kini memberi nomor pada setiap goresan dan menggambar panah arah. Sepuluh kesalahan berturut-turut menghasilkan pesan “Kalah!” dengan tanda X, sedangkan penyelesaian kartu dengan nol atau satu kesalahan menaikkan kesulitan dalam memori. Memilih kartu Pustaka lain yang dapat digambar saat pad terbuka langsung memuatnya ke pad yang sama.

## Panduan sekali, latihan gabungan, dan audio bersama

Panduan menggambar lengkap kini hanya muncul pada percobaan pertama atau setelah reset ? secara eksplisit. Coba lagi mempertahankan panduan progresif, sedangkan kartu gabungan menurunkan kelompok goresan karakter berurutan dan menampilkan setiap bagian baru secara lengkap. Kartu leksikal dan kalimat tidak boleh memiliki pola goresan sendiri. Karakter alternatif penyedia memakai ulang audio karakter terkait, unggahan pengguna tetap utama, dan pengeras suara memakai SVG inline yang aman untuk tema.

## Tulisan gabungan dan pembuatan andal

Gambar kosakata kini mengikuti bentuk tulisan utama dan menyusun setiap karakter yang ditemukan secara berdampingan, sementara judul papan menampilkan bacaan dan arti. Komposisi formulir bersama kini menandai bidang wajib secara konsisten, mempertahankan pola goresan dari penyedia, memvalidasi karakter alternatif melalui pencarian kamus, menyematkan pemilih pelafalan karakter, dan membersihkan pratinjau karusel saat dialog ditutup.

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
- https://github.com/Cognis-Labs-HQ/Cognis/commit/7d597603b3b1faf6df9d5c7a98973362312236d9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/61002cd2578510ff6d823b8ebb454364e2c930cd
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e8dac803472e1dfc8a5bb2acf3082da88dad8a05
- https://github.com/Cognis-Labs-HQ/Cognis/commit/a6aa6fe85403331903570c9cd20f115ea48576be
- https://github.com/Cognis-Labs-HQ/Cognis/commit/1337d0a332a5ccb2d1081816d55e453f90a0c0bc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/eda8cb2ab208b458f73e79f5b89fd6413ccbab77
- https://github.com/Cognis-Labs-HQ/Cognis/commit/337b23512bb9fd25e0ffce0d94058e4dcc959e84
- https://github.com/Cognis-Labs-HQ/Cognis/commit/67b413b535c0a8662cfe92c1170ccfc4742e6eae
- https://github.com/Cognis-Labs-HQ/Cognis/commit/c8893689
- https://github.com/Cognis-Labs-HQ/Cognis/commit/79cbfa05a5409f780bb42f4ea5ac7c0f8ec67f01
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e4daa661ee08b05a48ecba33182c490d4352e660
- https://github.com/Cognis-Labs-HQ/Cognis/commit/274fc626dbea45d3c8d66c82b98f1a0ba87a8052
- https://github.com/Cognis-Labs-HQ/Cognis/commit/024d7dfe05f713f390d7b9fb00410591018c9bf6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/281d2ac4dca994692513c8069ad21fe9affebedc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/f5214c148cab6eac78e3f8ee8aed3847ffba2201
- https://github.com/Cognis-Labs-HQ/Cognis/commit/bec24655948ca3a64ea6ab4f95f7897aecee68ac
- https://github.com/Cognis-Labs-HQ/Cognis/commit/1501e390dce637fb660c5b540a4235e3e7c98f29
- https://github.com/Cognis-Labs-HQ/Cognis/commit/71c842e2
- https://github.com/Cognis-Labs-HQ/Cognis/commit/3f72cfb6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/47821a9b
- https://github.com/Cognis-Labs-HQ/Cognis/commit/f2afaa13
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e894f166
- https://github.com/Cognis-Labs-HQ/Cognis/commit/64d1ac04
- https://github.com/Cognis-Labs-HQ/Cognis/commit/23587bd7
