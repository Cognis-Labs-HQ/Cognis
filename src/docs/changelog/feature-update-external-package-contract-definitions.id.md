# Pelacakan konten Pustaka baru per pengguna

**Cabang Fitur:** feature-update-external-package-contract-definitions

## Cache konten yang telah dilihat secara persisten

Cognis kini menyimpan UUID entri Pustaka yang telah dilihat untuk setiap akun. Mengarahkan penunjuk ke kartu atau membukanya secara langsung maupun melalui relasi akan menandainya sebagai telah dilihat tanpa mengungkap riwayat pengguna lain.

## Indikator dan notifikasi konten baru

Entri yang belum dilihat menampilkan pil **Baru** satu kali pada pratinjau dan popup detail. Pembaruan penyedia serta kontribusi global yang disetujui memberi tahu pengguna aktif ketika konten bahasa baru tersedia.

## Kontribusi terbatas dan alur peninjauan

Pengguna dapat membuat kartu pribadi, guru juga dapat membuat kartu di kelas miliknya, dan administrator dapat membuat kartu global. Permintaan peningkatan yang disetujui memindahkan kartu ke kelas milik guru atau koleksi global, sedangkan penurunan yang berwenang mengembalikannya kepada pengirim awal. Kartu yang dilindungi penyedia tidak dapat dipindahkan atau dihapus.

## UI Pustaka yang dapat dicari dan dikonfigurasi

Penyedia bahasa dapat membentuk bidang pembuatan milik lapisan melalui kapabilitas ctx. Deteksi duplikat global menjeda pembuatan untuk konfirmasi, rekaman impor memiliki indeks pencarian persisten, pencarian Pustaka mencakup semua lapisan, definisi pratinjau opsional tampil di bawah isi kartu, dan kontrol multi-pilih kini berada di tepi kartu yang diminta dengan tindakan mengambang dipulihkan.

## Pembuatan yang ditentukan bahasa telah lengkap

Paket bahasa kini dapat mendeklarasikan `cardConstructor` tervalidasi untuk setiap lapisan yang dapat dibuat, atau mendaftarkannya melalui kapabilitas ctx publik `study:library:provider`. Cognis menggabungkan bidang penyedia dengan kontrol visibilitas dan kelas sesuai peran, menampilkan pilihan kelas hanya bila diperlukan, serta menyediakan permintaan tinjauan bagi guru berwenang dan administrator.

## Status kartu terbatas dan penerbitan kontekstual

Indikator cakupan, Baru, dan pilihan pada tepi kartu kini tetap berada dalam batas horizontal kartu, sedangkan pratinjau sempit memprioritaskan nilai utama. Multi-pilih kini menyediakan menu arahkan Terbitkan ke, label hapus terlokalisasi yang nyata, penarikan permintaan tertunda, dan tindakan pengembalian berizin tanpa tombol tutup yang berlebihan.

## Tautan ringkas dan penemuan cerdas

Kontrol item terkait kini hanya menampilkan nilai utama setiap kartu. Kartu anak memiliki permukaan yang lebih jelas, pemisahan latar yang lebih kuat, dan penanda Baru yang dapat diarahkan secara mandiri. Popup detail menyarankan item serupa pada lapisan yang sama berdasarkan tulisan, metadata kosakata, dan relasi bersama, sementara penyedia bahasa dapat menampilkan kolom metadata tambahan sebagai filter untuk pelajar.

## Kontrak resmi paket eksternal

Study Library kini memvalidasi dan mempertahankan metadata terlokalisasi serta metadata penyedia, jenis bidang yang dapat diperluas dan divalidasi secara deklaratif, daftar aset, kepemilikan dan perlindungan paket, presentasi semantik, pelokalan definisi, minat, dan kompatibilitas aktivitas. Fixture paket sintetis meniru struktur penyedia produksi, dan kapabilitas penyedia publik dapat memeriksa paket nyata tanpa memasangnya.

## Perbaikan penjelajahan Pustaka dan siklus hidup penyedia

Kontrol pencarian dan penyuntingan Pustaka kini ringkas serta aman untuk semua tema. Pilihan klik kanan ditangkap secara andal, kartu anak bertingkat mempertahankan area arahkan, dan kartu non-karakter menampilkan bacaan serta definisi lengkap tanpa pemotongan yang tidak perlu. Penyedia konten kini mengendalikan ketersediaan bahasa secara resmi. Rekaman konten mendukung kelas bernamespace, daftar media bertahan saat ingest, editor khusus mengikuti kontrak validasi, batasan bawaan diterapkan, dan tanda terima pemasangan mempertahankan metadata penyedia.

## Kontrol Pustaka stabil dan kartu kalimat seimbang

Kartu kalimat kini menggunakan tinggi terbatas yang konsisten, menghilangkan pratinjau pelafalan berulang, serta membatasi teks utama dan definisi menjadi dua baris. Pencarian hanya menampilkan satu tindakan hapus terkontrol, ikon sunting memakai aset tema eksplisit, dialog penghapusan memiliki label terlokalisasi, dan detail kosakata menampilkan bacaan kana. Pilihan klik kanan ditangkap pada batas dokumen di setiap halaman Study yang terpasang, sedangkan pembaruan penyedia resmi memangkas rekaman yang tidak ada dalam paket terbaru kecuali paket parsial menolaknya secara eksplisit.

## Navigasi khusus permintaan penerbitan

Tinjauan penerbitan kini berada pada halaman Permintaan khusus di subnavigasi Study dan tidak lagi memakai ruang bilah alat Pustaka. Permintaan tertunda yang dapat ditinjau memberi tautan Permintaan garis tepi merah bernapas dengan alternatif pengurangan gerakan, dan sinyal hilang setelah tinjauan terakhir diselesaikan. Ikon hapus pencarian Pustaka kini menyesuaikan tema terang maupun gelap.

## Administrasi berbasis bahasa dan penyuntingan kartu terpandu

Administrasi Pustaka kini menampilkan menu lapisan datar untuk bahasa terpilih. Kelas kartu terlihat dan dapat disunting dengan aman, definisi serta komposit mendapat kelas wajib, definisi tetap tersembunyi dari pelajar, dan partikel maupun rekaman yang dikunci penyedia tidak dapat disunting. Dialog membedakan Lihat/Edit, menyediakan Simpan, dan melindungi perubahan belum tersimpan. Pembuatan kartu dipindah ke tindakan halaman `+` terpandu pada halaman pelajar, pengirim dapat melihat status permintaan, bacaan judul popup mempertahankan tautan penyedia, dan ketersediaan bahasa Study dimuat ulang pada setiap pemuatan halaman.

## Tindakan kartu pelajar yang andal

Kartu pelajar kini tetap memiliki kontrol pilihan terlepas dari izin penghapusan, sehingga klik kanan dapat membuka pemilihan jamak tanpa menampilkan menu peramban. Tindakan pembuatan kini menemukan konstruktor kartu kontribusi penyedia dan mendaftarkan tombol + melalui kapabilitas CTX tindakan halaman.

## Navigasi Permintaan terlokalisasi saat pemuatan awal

Item navigasi Permintaan kini menerima label cadangan terlokalisasi dari rute Library pemiliknya, sehingga pemuatan awal server atau peramban tidak lagi menampilkan jalur internal `/study/library/requests` ketika bundel terjemahan masih dimuat.

## Peran relasi urutan terurut

Validasi paket konten kini merekonstruksi label urutan terurut hanya dari relasi komposisi. Relasi pelafalan dan ejaan alternatif dapat menargetkan rekaman leksikal serta memakai urutan posisinya sendiri tanpa memicu `ordered_sequence_content_unresolved`, selaras dengan kontrak penyedia pembelajaran bahasa Jepang.

## Detail kelas konten dan tautan balik yang jelas

Tampilan detail kini menyembunyikan kelas struktural composite, mengubah akhiran kelas penyedia menjadi pil yang mudah dibaca, dan memakai judul komposit dua kolom dengan bacaan di bawah teks utama. Tautan kosakata terbalik berlabel sama disembunyikan tanpa menghapus relasi ejaan maju yang ditulis penyedia.

## Cabang kartu anak yang terfokus

Membuka cabang kartu anak kini memburamkan ikon visibilitas kartu yang tidak terkait serta menetralkan elevasi dan sorotan hover pada kartu induk lainnya. Cabang aktif tetap tajam dan interaktif.

## Evolusi skema aman oleh pemilik yang sama

Rilis baru paket konten otoritatif kini dapat merevisi skema tersimpannya sendiri pada versi kompatibilitas yang sama. Pemeriksaan kepemilikan tetap melindungi dari benturan skema, dan cache skema hanya diperbarui setelah ingest transaksional berhasil, sehingga paket bahasa Jepang terbaru dapat diaktifkan dengan bersih di atas rilis sebelumnya.

## Kontrol multipilih yang andal

Study Library kini selalu menyediakan menu tindakan mengambang ketika kartu dapat memasuki mode multipilih, termasuk pada tampilan tanpa rekaman penyedia yang dapat dihapus. Kotak pilihan juga menggunakan kursor penunjuk agar sifat interaktifnya terlihat jelas.

## Bahasa nonaktif dan status belajar yang bertahan

Modul bahasa yang dinonaktifkan kini sepenuhnya tidak muncul di Study meskipun capability penyedia lama masih tersisa selama penyegaran siklus hidup. Pembaruan paket konten mempertahankan pelacakan entri yang telah dilihat dan hanya memberi tahu akun tentang rekaman stabil yang benar-benar baru, bukan seluruh paket lagi.

## Detail judul bertaut tanpa duplikasi

Judul detail Library kini membandingkan teks ternormalisasi dan tujuan tautan antara judul utama dan detail ejaan sekundernya. Ejaan yang sudah ditautkan dalam judul utama dihilangkan dari baris detail tanpa menyembunyikan tautan berteks sama menuju rekaman yang benar-benar berbeda.

## Relasi bacaan khusus dependensi

Kontrak paket eksternal kini memperlakukan relasi tanpa peran resolver dan presentasi sebagai sisi dependensi saja. Relasi tetap disimpan untuk navigasi balik dan perlindungan penghapusan tanpa dianggap sebagai komposisi judul, selaras dengan graf `reading-kana-dependency` penyedia bahasa Jepang.

## Relasi balik terpadu

Detail Library kini menggabungkan penggunaan kosakata dan dependensi masuk lainnya dalam satu bagian Digunakan Oleh. Label ternormalisasi yang tampak sama diringkas menjadi satu tautan, dengan relasi kosakata diprioritaskan.

## Perataan judul yang seimbang

Judul popup komposit kini lebih dekat dengan detail bacaannya melalui jarak baris yang rapat. Judul, bacaan, dan definisi pratinjau kartu tetap terpusat ketika deduplikasi relasi menghapus item di sebelahnya.

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

## Penyuntingan, gambar, dan komposisi andal

Pembaruan kartu dan pemutaran audio kini dimigrasikan melalui skema penyedia terkini, dan dialog detail mempertahankan tindakan sunting setelah penyuntingan. Latihan gambar tetap terbatas di area pandang, dapat diubah ukurannya dengan tepat, memberi anotasi pada panduan satu goresan, memakai ejaan kosakata alih-alih pelafalan, serta mengecualikan kalimat dan gabungan. Pembuatan kartu mengecualikan kartu partikel, memulihkan semua karusel komposisi untuk kalimat dan gabungan, serta menyediakan pemilih pelafalan berbasis karakter dengan tahap persiapan untuk kosakata dan karakter alternatif.

## Komposisi bertingkat yang tepat

Cabang kartu anak bertingkat kini mempertahankan sisi yang ditetapkan penyedia saat ruangnya mencukupi, dialog pembuatan bertingkat selalu berada di atas dialog induknya, dan komposisi pelafalan kini sama dengan composer input dengan bidang teks bertahap serta karusel karakter atomik.

## Karusel composer arahan penyedia

Constructor kartu kini memisahkan ID relasi karusel input primer dan pelafalan secara eksplisit. Karakter alternatif memerlukan relasi pelafalan yang terselesaikan tanpa mewajibkan referensi primer, hasil lookup memperoleh nilai bawaan metadata penyedia yang aman, dan penempatan kartu anak tidak lagi menghilangkan cabang ketika kapasitas grid yang dideklarasikan habis.

## Deklarasi composer yang ketat

Perilaku karusel hasil inferensi dihapus: setiap constructor kartu wajib mendeklarasikan kedua larik karusel. Validasi server kini memakai constructor formulir runtime, formulir edit merender karusel pelafalan terdeklarasi, kunci pengganti audio memakai nama kartu ternormalisasi, dan kartu anak diagonal mempertahankan penempatannya.

## Pemulihan karusel berbasis penyedia

Constructor kartu kini mengenali sumber karusel input dan pelafalan berdasarkan lapisan target. Cognis memetakan deklarasi tersebut hanya ke relasi dengan peran presentasi yang sesuai, sehingga karusel pelafalan tampil kembali sementara referensi primer karakter alternatif tetap opsional.

## Umpan balik tinjauan dan penempatan penyusun yang andal

Pemangkasan paket konten kini mempertimbangkan penerbit, permintaan publikasi menggunakan kontrak basis data dengan benar, dan pemeriksaan penghapusan hanya mempertimbangkan permintaan tertunda. Konstruktor generik, publikasi kelas, label gabungan bebas, cabang pelafalan berulang, pembatalan definisi bertingkat, unggahan audio unik, evolusi skema yang kompatibel, dan tautan pelafalan yang dapat dihapus kini andal. Aset pengeras suara dirender melalui gambar bertema eksplisit, sedangkan carousel relasi berada di bawah bidang konten yang dimaksud.

## Penyuntingan carousel kartu yang ada

Kartu yang ada kini memperoleh konfigurasi carousel input dan pelafalan dari konstruktor penyedia. Popup penyuntingan pengguna dan administrasi menampilkan kontrol carousel terurut yang sama seperti pembuatan sambil mempertahankan pilihan yang ada.

## Panduan gambar panjang yang akurat

Anotasi gambar kini menghitung arah dalam koordinat kanvas yang dirender sehingga tidak bergeser pada karakter kedua dan berikutnya dari input panjang. Tindakan panduan ? mempertahankan goresan pengguna yang diterima dan hanya memberi anotasi pada bagian yang belum selesai.

## Anotasi gambar bebas tumpang tindih

Nomor goresan kini memilih posisi paling lapang di sekitar setiap titik awal serta menghindari penanda anotasi lain dan jalur goresan yang dirender agar panduan tidak menutupi pekerjaan pengguna yang selesai.

## Kontrak pembuatan dan penyuntingan terpadu

Popup pembuatan dan penyuntingan kini memakai kontrak konstruktor kartu penyedia yang sama untuk bidang dan carousel relasi. Karakter alternatif dapat menyusun pelafalan dari karakter sambil mempertahankan input bebas; pelafalan kosakata, kalimat, dan gabungan diturunkan secara rekursif dari bagian input yang dikonfigurasi.

## Hapus tag pelafalan turunan

Formulir penyuntingan kosakata, kalimat, dan gabungan kini selalu menyembunyikan kontrol daftar pelafalan generik dan tetap menurunkan pelafalan dari bagian terurutnya. Bidang daftar generik memakai teks per baris, bukan chip tag.

## Menggambar ingatan progresif

Penyelesaian dengan sedikit kesalahan kini menyembunyikan satu panduan goresan acak tambahan per kartu sambil mempertahankan validasi normal. Tanda tanya pada kanvas menandai panduan tersembunyi, ? kanan atas menampilkannya tanpa menghapus kemajuan, dan label anotasi memakai posisi aman yang lebih dekat.

## Commit

- [5c5cb3d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c5cb3d4)
- [c1874177](https://github.com/Cognis-Labs-HQ/Cognis/commit/c1874177fc1875ceab65c8b7aac58d60c5c5e091)
- [d6f1cf21](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6f1cf219f2739174c01019b358ab939a24659f7)
- [8e38ded6](https://github.com/Cognis-Labs-HQ/Cognis/commit/8e38ded6f03e8e36d225e8d425625c1b719fa112)
- [c916c66f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c916c66f2095da249058883026fa7eba94005316)
- [227f2166](https://github.com/Cognis-Labs-HQ/Cognis/commit/227f21669b5ab0a3473f0bf5f547bfdb424f4ca2)
- [64d53397](https://github.com/Cognis-Labs-HQ/Cognis/commit/64d53397)
- [84bedc67](https://github.com/Cognis-Labs-HQ/Cognis/commit/84bedc67)
- [617a2161](https://github.com/Cognis-Labs-HQ/Cognis/commit/617a2161)
- [365d5444](https://github.com/Cognis-Labs-HQ/Cognis/commit/365d5444)
- [11bec51d](https://github.com/Cognis-Labs-HQ/Cognis/commit/11bec51d)
- [b996336d](https://github.com/Cognis-Labs-HQ/Cognis/commit/b996336d)
- [8d4c4129](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d4c4129)
- [d16a50d5](https://github.com/Cognis-Labs-HQ/Cognis/commit/d16a50d5)
- [ea24056d](https://github.com/Cognis-Labs-HQ/Cognis/commit/ea24056d)
- [bcb4e781](https://github.com/Cognis-Labs-HQ/Cognis/commit/bcb4e781)
- [87f30e20](https://github.com/Cognis-Labs-HQ/Cognis/commit/87f30e20)
- [d3ba08ef](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3ba08ef)
- [6d6e4e53](https://github.com/Cognis-Labs-HQ/Cognis/commit/6d6e4e53)
- [5f8b129c](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f8b129c)
- [9c374e3f](https://github.com/Cognis-Labs-HQ/Cognis/commit/9c374e3f)
- [05838355](https://github.com/Cognis-Labs-HQ/Cognis/commit/05838355)
- [a0016fcd](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0016fcd)
- [0287eb84](https://github.com/Cognis-Labs-HQ/Cognis/commit/0287eb84)
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
- https://github.com/Cognis-Labs-HQ/Cognis/commit/c8c8deb9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/48d14c1ba63d887a04305306f8c9de7565361dfa
- https://github.com/Cognis-Labs-HQ/Cognis/commit/872484294f2d3b777c6123286db62c78dc08f7f8
- https://github.com/Cognis-Labs-HQ/Cognis/commit/452e3eb3fc5b9e2ca86464904e7f6477992b7c32
- https://github.com/Cognis-Labs-HQ/Cognis/commit/039dc5c1
- [8b08718f](https://github.com/Cognis-Labs-HQ/Cognis/commit/8b08718f)
- [7841f27](https://github.com/Cognis-Labs-HQ/Cognis/commit/7841f27)
- [9aedc46](https://github.com/Cognis-Labs-HQ/Cognis/commit/9aedc46)
- [f405a3e](https://github.com/Cognis-Labs-HQ/Cognis/commit/f405a3e)
- [641d87a](https://github.com/Cognis-Labs-HQ/Cognis/commit/641d87a)
- [bbed779](https://github.com/Cognis-Labs-HQ/Cognis/commit/bbed779)
- [efd006d2](https://github.com/Cognis-Labs-HQ/Cognis/commit/efd006d2)
- [fb046ce2](https://github.com/Cognis-Labs-HQ/Cognis/commit/fb046ce2)
- [004b39e5](https://github.com/Cognis-Labs-HQ/Cognis/commit/004b39e5)
