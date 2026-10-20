# Penyempurnaan Pustaka Studi

**Cabang Fitur:** feature-update-external-package-contract-definitions

Editor kartu meminta konfirmasi sebelum membuang perubahan. Pilihan karusel menambahkan penempatan kartu berulang, dan seret mengurutkan ulang setiap penempatan. Pratinjau pelafalan kalimat membingkai setiap komponen sumber; umpan balik masukan yang berlebihan dihilangkan. Pratinjau saat kursor berada di atas kartu hanya menampilkan pelafalan dan definisi utama di dalam area layar.

## Daftarkan pengambilan audio terkelola

Kedua modul Study memakai kontrak penyedia audio yang sama dan dapat dilepas, serta mengambil rekaman bawaan dengan pembacaan lokal terbatas. Host memiliki otorisasi, kebijakan cache, dan pemutaran komposit.

## Sertakan rekaman pelafalan awal

Kartu awal yang diucapkan menyertakan MP3 yang dibuat offline dan dideduplikasi, beserta atribusi suara. Kalimat tetap memutar unsur penyusunnya secara berurutan.

## Jaga petunjuk hover agar tidak menutupi pratinjau

Petunjuk tekan lama tetap satu baris di area bawah yang disediakan, dengan elipsis visual bila perlu dan teks terjemahan lengkap tetap tersimpan dalam tooltip. Petunjuk tidak lagi membungkus hingga menutupi pratinjau bahasa Inggris.

## Tautkan unsur kalimat yang dipisahkan spasi

Judul detail kalimat mempertahankan spasi di antara tautan kata kanonis dan transformasi terpilih. Kalimat bahasa Inggris kini menautkan kata penyusunnya; komposisi tidak lengkap tetap ditolak.

## Pisahkan navigasi transformasi

Detail kartu hasil transformasi menempatkan Kembali ke pada baris tersendiri, dengan Sebelumnya dan Berikutnya tetap berpasangan di bawahnya.

## Tampilkan label navigasi adapter

Navigasi Study menampilkan Permintaan dan tautan adapter lainnya dari label rute terlokalisasi yang dideklarasikan, tanpa memerlukan paket bahasa adapter pada halaman utama Study. Kesalahan ketat untuk terjemahan XML milik gateway yang hilang tetap berlaku dan tautan adapter ganda dihindari.

## Lepas status pemuatan saat pembatalan

Halaman langsung yang dibatalkan segera melepas token pemuatan bersama, meskipun inisialisasi terjemahan, penyedia, atau composer masih tertunda. Pembersihan sumber daya tetap terikat pada sinyal host yang sama.

## Masa hidup halaman langsung dan parsing terbatas

Helper host `mountWhenDirect` memberikan AbortSignal melalui `mount(root, { signal })`, yang berakhir saat navigasi rute dijalankan atau halaman ditinggalkan. Halaman mengikat pembersihan pada sinyal itu dan memeriksanya setelah inisialisasi asinkron. Mount yang gagal membatalkan sumber daya miliknya; pekerjaan yang dibatalkan tidak menerbitkan galat pada halaman tujuan. Label tautan Markdown memisahkan karakter escape dari karakter biasa untuk menghindari backtracking ambigu. CI hanya meminta akses baca konten repositori.

## Kontrol tutup PiP

Kontrol tutup jendela mengambang menggunakan SVG tutup bersama yang disajikan dengan warna sesuai tema. Tooltip saat diarahkan menggunakan label tindakan terlokalisasi yang sama dengan nama aksesibilitas, bukan mewarisi judul permukaan.

## Cache konten yang telah dilihat secara persisten

Cognis kini menyimpan UUID entri Pustaka yang telah dilihat untuk setiap akun. Mengarahkan penunjuk ke kartu atau membukanya secara langsung maupun melalui relasi akan menandainya sebagai telah dilihat tanpa mengungkap riwayat pengguna lain.

## Indikator dan notifikasi konten baru

Entri yang belum dilihat dan belum pernah dipindahkan menampilkan pil **Baru** satu kali pada pratinjau dan popup detail. Kartu global baru dan konten penyedia baru memberi tahu pengguna aktif; pemindahan kartu yang sudah ada antarlingkup tidak.

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

Batas bawaan brankas adalah 2 MiB dengan batas mutlak pemrosesan 8 MiB. Kebijakan efektif dikembalikan kepada klien. PUT menghitung byte masuk sebelum penyanggaan atau penguraian JSON dan menolak permintaan terlalu besar; GET memeriksa ukuran tersimpan sebelum penguraian. Amplop terenkripsi menggunakan baris utama serta baris lanjutan terbatas, dengan penggantian dan penghapusan atomik serta satu pembacaan gabungan. Tiap bagian tersimpan paling besar 60.000 byte UTF-8; server tetap tidak mendekripsi rahasia.

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

## Selalu sunting pelafalan dengan composer

Bidang pelafalan yang terlihat kini selalu memakai composer pelafalan dalam dialog pembuatan dan penyuntingan. Carousel pelafalan yang dideklarasikan oleh konstruktor kartu tetap khusus per lapisan dan muncul di dalam composer tersebut, sedangkan lapisan tanpa carousel relasi yang dideklarasikan tetap dapat memasukkan bagian pelafalan tanpa batasan.

## Rangkaian audio turunan dengan umpan balik audio yang hilang

Kartu kosakata dan kalimat tanpa unggahan sendiri memutar audio bagian terurutnya secara berurutan. Unggahan opsional pada tingkat kartu menggantikan rangkaian turunan; ketika dependensi tidak memiliki audio, tooltip hover yang dilokalkan menjelaskan alasan pengeras suara dinonaktifkan.

## Carousel terhubung langsung ke pelafalan

Antarmuka composer terpadu kini otomatis menambahkan relasi yang tersirat oleh lapisan carousel input atau pelafalan ke konstruktor efektif. Karena itu carousel pelafalan dimuat secara andal dalam dialog pembuatan dan penyuntingan, dan pilihannya langsung memperbarui bidang pelafalan tersembunyi tanpa bidang teks bebas atau tombol commit terpisah.

## Carousel pelafalan dipulihkan dari relasi skema

Unit tulisan gabungan menyusun pelafalan dari unit tulisan atomik. Unit leksikal memakai unit tulisan atomik untuk pelafalan serta unit tulisan atau leksikal untuk masukan. Urutan leksikal berurutan menurunkan pelafalan dari unit leksikal dan partikel yang dipilih. Peran semantik ini menentukan kontrak composer terkini.

## Profil carousel semantik sesuai kontrak penulisan

Composer kini menormalkan konstruktor kartu ke profil semantik yang diminta: karakter alternatif memperoleh Input bebas serta Pelafalan karakter; kosakata memperoleh Input karakter, karakter alternatif, dan kosakata serta Pelafalan karakter; kalimat memperoleh Input partikel, karakter alternatif, dan kosakata tanpa Pelafalan yang dapat disunting. Pelafalan kosakata dipraisi hingga lapisan karakter, sedangkan pelafalan kalimat hanya diturunkan darinya.

## Karakter dan partikel tidak dapat diubah

Karakter atomik dan partikel tidak lagi dapat dibuat, disunting, diajukan untuk pembaruan, atau dihapus melalui UI maupun panggilan API langsung. Proyeksi izin menghapus tindakan sunting dan hapus bahkan bagi administrator dan pemilik, sementara entri tetap tersedia untuk penjelajahan hanya-baca.

## Petunjuk panduan tersembunyi yang tepat waktu

Latihan Menggambar kini menampilkan tanda tanya pada kanvas hanya ketika goresan yang sedang diminta memiliki panduan tersembunyi. Goresan tersembunyi yang baru diperlukan nanti tidak lagi menampilkan petunjuk terlalu awal.

## Posisi karosel menyeluruh dalam komposisi

Karosel Input Pustaka Studi kini berbagi satu urutan penghitung dalam dialog buat dan edit. Lencana mencerminkan seluruh komposisi tersimpan di semua karosel relasi, bukan dimulai ulang dari satu pada setiap karosel.

## Nama lapisan milik penyedia dan pelafalan turunan yang valid

Penulisan Pustaka tidak lagi menampilkan pilihan Kelas Konten internal antara label semantik seperti kalimat dan komposit. Nama lapisan penyedia yang dilokalkan kini mengidentifikasi kartu, rekaman terurut menyimpan ID lapisan penyedia, dan pelafalan yang diturunkan otomatis mengikuti tipe bidang penyedia sehingga bidang pelafalan bernilai daftar dapat dikirim dengan berhasil.

## Bidang pelafalan turunan wajib tetap dapat ditemukan

Composer kini mengambil definisi bidang pelafalan turunan dari skema penyedia lengkap, bukan dari lapisan editor yang difilter untuk tampilan. Karena itu composer kalimat dan composer turunan lainnya mengisi bidang pelafalan wajib walaupun tidak memiliki kontrol input langsung.

## Bidang kartu terpilih menyertai setiap grup karosel terkonfigurasi

Bagian Input dan Pelafalan kini selalu menampilkan bidang kartu terpilih ketika konstruktor mendeklarasikan karosel untuk bagian tersebut. Pilihan yang sudah ada mengisi bidang, perubahan karosel langsung memperbaruinya, dan memilih kartu yang ditampilkan akan menghapusnya melalui status karosel yang sama.

## Komposisi karosel multi-nilai dan penghapusan aman

Bidang penyedia dapat mengaktifkan komposisi multi-nilai dengan `multi_value`. Composer menambahkan tindakan simpan khusus bidang dan pil nilai tersimpan, mendukung pembukaan kembali nilai untuk penggantian, membatasi saran teks pada kartu dalam karosel terkonfigurasi, menolak teks bebas yang tidak terselesaikan, dan membatasi penghapusan terkonfirmasi pada kontrol × khusus. Editor entri yang sudah ada kini memasang karosel terdeklarasi secara konsisten dengan formulir pembuatan.

## Area sementara multi-nilai tidak lagi mengubah nilai tersimpan

`multi_value` pada tingkat bidang kini dibaca sebagai kontrak kanonis. Pil tersimpan tetap terpisah dari bidang sementara yang awalnya kosong, hanya tindakan Simpan yang terlihat yang menyimpan referensi sementara, dan kontrol × ringkas menghapus kartu sementara tanpa konfirmasi atau mengubah nilai tersimpan. Mengeklik pil tersimpan tidak lagi memuatnya ke area sementara.

## Label kanonis dan pratinjau langsung

Formulir kartu tidak lagi menampilkan bidang Label terpisah untuk kartu non-definisi. Label dibuat dari komposisi Input utama yang berurutan, dan penyimpanan edit langsung segera merender ulang peramban kartu agar pratinjaunya sesuai dengan entri tersimpan. Bidang multi-nilai kini hanya menerima kontrak `multi_value` pada tingkat bidang; bentuk bertingkat yang diperkenalkan di cabang ini dihapus dan tidak dipertahankan sebagai kode kompatibilitas.

## Tooltip utuh dan pratinjau karosel

Tooltip audio yang tidak tersedia kini memakai portal body yang memperhitungkan viewport, bukan posisi absolut di dalam kartu, sehingga luapan popup dan kartu tidak memotong teks. Setiap item karosel kembali memiliki pratinjau saat diarahkan atau difokuskan dengan papan ketik, termasuk saat teks definisi tambahan tidak tersedia.

## Pelafalan multi-nilai berkelompok

Kontrak Library diselaraskan dengan graf pelafalan berkelompok milik penyedia pembelajaran bahasa Jepang. Relasi dapat mendeklarasikan `grouped: true`, dan entri dapat membawa `referenceGroups` berkunci relasi, dengan setiap larik karakter terurut bertingkat menjadi milik satu pelafalan yang berbeda. Validasi paket konten, hashing, penyimpanan, API, composer pembuatan/pengeditan, tautan judul, serta penelusuran audio turunan kini mempertahankan batas tersebut dari ujung ke ujung.

## Kartu tersembunyi tidak masuk karosel

Karosel composer, saran kartu untuk teks bebas, dan saran pelafalan kini mengecualikan entri yang ditandai tersembunyi. Kartu yang sudah ada tetap mempertahankan dependensi tersembunyi yang telah dibuat melalui nilai relasi dasarnya tanpa menampilkan dependensi tersebut sebagai kartu karosel yang dapat dipilih.

## Grup pelafalan renggang tidak lagi menggagalkan pembacaan entri

Penyimpanan Pustaka kini memadatkan indeks referensi berkelompok yang hilang sebelum mengurutkan setiap grup. Entri dengan indeks grup tersimpan yang renggang dapat dimuat tanpa galat dan urutan pelafalan tetap deterministik.

## Pratinjau kartu meringkas pelafalan

Kartu Pustaka kini hanya menampilkan dua pelafalan pertama. Pelafalan tambahan tetap tersedia dalam tampilan detail entri lengkap.

## Pelafalan berkelompok dideduplikasi dengan benar

Urutan karakter bertingkat kini disatukan menjadi bacaan lengkap sebelum label pelafalan dibandingkan. Bacaan berkelompok yang sama dengan nilai kartu tidak lagi ditampilkan dua kali.

## Tautan pelafalan tidak lagi mengulang judul

Deduplikasi pelafalan kini membandingkan gabungan label kartu karakter tertaut dengan nilai kartu yang ditampilkan. Perbandingan menormalkan spasi dan representasi Unicode sehingga bacaan tertaut yang setara dihilangkan terlepas dari bentuk bidang yang tersimpan.

## Grup pelafalan lintas relasi divalidasi dengan benar

Indeks grup yang sejajar di beberapa relasi tautan bidang kini mewakili item bidang multinilai yang sama. Validasi memakai jumlah grup tertaut terbesar alih-alih menjumlahkan relasi paralel, sehingga paket konten bahasa Jepang terbaru dapat diaktifkan.

## Detail pelafalan diturunkan dan gambar ulang tetap proporsional

Pelafalan yang sama dengan nilai kartu kini diturunkan ke nilai pelafalan kartu tertaut, bukan mengulang ejaan yang sama. Latihan Menggambar juga menerapkan ulang proporsi area dan menyelaraskan kanvas ketika jendela terbuka memuat pola dengan jumlah kolom berbeda.

## Escape menutup Latihan Menggambar

Jendela Latihan Menggambar aktif kini dapat ditutup dengan tombol Escape melalui alur pembersihan beranimasi normal.

## Judul bacaan mempertahankan grup ejaan lengkap

Deduplikasi judul kini hanya menghapus urutan referensi duplikat yang lengkap, bukan karakter individual dari pelafalan. Ejaan yang sama dengan nilai utama diturunkan ke pelafalan lapisan karakter, mencegah bacaan parsial dan ketidaksesuaian nilai utama sambil mempertahankan daftar bacaan Kanji buatan penyedia.

## Penghapusan tepat dan input tetap tersimpan saat definisi kurang

Kini hanya tombol × yang ringkas yang menghapus kartu yang sedang disiapkan; bagian lain bidang komposisi tidak memicu penghapusan. Pembuatan memvalidasi jumlah minimum relasi sebelum menutup popup, sehingga definisi yang kurang menampilkan toast dan mempertahankan seluruh input composer untuk diperbaiki.

## Detail judul yang mudah dibaca dan batas komposer

Rincian pelafalan dan definisi yang panjang kini tetap berada di samping nilai utama dalam lebar 40% dan membungkus ke baris tambahan, dengan tanda pisah yang memperjelas awal definisi. Pembuatan kartu membatasi penulis hingga 8 tag, 10 definisi, dan 16 pelafalan serta melaporkan setiap batas melalui toast yang dilokalkan.

## Susunan judul padat dan batas pengeditan

Judul yang diperluas oleh pelafalan kini menempatkan pengeras suara di bawah ikon cakupan, mempertahankan bacaan dalam kelompok pembungkus selebar 40%, dan membiarkan definisi membentuk baris mandiri di sebelah kanan. Batas tag, definisi, dan pelafalan yang sama kini diterapkan pada komposer pembuatan maupun pengeditan.

## Penempatan diagonal adaptif untuk kartu anak

Cabang anak karakter yang diperluas kini menguji posisi diagonal di kedua sisi ketika arah pilihannya meluap atau bertabrakan. Kartu akar yang terlihat disertakan dalam penilaian tabrakan, sehingga kartu anak dan panah penghubung tetap berada di dalam kanvas Pustaka sambil memilih slot diagonal yang benar-benar kosong.

## Komponen kalimat dan pohon transformasi

Penyedia bahasa dapat menandai transisi kalimat dengan tag milik penyedia dan menampilkannya melalui karusel terfilter khusus kalimat, sedangkan tanda baca berulang memakai karusel satu baris yang hanya dapat dibaca. Tampilan lapisan terfilter tag memindahkan verba dan adverbia dari halaman kosakata biasa ke halaman pohon transformasi selebar widget. Set transformasi deklaratif pada skema menghasilkan jalur keadaan berbasis sufiks dari kartu bentuk dasar tanpa membuat setiap infleksi sebagai kartu.

## Alur kalimat dan transformasi yang matang

Kartu transisi kalimat kini hanya muncul dalam karusel komposer terfilternya, pengeditan memulihkan tanda baca berulang sesuai urutan penulisan, dan simpul transformasi memperbarui pratinjau bentuk hasil secara langsung. Validasi skema juga menolak deklarasi tanda baca dan transformasi yang ambigu atau tidak efektif.

## Jarak pad menulis lebih rapat

Pad dengan beberapa karakter kini memangkas ruang horizontal yang tidak terpakai berdasarkan batas goresan setiap karakter dan mempertahankan jarak kecil yang seragam. Jendela menyempit mengikuti pola yang ringkas sambil mempertahankan proporsi karakter, urutan goresan, waktu, tekanan, dan keselarasan penunjuk saat ukuran atau kartu berubah.

## Tinggi pad mengikuti konten

Tinggi awal pad kini mengikuti kanvas, judul, dan kontrol yang ditampilkan, bukan tambahan tetap yang dibatasi hingga tujuh puluh persen tinggi layar. Pada layar pendek, tinggi kanvas yang tersedia diperkecil sambil mempertahankan proporsi goresan dan menjaga tombol Atur Ulang tetap terlihat. Memuat kartu lain menyesuaikan kembali konten dan mempertahankan pad di dalam layar.

## Pemilihan kartu menulis berulang

Memilih kartu Library yang dapat digambar saat pad terbuka kini menggambar ulang setiap pola baru, meskipun kartu berturut-turut menggunakan ukuran kanvas yang sama. Beralih kartu langsung memperbarui panduan tanpa perlu mengubah ukuran atau membuka kembali jendela.

## Pad tetap di halaman utama

Latihan Menulis kini tetap berada di dalam halaman utama. Batas konten halaman yang dapat digulir digunakan saat menyeret dan mengubah ukuran, sehingga pad tidak menutupi header atau footer. Pada jendela pendek, pad mempertahankan tinggi gambar alaminya dan halaman utama dapat digulir secara vertikal untuk menjangkau kontrol lainnya.

## Tautan dan bacaan kartu inline

Pembuatan kartu secara inline kini menyimpan pilihan karakter pelafalan yang masih disiapkan sebelum kartu dibuat. Menyimpan bacaan yang sudah diberikan oleh pencarian melampirkan tautan karakter terpilih tanpa menambahkan pelafalan duplikat. Nilai pencarian langsung ditampilkan ulang dengan format baris daftar pelafalan, dan bacaan kosakata serta kalimat yang disusun otomatis tetap terlihat saat masukan utama berubah. Judul detail mencocokkan kelompok bacaan berdasarkan bacaan lengkapnya, bukan posisi dalam daftar, dan dapat menghubungkan bacaan yang belum tertaut ke kartu karakter kanonis.

## Tautan bentuk dan kana gabungan

Judul dan pelafalan kosakata yang ditransformasi menautkan satuan tulisan kanonis dari bentuk yang ditampilkan. Digunakan Oleh juga mencakup komposisi ejaan dan pelafalan kanonis yang lengkap, sehingga kana gabungan dapat menautkan kembali ke kosakata meskipun referensi tersimpan menunjuk satuan yang lebih kecil. Hubungan tersimpan tetap terlihat; komposisi yang tidak lengkap tidak menghasilkan tautan sebagian.

## Hubungan detail langsung

Daftar hubungan dalam detail menampilkan tetangga langsung. Digunakan Oleh, Contoh Penggunaan, dan pohon hubungan mengecualikan entri yang dicapai melalui induk ejaan atau pelafalan lain, termasuk referensi berkelompok. Tautan langsung tetap tersedia, dan referensi siklik tidak menyebabkan penelusuran berulang. Item Serupa tetap menampilkan entri pada lapisan yang sama.

## Pertahankan tautan langsung

Hubungan langsung tetap terlihat meskipun jalur melalui entri perantara mencapai kartu yang sama. Referensi tersimpan, referensi berkelompok, dan komponen judul kanonis mempertahankan tautan langsung, mendukung あ → ある + あるく serta あ → ある → あるく. Hanya hubungan yang dicapai semata-mata melalui induk lain yang dikecualikan.

## Pelafalan dan bentuk dasar

Kartu yang ditransformasi tidak menampilkan pelafalan yang sama dengan judulnya setelah normalisasi. Pelafalan yang berbeda tetap memiliki tautan karakter. Tindakan terlokalisasi Kembali ke {{ verb }} memulihkan kartu dasar dan menghapus transformasi yang dipilih sambil mempertahankan navigasi kartu biasa.

## Cakupan dan penghapusan

Penulisan ketergantungan kini memeriksa visibilitas setiap hubungan, termasuk referensi berkelompok. Kartu pribadi dapat memakai kartu bersama yang dapat dibaca dan komponen pribadinya sendiri; kartu kelas memerlukan komponen global atau dari kelas yang sama; kartu global memerlukan komponen global. Usulan pembaruan memvalidasi skema referensi sebelum pengajuan, persetujuan penerbitan memeriksa kembali ketergantungan terkini, dan perubahan tidak boleh membatalkan keabsahan penerbitan yang tertunda. Konten bersama tidak dapat dikembalikan ke cakupan pribadi jika kartu bersama yang bergantung padanya atau permintaan tertunda masih memerlukan visibilitas yang lebih luas. Petunjuk izin dikembalikan setelah pembuatan dan perubahan serta mengikuti akses tulis kelas.

Penghapusan mengonfirmasi semua kartu turunan yang dapat dihapus berdasarkan aturan kaskade dan pembatasan, termasuk referensi berkelompok. Kartu yang hanya dipisahkan tetap disimpan. Transaksi memeriksa kepemilikan, akses kelas, perlindungan, dan peninjauan tertunda pada setiap kartu sebelum menghapus apa pun. Kartu terbatas yang dicapai melalui kaskade lain tidak lagi gagal akibat urutan penelusuran. Pembuatan kartu bersama menawarkan penyimpanan pribadi jika cakupan ketergantungan terlalu sempit. Bantuan penerbitan dapat mengajukan komponen terbawah yang memenuhi syarat, termasuk definisi tersembunyi, sebelum mengajukan kartu induk setelah persetujuan.

Server merencanakan konfirmasi penghapusan menggunakan versi skema tersimpan dan menyertakan kartu dependan yang tidak ada di halaman saat ini. Klien gateway Study menyediakan pemeriksaan penghapusan tanpa perubahan data.

## Impor kamus dan draf

Hasil kamus dapat ditinjau sebelum menerapkan pelafalan, klasifikasi, tag, referensi, dan definisi tiap makna. Pelafalan yang diimpor langsung muncul dengan kontrol yang sama seperti pelafalan yang disimpan manual. Pelafalan otomatis mengikuti perubahan masukan utama sambil mempertahankan alternatif pengguna. Tab wajib memiliki satu penanda dan tombol tambah definisi lebih ringkas.

Ambil terjemahan yang belum tersedia menggunakan `POST /api/v1/study/library/definitions/localize` dengan `{ translations, languages }`. Bahasa UI yang belum tersedia diminta melalui `localization:translateString`, terjemahan yang diberikan tetap dipertahankan, dan `missingLanguages` dilaporkan jika penyedia tidak tersedia atau gagal. Teks yang belum diterjemahkan dapat diedit; teks Inggris tidak disalin ke bidang bahasa lain. Tindakan ini juga tersedia saat menambahkan definisi secara manual.

## Pembuatan oleh administrator dan pencarian pola goresan

Administrator membuat kartu langsung di ruang nama global tanpa kontrol Publikasikan. Definisi yang dibuat langsung atau diimpor dari kamus menggunakan tujuan global yang sama; dependensi pribadi harus diterbitkan sebelum penyimpanan. Pencarian Pola Goresan langsung menerapkan pola penyedia tanpa membuka pratinjau kamus.

Stylesheet serta kode validasi, persistensi, penyelarasan konstruktor, dan pengujian terkait dibagi menjadi berkas terfokus agar memenuhi pemeriksaan ukuran repositori; struktur dokumentasi dan penemuan pengujian UI diperbaiki.

## Pencarian mengisi penyusun kartu

Pencarian kamus kini langsung mengisi penyusun kartu yang terbuka dan menyimpan semua definisi serta pelafalan yang dikembalikan tanpa popup hasil atau langkah Terapkan. Nilai yang sudah ada memerlukan konfirmasi penggantian sebelum permintaan; pembatalan serta pencarian kosong atau gagal mempertahankan kartu saat ini. Pencarian Pola Goresan yang berhasil menyembunyikan tombolnya. URL sumber kamus disimpan dalam data sumber tersembunyi, bukan ditampilkan sebagai tautan.

## Impor yang terselesaikan dan definisi yang dapat diedit

Impor kamus memetakan ID catatan penyedia ke kartu terpasang yang dapat diakses sebelum menambahkan tautan biasa atau berkelompok. Target yang hilang atau ambigu membiarkan nilai hasil tanpa tautan dengan peringatan, bukan menghalangi penyimpanan. Definisi yang telah disimpan memiliki tindakan Edit melalui editor kartu yang memeriksa izin, dan perubahan tersimpan memperbarui ringkasannya. Bidang skema tersembunyi, termasuk data sumber kamus, tidak ditampilkan dalam formulir tetapi nilai tersimpannya dipertahankan.

## Perbaikan pencarian editor

Pencarian goresan disembunyikan saat pola yang berhasil diambil tersedia, termasuk pola dari hasil kamus atau kartu tersimpan. Menghapus pola menampilkan pencarian kembali. Editor definisi menampilkan terjemahan di Konten tanpa tab Definisi yang berlebihan. Makna kamus yang dipisahkan titik koma menjadi definisi tersendiri yang langsung disimpan, dengan terjemahan yang sesuai dan metadata sumber asli tetap tersimpan. Makna terstruktur menggantikan tautan definisi sumber gabungan.

## Tautan pelafalan kamus

Impor kamus menyelesaikan pelafalan lengkap ke Kana terpasang melalui kecocokan lengkap terpanjang, termasuk karakter gabungan seperti きょ dan っく serta posisi berulang. ID entri kanonis disimpan dalam kelompok bacaan berurutan; bacaan dengan karakter yang hilang tidak ditautkan sebagian. Definisi menggunakan kembali kartu yang cocok atau membuat kartu melalui alur editor biasa. Karusel tetap menjadi cara utama membuat kartu turunannya. Karakter dan partikel tetap menjadi lapisan hanya-baca yang dikelola penyedia. Editor kalimat tidak menawarkan pencarian kamus.

## Pemilihan hasil kamus

Pembuatan kosakata memakai satu input kartu gabungan tanpa judul Input yang berlebihan. Pencarian kamus berada tepat di bawahnya dan mencari teks lengkap, termasuk komponen kartu yang dipilih. Pelafalan kosakata dimasukkan secara manual atau diimpor dari kamus, bukan dibuat dari bacaan Kanji. Satu hasil langsung mengisi editor; beberapa hasil membuka daftar horizontal pratinjau kartu dengan judul “Beberapa kecocokan ditemukan”. Pilih kandidat lalu konfirmasi untuk mengimpor bidang, pelafalan, definisi, tag, dan hubungan. Konfirmasi dinonaktifkan sampai kandidat dipilih. Pembatalan mempertahankan editor dan tidak membuat definisi. Teks kartu yang dikonfirmasi kamus dapat dikirim; perubahan teks berikutnya perlu diselesaikan kembali. Pelafalan kalimat tetap berasal dari komponennya dan pencarian kamus untuk kalimat tetap dinonaktifkan.

## Input kosakata dipertahankan

Pencarian kamus kosakata mempertahankan teks yang ditulis, urutan komponen, dan kartu input yang dipilih sambil mengimpor bidang pendukung, pelafalan, dan definisi. Formulir menggunakan kembali definisi yang cocok dengan perbandingan ternormalisasi yang sama seperti API; definisi yang baru diimpor langsung disimpan dalam cache agar makna berulang tidak menyebabkan konflik. Penggunaan kembali menghormati cakupan tujuan dan mempertahankan terjemahan definisi yang ada.

## Kalimat bertransformasi dan cakupan

Pembuatan, penyuntingan, dan tampilan detail kalimat menurunkan pelafalan dari transformasi yang dipilih pada setiap referensi berurutan. Kata dasar yang berulang mempertahankan posisi dan jalur transformasi terpisah. Tanda baca yang dideklarasikan tetap terlihat tanpa menghalangi tautan judul di sekitarnya; tautan judul dan pelafalan membuka bentuk yang dipilih serta mempertahankan navigasi kembali ke kata dasar. Pemindahan cakupan menjalankan alur Study Library yang terdaftar, mengembalikan izin terbaru, dan mempertahankan kartu milik sendiri setelah dipindahkan. Aksi bernama “Pindahkan ke: Pengguna” karena kartu bersama kembali ke cakupan pengguna pembuat aslinya. Konten penyedia, kartu bersama yang bergantung, permintaan tertunda, dan pembatasan akses tetap mencegah pemindahan tidak valid. Instruksi kontribusi secara tegas melarang pengumuman kapabilitas, aksi, rute, atau alur tanpa implementasi yang dapat dijalankan.

## Komponen yang ringkas

Validasi masukan, pola pengenal, bahasa definisi, dan arah varian memakai fungsi bantu bersama yang terfokus. Penanganan audio konten memiliki modul tersendiri, dan paket konten langsung memakai identitas rekaman stabil.

## Kontrol pemindahan langsung

Kartu yang dipilih menampilkan “Pindahkan ke:” diikuti ikon tujuan publik, kelas, atau pribadi yang tersedia. Setiap ikon langsung memulai tindakan cakupan yang sesuai; pemilih kelas tetap tersedia ketika tujuan kelas dipilih.

## Pencarian kamus dan cache

Penyedia kamus mengaktifkan pencarian navigasi melalui `searchable: true` dan kapabilitas `dictionary`. Pencarian hanya memakai lapisan yang didukung dan mengizinkan kamus; kalimat tetap dikecualikan. Halaman Hasil Pencarian menampilkan pratinjau kartu dan semua definisi, menyembunyikan metadata sumber, serta membuka penyusun kartu biasa untuk impor yang disengaja. Cognis menyimpan hasil berdasarkan penyedia, revisi skema, dan kueri yang dinormalisasi selama 24 jam, menggabungkan kueri bersamaan, dan mempertahankan cache setelah mulai ulang. Muat ulang secara eksplisit mengambil data penyedia lagi. Kartu lokal dan tautan pelafalan diselesaikan berdasarkan Library yang saat ini dapat diakses. Jisho tidak memiliki umpan perubahan inkremental; entri baru ditemukan melalui penyegaran atau kedaluwarsa.

## Peninjauan dan pemindahan

Administrator dan pemilik langsung memindahkan kartu pribadi ke cakupan bersama yang diizinkan; pelajar mengirim permintaan peninjauan. Seluruh teks dan ikon tujuan dapat diklik. Permintaan menampilkan kartu yang diajukan, perubahan yang diusulkan, cakupan, pembuat, waktu, status, dan tindakan ringkas sesuai izin. Riwayat keputusan, termasuk penarikan, tetap terlihat. Perubahan kartu dan keputusan berlangsung dalam satu transaksi basis data dengan perubahan status tertunda bersyarat. Validasi gagal membatalkan keputusan; keputusan usang atau berulang ditolak. Salinan pengajuan mempertahankan konten yang ditinjau dan mencegah persetujuan setelah sumber berubah.

## Diagnostik identitas modul dan kepemilikan penyedia browser

Administrator yang memasang modul dengan ID yang dimiliki UUID lain menerima konflik berisi `moduleId`, `installedModuleUuid`, dan `requestedModuleUuid`. Server dan UI siklus hidup modul mencatat identitas ini; pengguna nonadministrator tidak dapat mengaksesnya. ID dan UUID yang cocok tetap memungkinkan pembaruan. Jangan mengubah UUID yang diterbitkan atau menimpa pemasangan yang bertentangan untuk melewati pemeriksaan ini. Kepemilikan siklus hidup penyedia browser dibagikan melalui `ui:providerLifecycle`, sehingga pemuat yang dibundel maupun dilayani langsung merekonsiliasi satu katalog dan tidak memasang penyedia yang sama dua kali.

## Pengikatan sumber integrasi eksklusif

`social:messages:sourceBinding` menyediakan `bind` dan `release` dengan `{roomId, actorAccountId, sourceType, sourceId}`. Resolusi grup juga menerima `source: {sourceType, sourceId}`. Anggota ruang yang berwenang dapat mengikat ruang yang belum terikat; sumber lain menerima `source_conflict` tanpa menimpa pengikatan. Klaim ulang oleh sumber yang sama bersifat idempoten. Pembaruan bersyarat menentukan pemenang klaim bersamaan, dan pelepasan hanya menghapus sumber yang cocok. Resolusi grup dan pengikatan menjalankan alur ctx terdaftar.

## Tindakan browser terbatas dan administrasi terverifikasi

Penyedia browser memperoleh `ui:scopedActions` dari ctx terbatasnya. Pemanggilan dengan `(ctx, moduleId, actions)` mendaftarkan alur yang dapat dijalankan untuk setiap tindakan bernama dan mengembalikan fungsi tindakan. Gunakan fungsi ini untuk membaca dan mengubah administrasi; host membuang alur dan menangani penolakan fungsi usang setelah penghentian. Hak administrator berasal dari peran terkini akun aktif, bukan bidang peran yang diberikan pemanggil.

## Resolusi Kamus yang Efisien

Hasil kamus ditampilkan sebelum referensi dimuat. Pratinjau hanya mengambil ID entri atau ID penyedia yang dirujuk serta karakter dasar untuk pelafalan. Seluruh pustaka karusel dimuat saat membuka editor atau kartu tertaut. Daftar entri memuat referensi sekaligus, bukan per kartu. Daftar permintaan menggunakan baris yang tersedia dan tidak membaca sumber untuk permintaan tanpa izin atau yang sudah selesai. Pencarian dan tinjauan memakai pemilih visibilitas yang sama untuk kolom tersembunyi. Baris cache kedaluwarsa dihapus saat cache ditulis dengan indeks waktu kedaluwarsa. Relokasi yang disetujui menjalankan alur terdaftar yang sama dengan relokasi langsung di dalam transaksi keputusan.

Hasil dari cache juga menjalankan alur pencarian terdaftar agar kait ekstensi diterapkan secara konsisten.

Navigasi belajar hanya meminta tinjauan tertunda; halaman Permintaan tetap menampilkan riwayat status lengkap.

## Navigasi Study yang ringkas

Pencarian kamus tetap dalam satu baris dengan ikon pencarian yang ringkas. Peninjauan tertunda ditandai dengan garis bawah aksen navigasi, bukan bingkai merah.

## Pencarian kamus yang stabil

Jisho mengambil data leksikal dan Kanji terbaru atas permintaan host. Kecocokan kata/bacaan tepat diutamakan atas kecocokan terkait, entri yang lazim ditulis dalam Kana mempertahankan bentuk tersebut, dan hasil judul khusus Wikipedia dikecualikan. Bacaan yang hilang tidak diganti dengan definisi atau pelafalan buatan. Definisi dan metadata sumber tetap terpisah; Cognis mengatur seluruh kebijakan cache.

Cognis core mengelola cache kamus melalui `core:cache`. Kueri tersimpan menjadi dingin setelah satu jam; penggunaan berikutnya memeriksa perubahan pada penyedia. Hasil yang berubah menunggu batas penerbitan dua belas jam, sementara isi yang tidak berubah tetap dipertahankan. Kueri bersamaan berbagi satu pemeriksaan; kegagalan pemeriksaan mempertahankan hasil terakhir yang berhasil. Status cache bertahan setelah mulai ulang. Modul mengambil data penyedia tanpa menjadwalkan kueri atau menyimpan cache respons sendiri. Jisho tidak menyediakan umpan perubahan ringan, sehingga pemeriksaan memerlukan respons pencarian biasa. Tidak ada kontrol Muat Ulang manual. Tautan pelafalan dan kartu selalu diselesaikan terhadap konten yang saat ini dapat diakses.

## Peninjauan dan pemindahan jelas

Permintaan Saya menampilkan riwayat semua status yang diajukan dalam mode baca saja. Tertunda adalah satu-satunya antrean peninjauan. Header menampilkan avatar profil dan tautan pemohon/peninjau; waktu keputusan tersedia pada label status. Judul kartu, pelafalan utama, dan definisi berbagi ringkasan yang dapat diperluas, dengan kartu terkait dikelompokkan menurut relasi. Penurunan visibilitas memakai gaya tombol batal. Arah pemindahan yang bertentangan atau tujuan yang tidak berubah menonaktifkan kontrol sampai pilihan yang bertentangan dihapus.

## Graf bacaan kamus

Data sumber kamus tetap menjadi metadata tersembunyi dalam penyusun kartu dan tampilan detail. Pelafalan impor memakai bacaan Kosakata tersembunyi dengan cakupan yang sama dengan kartu induknya. Kanji dengan beberapa bacaan memakai satu rekaman tersembunyi per bacaan, dengan tautan judul ke Kanji sumber dan tautan pelafalan Kana berurutan; Kanji dengan satu bacaan terhubung langsung ke Kana. Bacaan kata lengkap memakai segmen bacaan Kanji tersedia yang paling dekat dan Kana sisanya. Definisi ditautkan langsung ke bacaan tersembunyi. Cognis menyelesaikan identitas penyedia dan menyimpan graf secara atomik melalui validasi bidang, lapisan, dependensi, dan ACL biasa. Karakter dan partikel tetap dikelola penyedia. Gema Katakana berlebihan dari bacaan Hiragana setara disaring kecuali kamus menyatakan ejaan Katakana tersebut; bacaan on Kanji resmi dan bacaan kata serapan asli dipertahankan.

## Tahap operasi tervalidasi

Impor kamus berulang memakai ulang kartu bacaan tersembunyi yang cocok sehingga tidak menimbulkan konflik duplikat. Validasi dan persistensi berjalan dalam tahap ctx yang sesuai; penyuntingan memakai alur pembaruan dan penolakan hook membatalkan penulisan. Permintaan pencarian tidak valid menerima kode validasi aman; kegagalan internal tak terduga menerima kesalahan server generik. Validasi definisi bersama ditempatkan dalam reuse milik komponen. Core 0.3.109 menambahkan `handlers` opsional per pemanggilan pada `FlowRunOptions`. Handler pemilik berjalan sebelum hook ekstensi pada tahap terdaftarnya, menyumbangkan hasil ke `stageResults`, dan hanya berbagi `data` milik pemanggilan tersebut. Tahap tidak dikenal ditolak sebelum eksekusi. Kegagalan menghentikan tahap berikutnya. Komponen mempertahankan persistensi dalam transaksinya sendiri agar kegagalan hook membatalkan penulisan. Handler per pemanggilan tidak disimpan sebagai hook global.

Core 0.3.109 · Library 2.24.43 · Study 1.8.44

## Komposisi dan pemindahan

Menyorot kartu karusel menandai semua penempatan yang sesuai tanpa penghitung posisi. Seret penunjuk mengurutkan penempatan tanpa memilih teks. Saran kata kerja yang diketik membuka pemilih transformasi dua kolom yang lebih lebar. Definisi tertaut dapat dilepas melalui ikon tempat sampah dan mempertahankan urutan makna kamus. Pengikatan ulang mengganti pendengar sebelumnya; penghapusan kelompok hanya membuka satu konfirmasi.

Pemindahan kartu bersama ke ruang pribadi memerlukan konfirmasi dan permintaan peninjauan administrator, termasuk bagi administrator. Persetujuan menghitung ulang kartu turunan yang kehilangan akses dan menghapus kaskadenya secara atomik bersama pemindahan; kartu pribadi yang kompatibel tetap ada. Kartu terlindungi, konten penyedia, dan permintaan turunan yang masih tertunda menghalangi persetujuan. Izin penghapusan biasa tidak berubah. Permintaan berhasil menampilkan notifikasi singkat; pemilik kartu yang dihapus menerima pemberitahuan kategori Study. Endpoint move-to-personal kini mengembalikan HTTP 201 dengan permintaan tertunda, bukan kartu yang sudah dipindahkan.

## Transformasi kamus

Kartu transformasi menyelaraskan judul, bacaan, dan definisi dalam satu kolom. Tindakan bentuk dasar memakai gaya tombol netral. Saat menyeret, penanda sisipan vertikal tampil sebelum atau sesudah penempatan tujuan. Impor Jisho menyimpan tag keluarga konjugasi yang didukung pada kartu kosakata; kata kerja yang baru dibuat membuka pemilih transformasi sebelum ditambahkan ke komposisi induk. Kata keterangan mempertahankan kelasnya; skema Jepang saat ini tidak mendefinisikan transformasi kata keterangan.

Penyedia kamus dapat mengembalikan prerequisites berupa daftar { key, layer, label }. Setelah hasil dipilih dalam penyusun, Cognis menyelesaikan kartu tulisan gabungan yang sudah ada dalam cakupan tujuan atau mengambil dan membuat kartu yang belum ada beserta definisi dan graf bacaannya. Karakter atomik dan partikel tidak dapat dibuat melalui jalur ini. Kunci alias diganti dengan ID kanonis pada kartu utama dan referensi bacaan tersembunyi. Masukan kosakata tetap utuh; referensi tulisan impor hanya digunakan selama masukan masih sesuai dengan pencarian. Menelusuri hasil pencarian tidak membuat kartu prasyarat.

Kolom wajib yang belum ada dilengkapi melalui penyedia pencarian tambahan yang terdaftar sebelum penyimpanan; pola goresan Kanji berasal dari KanjiVG. Setiap Kanji, definisi, dan bacaan tersembunyinya disimpan sebagai satu graf tervalidasi dalam cakupan yang ditentukan.

## Pertahankan Posisi Papan

Memuat karakter berikutnya ke papan tulis yang terbuka mempertahankan posisi saat ini, termasuk posisi yang dipilih dengan menyeret. Posisi awal hanya diterapkan saat membuka papan baru.

## Identitas dan Impor Kartu

Konflik penggabungan menjalankan alur terdaftar: administrator menerapkan tambahan langsung, sedangkan pelajar mengajukan tinjauan untuk kartu bersama. Komposisi masukan dan nilai tunggal asli dipertahankan; bacaan, makna, tag, dan graf bacaan tersembunyi yang memenuhi syarat ditambahkan. Dependensi pribadi tidak dapat masuk ke graf bersama; penggabungan gagal mempertahankan draf. Hasil kamus dengan komposisi sama menggabungkan bacaan dan makna. Ejaan diperluas langsung diterapkan saat dipilih, sedangkan Lanjutkan atau menutup pemilih menggunakan komposisi persis. Bacaan impor ditelusuri melalui kartu tersembunyi ke Kana individual; penyuntingan mengganti tautan kelompok lama. Pembuatan berhasil menampilkan notifikasi singkat. Karusel dengan relasi sama mempertahankan pilihan satu sama lain, termasuk penghubung kalimat.

Filter mencerminkan konten terlihat pada lapisan terpilih. Relokasi mempertahankan identitas kartu dan mencatat `relocatedAt`; kartu yang dipindahkan tidak dilaporkan sebagai baru, termasuk setelah perpindahan pribadi/bersama berulang. Kartu global baru dan konten penyedia baru tetap mendapat notifikasi. Permintaan menyimpan konteks kartu turunan asli beserta detail dan makna. Riwayat berizin mempertahankannya setelah relokasi; sumber yang dihapus ditampilkan sebagai tidak tersedia.

## Tata letak kartu anak

Kartu anak yang dibuka menempati posisi kosong terdekat di sekitar cabang aktif; kartu latar yang diredupkan tidak mendorongnya ke ujung kisi. Posisi leluhur tetap stabil ketika anak yang lebih dalam dibuka. Jika cabang membutuhkan lebih banyak ruang vertikal, kisi menyediakan ruang tambahan yang dapat digulir dan melepaskannya saat ditutup. Perubahan ukuran jendela atau kartu menghitung ulang posisi. Penunjuk dan fokus papan ketik mengendalikan visibilitas cabang secara konsisten; menekan lama kartu anak melanjutkan cabang yang sedang aktif. Perhitungan tata letak tertunda digabungkan dan dibatalkan ketika cabang ditutup.

## Navigasi Jelajahi

Lapisan belajar berada pada menu samping Jelajahi di `/study/explore/<bahasa ISO>/<navigationSlug>`. Modul dapat menetapkan `navigationSlug` unik per lapisan; jika tidak diberikan, ID lapisan digunakan. Rute Pustaka dan Permintaan tetap sama. Hanya pratinjau kalimat yang memotong judul dan definisi panjang.

## Impor JSON Terstruktur

Gunakan **Impor** di kiri bawah pemilih jenis kartu untuk mengunggah JSON. Pilih cakupan yang dapat ditulis untuk seluruh kelompok. Format berisi `format: "cognis-library"`, `version: 1`, dan larik `entries` yang tidak kosong.

Gunakan `key` entri lain sebagai `entryId` di `references` atau `referenceGroups`. Cognis membuat UUID terlebih dahulu, mengganti kunci, dan memproses ketergantungan yang siap dalam kelompok per lapisan. UUID yang sudah ada harus terlihat dalam cakupan tujuan. Target hilang, lapisan tidak cocok, siklus, goresan tidak valid, bidang wajib kosong, atau konten duplikat membatalkan seluruh transaksi. Respons berisi entri dan pemetaan UUID `ids`.

## Batas Impor Kamus

Setiap kartu mendukung maksimal 8 tag, 16 pelafalan, dan 10 definisi, selain batas panjang bidang dan jumlah hubungan. Impor JSON memvalidasi batas tersebut. Impor kamus memangkas nilai berlebih sebelum menyimpan. Penyusun menolak definisi kesebelas.

## Adaptor Kartu Belajar

Aktifkan adaptor Kartu Belajar Study untuk membuat dek bernama dari lapisan pustaka yang dapat dibaca atau mengimpor catatan TSV kompatibel Anki. Adaptor memiliki rute, penyimpanan, perender, jadwal, antarmuka, dan teksnya sendiri. Balik kartu untuk melihat pelafalan dan definisi. Lagi mengulang setelah satu menit; Baik dimulai dari satu hari dan berlipat dua; Mudah dimulai dari empat hari dan berlipat tiga.

Dek menggunakan jenis sumber daya `studyDeck` dan kemampuan baca `study:flashcards:read`. Kontrol Berbagi Cognis mendukung pengguna, tautan publik, masa berlaku, kata sandi, dan pencabutan. Hanya pemilik dapat mengubah atau menghapus dek. Penerima dapat belajar dan mengekspor dengan jadwal terpisah per akun. Tamu tautan belajar sementara tanpa mengubah jadwal akun. Masa berlaku dan pencabutan diperiksa pada setiap operasi dek.

Impor dan ekspor memakai teks UTF-8 dengan kolom berpetik yang dipisahkan tab: Front, Back, dan Pronunciation opsional. Ekspor menyertakan kepala Anki untuk pemisah, dek, dan teks biasa serta konteks Cognis opsional yang dapat diabaikan Anki. Kutipan, tab, dan baris baru dipertahankan. Format ini adalah TSV, bukan arsip `.apkg`. Riwayat belajar pribadi tidak diekspor.

## Kontrol Gambar

Tombol tutup papan gambar memakai SVG standar sesuai tema. Tombol panduan dinonaktifkan saat semua panduan goresan terlihat. Pergantian karakter mempertahankan posisi jendela pilihan pengguna.

## Tata Letak Latar Tetap Stabil

Popup detail mempertahankan wadah gulir dokumen dan ruang bilah gulir agar menu samping tetap pada posisinya. Papan gambar menggunakan batas mengambang terpisah tanpa mengubah tinggi atau luapan halaman.

## Penelusuran dan Favorit Study

Flashcards membuka daftar dek milik sendiri, dek yang dibagikan kepada akun, dan dek awal lengkap dari penyedia bahasa aktif. Tautan berbagi tetap memerlukan izin yang berlaku dan bukan direktori publik. Menu + di kanan atas menawarkan Buat Dek dan Impor Dek. Jelajahi, Library, dan Flashcards menggunakan favorit Study tersimpan per akun dan kontrol urutan bersama. Pilih urutan penyedia, A–Z, Z–A, terbaru atau terlama. Bintang menjadi emas saat menyaring hasil favorit. Item Library, dek, dan kartu belajar memiliki favorit terpisah. Favorit tidak memberikan hak akses. Papan gambar mengakhiri sesi saat rute berubah dan tidak menimpa kelas composer atau shell.

## Dek Awal dari Penyedia

Deskriptor bahasa dapat menetapkan `starterDecks` berupa `{ key, name, schemaId, sourceRecordIds }`. Kunci stabil dalam paket, nama dipetakan per bahasa, dan hingga 500 kunci rekaman unik menentukan urutan belajar. Cognis menyelesaikan rekaman Library global menjadi ID Library kanonis. ID dek tetap stabil lintas revisi. Dek tidak lengkap dan penyedia nonaktif disembunyikan. Dek awal hanya-baca; jadwal dan favorit tetap pribadi. Detail kartu baru dimuat ketika dek dibuka.

## Hasil Pencarian Kamus

Pencarian kamus membuka `/study/library/search` tanpa parameter URL. Klien gateway menyimpan kueri, bahasa, dan penyedia terakhir dalam preferensi server per akun, yang diambil melalui sesi terautentikasi; akun lain tidak dapat membacanya. Beberapa hasil ditampilkan dalam baris pratinjau horizontal. Memilih pratinjau memperbarui satu tampilan detail dan mempertahankan posisi gulir. Satu hasil langsung membuka detail. Lencana tampil sekali, data mentah penyedia disembunyikan, dan pembuatan kartu memakai composer serta resolusi dependensi yang ada. Masa berlaku dan penyegaran cache tetap menjadi tanggung jawab Cognis core.

Pembuatan dan impor dek yang berhasil menutup editor terlindungi sebelum membuka halaman jelajah yang diperbarui, sehingga perubahan tersimpan tidak memicu dialog pembuangan. Hasil Library khusus favorit menampilkan kartu anak terpilih secara mandiri; urutan penyedia memulihkan penempatan bersarang asli.

## Perbaikan tinjauan

Library 2.26.0 menyediakan `deleteContentPack(root)` melalui kapabilitas penyedia publik. Catatan penyedia, kartu bergantung, tanda terima paket, dan aset dihapus dalam satu transaksi alur penghapusan; kegagalan hook audit membatalkan operasi. Penghapusan berantai menggunakan notifikasi Study yang ada. Skema tetap tersedia bagi konten mandiri buatan pengguna, dan pelepasan tidak memasukkan konten ke daftar blokir sehingga pemasangan ulang dapat memulihkan paket.

Pengujian Study berada di adapter atau gateway pemiliknya. Ekstraksi bacaan, pemecahan label lengkap, respons JSON, dan data pengujian bersama menghilangkan duplikasi. Impor konten dan penanda telah dilihat dipisahkan menjadi modul terarah. Jarak antar deklarasi diperiksa tanpa menaikkan batas ukuran berkas. Pemilihan urutan memakai `theme-select`; kontrol favorit memakai ukuran tombol ikon persegi bertema.

## Galeri dek dan favorit

Flashcards 1.2.0 menampilkan semua dek yang terlihat dalam ubin responsif dengan sumber, bahasa, jumlah kartu, serta jumlah kartu baru/jatuh tempo. Pencarian dek memakai pencocok pencarian Study yang ada. Urutan, filter favorit, dan tata letak filter menggunakan kontrol gateway bersama. Tampilan galeri dan detail menggunakan templat HTML milik Flashcards. Pola judul dan metadata mengikuti [Brainscape](https://www.brainscape.com/subjects) dan [Knowt](https://knowt.com/explore).

Bintang favorit pratinjau Library berada di samping kontrol pilihan dan tidak tertutup petunjuk kartu anak. Perubahan favorit menampilkan notifikasi sukses. Escape menghapus pilihan jamak jika popup belum menangani tombol tersebut. Detail dek menampilkan favorit dek; sesi belajar aktif menampilkan favorit kartu saat ini sebagai gantinya. Ekspor hanya terlihat jika `canExport` mengizinkan pembuat atau administrator, termasuk dek penyedia yang dilihat administrator.

## Latihan Dek Terpadu

Latihan dek dan snapshot bersama memakai satu renderer jawaban bertautan dan satu konversi catatan. Renderer balik/penilaian, gaya dan label yang tidak digunakan dihapus. Pemuatan Library digunakan bersama dalam halaman dek. Visibilitas, tahap ctx, berbagi dan izin penilaian tetap ditegakkan. Pola gambar banyak karakter mempertahankan batas karakter penyedia.

## Halaman Bahasa Bersama

Pilihan bahasa membuka halaman Jelajahi milik Cognis meskipun penyedia konten tidak mendeklarasikan halaman anak. Pergantian bahasa mempertahankan peran tulisan, kosakata atau kalimat yang setara; Flashcards, Library dan Permintaan mempertahankan konteks halaman bersama. Inggris mendeklarasikan alfabet, gabungan huruf, kosakata dan kalimat melalui slug sendiri. Pemuatan favorit yang dibatalkan melepaskan pemasangan tanpa pesan kegagalan yang menyesatkan.

## Bentuk kata opsional dan pratinjau yang terjangkau

Set transformasi penyedia dapat mendeklarasikan `optInTag`, misalnya `plural`. Kartu harus memiliki `matchTags` keluarga dan tag pilihan tersebut sebelum Cognis menampilkan atau menerima bentuknya. Penyusun menampilkan sakelar berlabel penyedia untuk keluarga yang cocok; referensi kalimat menyimpan UUID dasar dan `{setId, path}`. Menghapus pilihan mencegah referensi transformasi baru. Penyedia menetapkan keterhitungan, ejaan tidak beraturan, dan perubahan pelafalan; Cognis menangani pemilihan, penyimpanan, dan validasi. Cabang bersarang memakai posisi bebas benturan terdekat dengan jalur terbuka ke induknya. Pratinjau kalimat memotong judul dan membatasi definisi tanpa mengubah ukuran kisi.

## Galeri bahasa dan latihan dua sisi

Galeri dek memakai `/study/<iso>/flashcards`, dan dek individual memakai `/study/<iso>/flashcards/<deck-id>`. Pemilihan bahasa membuka galeri terkait tanpa bahasa lain. Dek baru menyimpan bahasanya, termasuk catatan impor; dek dari pustaka menentukannya otomatis dan menolak penetapan yang bertentangan. Sisi depan menampilkan pertanyaan, sedangkan definisi dan bacaan berada di baliknya. Kartu baru dapat langsung memulai Membaca atau Menulis. Tindakan kartu sebelumnya mempertahankan jawaban sesi tanpa mencatat ulasan kedua; kartu yang sudah benar kembali sebagai pratinjau depan dan dapat dibalik. Tautan kanonis pustaka memakai kotak bertema dan konfirmasi sebelum meninggalkan latihan.

## Kontrol penunjuk mengikuti tema

Tombol gaya penunjuk bersama memakai warna teks standar tema (`--text`) untuk ikon mouse, laser, dan bidik, termasuk pada halaman komponen tertanam. Warna penunjuk peserta tetap sama.

## Standar modul berbasis templat

Modul baru wajib berasal dari templat modul. Tetapkan jalur rute domain, style, markup, pengujian dan catatan rilis; selaraskan panduan kontributor dan ganti standar dokumentasi lama dengan contoh serta kontrak terkini.

## Siklus hidup sumber daya terbatas

Tambahkan pemasangan penyedia browser, rekonsiliasi katalog dan navigasi milik host, serta registrasi health dan pemilik data keyring publik yang dapat dilepas. Bootstrap gagal membersihkan sumber daya dan rute parsial. Messages mendukung ruang terpisah dan identitas ruang tersimpan tanpa penggantian nama atau penetapan ulang berbasis anggota.

## Ambil ilustrasi sebagai byte mentah

Alirkan ilustrasi terpisah dari pemasangan kode untuk menghindari batas JSON inline GitHub sambil mempertahankan akses privat terautentikasi dan cache hash yang dibatasi. Tolak unduhan kosong, catat kegagalan pengambilan dan cache, pertahankan ikon tidak dikenal dan tampilkan placeholder banner tidak tersedia yang dilokalkan.

## Ketersediaan tidak diketahui tanpa kesalahan pencarian

Rilis 2.0.14 — GET ketersediaan mengembalikan status unknown dengan respons berhasil untuk profil yang tidak ada atau dibatasi privasi. Kedua kasus memiliki bentuk respons yang sama dan tidak membaca preferensi manual atau status kalender. Aturan pemilik, pemblokiran, komunitas, teman, dan profil privat tetap berlaku; perubahan tetap memerlukan pemilik. Indikator avatar menampilkan tidak diketahui tanpa kesalahan tidak ditemukan berulang.

## Jaga detail Study tetap mudah digunakan

Area gambar mengambang berada di atas dock tindakan halaman. Bagian kartu terkait membungkus hingga lima baris, lalu bergulir horizontal dengan scrollbar tersembunyi. Perubahan ukuran menghitung ulang batas, dan penutupan popup melepaskan pengamat. Nilai pelafalan IPA mempertahankan notasi aslinya dan menggunakan tipografi fonetik yang mudah dibaca.

## Satukan tampilan pelafalan Study

Study menyediakan klasifikasi dan gaya pelafalan publik yang digunakan kembali oleh pratinjau Library, judul detail, varian, jawaban kartu, pilihan membaca, dan area gambar. IPA mempertahankan notasi aslinya; bacaan biasa mempertahankan tipografi aplikasi pilihan pengguna. Skema kalimat Jepang dan Inggris memerlukan sedikitnya dua referensi kata.

## Pertahankan ID modul pada kunci

Kunci terjemahan menggunakan `module.<manifest.id>.<feature>.<label>`. Pertahankan ID modul yang terdiri dari beberapa kata beserta tanda hubungnya; untuk `terms-of-service`, gunakan `module.terms-of-service.admin.title`. Sufiks setelah ID modul menggunakan kata huruf kecil yang dipisahkan titik. Metadata manifes, berkas XML, dan referensi kode harus memakai namespace yang sama.

Tampilan marketplace mempertahankan nama, deskripsi, kategori, dan tag yang tersimpan bersama berkas terjemahan katalognya ketika modul terpasang menggunakan namespace berbeda. Preferensi modul terpasang mempertahankan URL terjemahannya sendiri; penemuan katalog baru menggantikan tampilan yang tersimpan.

## Pertahankan tautan legal di footer

Semua klien browser menggunakan registri footer milik `ctx`, termasuk skrip statis dan bundel yang dimuat terpisah. Deskriptor footer dapat meminta `target: "_blank"`; perender menambahkan `noopener noreferrer`. Penyedia autentikasi menyediakan label terjemahan dan konteks autentikasi, sedangkan tautan legal sesi masuk secara eksplisit memakai konteks aplikasi. Pemulihan riwayat dan cache browser memperbarui tautan dokumen legal yang diterbitkan tanpa mengganti tautan inti Lisensi atau Catatan Perubahan.

## Pulihkan navigasi bawaan tautan hukum

Tautan internal dengan target tab baru, klik dengan tombol pengubah, dan unduhan mempertahankan perilaku peramban. Kembali ke rute yang dirender server seperti login memuat dokumen beserta parameter pencarian dan fragmennya, alih-alih membiarkan tampilan SPA sebelumnya tetap terlihat.

## Wajibkan kunci bahasa tanpa teks pengganti literal

Instruksi AI melarang teks bahasa Inggris yang ditanam langsung untuk pengguna dalam setiap alur. Nilai yang tidak tersedia dalam bahasa pilihan dapat menggunakan kunci yang sama dari sumber daya XML bahasa Inggris. Nilai pengganti bahasa Inggris yang hilang atau kosong harus menimbulkan kegagalan eksplisit, bukan menampilkan teks Inggris literal, kunci mentah, atau teks kosong. Kesalahan terjemahan yang hilang tidak boleh disembunyikan.

## Pusatkan penggantian bahasa di Core

Fungsi bersama Core `createI18n` dan `extendI18n` menyelesaikan nilai bahasa pilihan yang hilang atau kosong melalui XML bahasa Inggris per kunci untuk bundel inti, modul, dan komponen. Kunci yang tidak terselesaikan menimbulkan `missing_translation:<key>`. Modul memasok URL bundelnya dan menggunakan resolver host tanpa menerapkan kebijakan pengganti sendiri.

## Gunakan peristiwa kegagalan gambar yang stabil

Log pengambilan gambar marketplace menggunakan pengenal peristiwa yang stabil dengan bidang kegagalan terstruktur yang sudah ada.

## Perbarui aset modul secara mandiri

Core menambahkan revisi modul terpasang ke URL aset UI milik modul saat mendaftarkan kontribusi. Skrip dan berkas bahasa modul divalidasi ulang tanpa mewarisi masa cache tetap milik rilis host. Service worker mengambil aset modul langsung tanpa cadangan cache dan mengganti cache asetnya. Pembaruan modul mengubah identitas impor titik masuk sehingga skrip lama tidak meminta dependensi yang telah dihapus.

## Audio kamus dan cache host

Jika pelafalan yang diminta tidak tersedia dalam paket, English Study mengambil kata dari English Dictionary API dan mengunduh MP3 yang cocok dari endpoint media pelafalannya. Bacaan IPA pilihan harus cocok; pelafalan lain tidak pernah dipakai sebagai pengganti. Hanya media HTTPS pada `api.dictionaryapi.dev` yang diterima, pengalihan ditolak, pencarian dan unduhan berbagi satu tenggat, dan kedua respons dibatasi ukuran byte saat streaming. Rekaman yang tidak tersedia tetap menghasilkan kesalahan eksplisit. Layanan suara Google tidak digunakan.

Cognis mengelola cache rekaman, bukan modul. Setelah otorisasi, cache Files privatnya memakai ulang rekaman yang berhasil untuk kartu lain dan setelah mulai ulang. Permintaan pemutaran bersamaan berbagi pengambilan dan penyimpanan. Kunci mencakup identitas penyedia, revisi, bahasa, peran, label, dan bacaan; bacaan atau revisi penyedia yang berubah diselesaikan secara terpisah. Permintaan atau penulisan yang gagal dapat dicoba lagi. Modul menghubungi kamus hanya jika pemutaran diminta dan cache tidak tersedia.

## Komposisi dengan jeda dan penggantian manual

Rekaman awal memakai model neural multibahasa Kokoro secara offline dengan suara Inggris `bf_emma` dan Jepang `jf_alpha`. Klip memakai 128 kbps, jeda awal 200 ms, jeda akhir 180 ms, normalisasi puncak terbatas, dan ucapan lebih lambat. Atribusi model dan lisensi Apache disimpan di `data/audio/VOICE-LICENSE.txt`; inventaris mencatat suara dan pengolahannya.

Kartu kalimat memiliki bidang audio opsional. Pada pemutaran pertama, Cognis mengotorisasi setiap unsur, memilih hanya kelompok pelafalan pertama, menerapkan transformasi yang dipilih, dan membuat satu WAV berkelanjutan dengan jeda awal serta jeda kata, koma, dan akhir kalimat. Rekaman disimpan secara privat; byte unsur, perubahan bacaan, transformasi, dan jeda menentukan identitasnya. Mekanisme ini berlaku sesuai kebutuhan untuk kartu baru maupun yang sudah ada. Mengunggah audio di penyusun biasa langsung menggantikan pemutaran hasil komposisi. Menghapus berkas eksplisit mengaktifkan komposisi otomatis lagi. Penyedia memasok klip kata; Cognis mengelola komposisi dan kebijakan cache.

## Cakupan inventaris referensi

Katalog referensi Jepang memuat seluruh 13.108 karakter dari salinan resmi KANJIDIC2 yang dipaketkan. Katalog Inggris memuat seluruh 135.969 entri leksikal Open English WordNet dengan 127.311 kunci ternormalisasi. Keduanya adalah penyedia kamus terpisah yang dimuat sesuai kebutuhan, bukan 149.077 kartu awal yang langsung diimpor. Pilih Kamus Referensi dalam pencarian Study untuk mengimpor entri yang didukung melalui validasi graf biasa. Rekaman tanpa makna atau bacaan yang dapat digunakan tetap tidak diketahui; pelafalan, terjemahan, dan diagram goresan tidak dibuat-buat. Inventaris ini bukan seluruh Han Unicode dan bukan daftar semua kemungkinan kata bahasa Inggris.

Bacaan Kanji diurutkan berdasarkan bukti umum JMdict dan penanda frekuensi yang tersedia, termasuk bentuk okurigana; tautan kelompok dan audio awal mengikuti urutan yang sama. Audio Kanji selalu memakai pelafalan pertama yang ditulis. Kartu kata Inggris yang ada memiliki satu IPA; entri referensi mempertahankan urutan sumber dalam ragam Britania pilihan sebelum ragam lain. Frekuensi pelafalan bergantung pada konteks dan sumber tidak menyediakan peringkat universal untuk setiap bacaan.

## Pertahankan audio varian kalimat

Komposisi kalimat meminta label dan pelafalan utama dari transformasi terpilih, termasuk jalur bertingkat. Jika rekaman varian tidak tersedia, pemutaran gagal secara jelas alih-alih menelusuri referensi pelafalan bentuk dasar. Aturan yang sama berlaku untuk pemutaran varian langsung dan penyusun bertingkat.

## Sembunyikan jawaban menulis

Judul pad mula-mula menyamarkan karakter dengan tombol standar untuk membukanya. Memuat karakter lain menyamarkannya kembali. Sesi mengambang menyediakan kartu aktif melalui kapabilitas yang dapat dilepas `study:drawing:observe`. Pratinjau Library yang cocok tetap terbuka, diburamkan, dan tidak interaktif sampai pad berganti karakter atau ditutup; bacaan dan arti tetap tersedia di pad. Mode Menulis tertanam memakai penyamaran yang sama serta melaporkan pembukaan karakter sebagai percobaan berbantuan.

## Komit

- [8423f71c](https://github.com/Cognis-Labs-HQ/Cognis/commit/8423f71cb9279bdbc927e39cdd94fcdeb651a91a)
- [608f38a5](https://github.com/Cognis-Labs-HQ/Cognis/commit/608f38a59532f0b294d7384576ca882f2d94a4ba)
- [3dbb7248](https://github.com/Cognis-Labs-HQ/Cognis/commit/3dbb72488ea7564c1d2eeaa33b3928f64e46563e)
- [88b9bdf1](https://github.com/Cognis-Labs-HQ/Cognis/commit/88b9bdf17d59edfc6726deacb42487d382ef8fca)
- [70bf58e8](https://github.com/Cognis-Labs-HQ/Cognis/commit/70bf58e8761b41b554d9710bd908c4e7b1717cee)
- [c1874177](https://github.com/Cognis-Labs-HQ/Cognis/commit/c1874177fc1875ceab65c8b7aac58d60c5c5e091)
- [d6f1cf21](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6f1cf219f2739174c01019b358ab939a24659f7)
- [8e38ded6](https://github.com/Cognis-Labs-HQ/Cognis/commit/8e38ded6f03e8e36d225e8d425625c1b719fa112)
- [c916c66f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c916c66f2095da249058883026fa7eba94005316)
- [227f2166](https://github.com/Cognis-Labs-HQ/Cognis/commit/227f21669b5ab0a3473f0bf5f547bfdb424f4ca2)
- [7d00b6a7](https://github.com/Cognis-Labs-HQ/Cognis/commit/7d00b6a7c8e6c0eaaf5315d595618f33c32dc3dc)
- [0c9c4e37](https://github.com/Cognis-Labs-HQ/Cognis/commit/0c9c4e376ffde5af485772367430d3122b589b0e)
- [32ca0df4](https://github.com/Cognis-Labs-HQ/Cognis/commit/32ca0df41b363566394ac0d4026ec73ed53ce9ae)
- [a66d0837](https://github.com/Cognis-Labs-HQ/Cognis/commit/a66d08376445e937ea0e57d64c5975c9c02ed504)
- [800b1809](https://github.com/Cognis-Labs-HQ/Cognis/commit/800b1809b0378fcf6aaa480461d0e22b703c2ca4)
- [ea81a944](https://github.com/Cognis-Labs-HQ/Cognis/commit/ea81a944257040a042c1d0c0c9b2447768390221)
- [3b51abc1](https://github.com/Cognis-Labs-HQ/Cognis/commit/3b51abc17cc6ed3a75921bfa242d16c33aae2ce0)
- [2e2d0928](https://github.com/Cognis-Labs-HQ/Cognis/commit/2e2d092813312978c2f69640389f6401ec0230f5)
- [cff7223c](https://github.com/Cognis-Labs-HQ/Cognis/commit/cff7223cd64c36372e64484c362ba9b1a1f4e2f7)
- [bbb6bb8b](https://github.com/Cognis-Labs-HQ/Cognis/commit/bbb6bb8bd8e2d70a6ec571c2a69e58665a90ca04)
- [e1e564bf](https://github.com/Cognis-Labs-HQ/Cognis/commit/e1e564bf66580e7a1e8eaf24080c646f686d982c)
- [584fb0b4](https://github.com/Cognis-Labs-HQ/Cognis/commit/584fb0b46ebb77bd43e585b3b41a279a0e6e9bfa)
- [7d597603](https://github.com/Cognis-Labs-HQ/Cognis/commit/7d597603b3b1faf6df9d5c7a98973362312236d9)
- [61002cd2](https://github.com/Cognis-Labs-HQ/Cognis/commit/61002cd2578510ff6d823b8ebb454364e2c930cd)
- [e8dac803](https://github.com/Cognis-Labs-HQ/Cognis/commit/e8dac803472e1dfc8a5bb2acf3082da88dad8a05)
- [a6aa6fe8](https://github.com/Cognis-Labs-HQ/Cognis/commit/a6aa6fe85403331903570c9cd20f115ea48576be)
- [1337d0a3](https://github.com/Cognis-Labs-HQ/Cognis/commit/1337d0a332a5ccb2d1081816d55e453f90a0c0bc)
- [eda8cb2a](https://github.com/Cognis-Labs-HQ/Cognis/commit/eda8cb2ab208b458f73e79f5b89fd6413ccbab77)
- [337b2351](https://github.com/Cognis-Labs-HQ/Cognis/commit/337b23512bb9fd25e0ffce0d94058e4dcc959e84)
- [67b413b5](https://github.com/Cognis-Labs-HQ/Cognis/commit/67b413b535c0a8662cfe92c1170ccfc4742e6eae)
- [79cbfa05](https://github.com/Cognis-Labs-HQ/Cognis/commit/79cbfa05a5409f780bb42f4ea5ac7c0f8ec67f01)
- [e4daa661](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4daa661ee08b05a48ecba33182c490d4352e660)
- [274fc626](https://github.com/Cognis-Labs-HQ/Cognis/commit/274fc626dbea45d3c8d66c82b98f1a0ba87a8052)
- [024d7dfe](https://github.com/Cognis-Labs-HQ/Cognis/commit/024d7dfe05f713f390d7b9fb00410591018c9bf6)
- [281d2ac4](https://github.com/Cognis-Labs-HQ/Cognis/commit/281d2ac4dca994692513c8069ad21fe9affebedc)
- [f5214c14](https://github.com/Cognis-Labs-HQ/Cognis/commit/f5214c148cab6eac78e3f8ee8aed3847ffba2201)
- [bec24655](https://github.com/Cognis-Labs-HQ/Cognis/commit/bec24655948ca3a64ea6ab4f95f7897aecee68ac)
- [1501e390](https://github.com/Cognis-Labs-HQ/Cognis/commit/1501e390dce637fb660c5b540a4235e3e7c98f29)
- [48d14c1b](https://github.com/Cognis-Labs-HQ/Cognis/commit/48d14c1ba63d887a04305306f8c9de7565361dfa)
- [87248429](https://github.com/Cognis-Labs-HQ/Cognis/commit/872484294f2d3b777c6123286db62c78dc08f7f8)
- [452e3eb3](https://github.com/Cognis-Labs-HQ/Cognis/commit/452e3eb3fc5b9e2ca86464904e7f6477992b7c32)
- [34fd7e7d](https://github.com/Cognis-Labs-HQ/Cognis/commit/34fd7e7d6ff01fa613a0c8d9aef006fcbb1c49d0)
- [dc044846](https://github.com/Cognis-Labs-HQ/Cognis/commit/dc044846df3a4944e984ed27f7e87a2cd68ca5c3)
- [38b4662a](https://github.com/Cognis-Labs-HQ/Cognis/commit/38b4662a16a76798c6df10f0e8b489fdda17795b)
- [02761dc7](https://github.com/Cognis-Labs-HQ/Cognis/commit/02761dc7e8cd2abc96bcf1b593ee78674b03b8ed)
- [e644ccb1](https://github.com/Cognis-Labs-HQ/Cognis/commit/e644ccb16bcf5873ae95d373d84432b9a4bd2bbd)
- [efe439a8](https://github.com/Cognis-Labs-HQ/Cognis/commit/efe439a8e4171e9e37d5040bb500b079e77a169e)
- [2f3df8bd](https://github.com/Cognis-Labs-HQ/Cognis/commit/2f3df8bd0a160131db564451806303e24af77072)
- [ac5f84b5](https://github.com/Cognis-Labs-HQ/Cognis/commit/ac5f84b55f918e7e6121eeedbb32d5dc383099c1)
- [c81f0310](https://github.com/Cognis-Labs-HQ/Cognis/commit/c81f0310c9966c5d4783b51bac6bbb52ff0fb5d5)
- [19956a20](https://github.com/Cognis-Labs-HQ/Cognis/commit/19956a2031ff88c897f18799d5a01ac688166bc9)
- [2b40ad02](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b40ad028ac75b37d161c075b04db41a85fdcaad)
- [c5d3f42d](https://github.com/Cognis-Labs-HQ/Cognis/commit/c5d3f42d059d2aee21377f0f28d4ab2c2f026679)
- [8a9bf125](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a9bf125fa71a51cd45ac1e389d932c2bf1ca71e)
- [f3c01246](https://github.com/Cognis-Labs-HQ/Cognis/commit/f3c012463c0a0a10018d8111a93cd61be82c8b00)
- [6aab168c](https://github.com/Cognis-Labs-HQ/Cognis/commit/6aab168c82f96e8991583d14d45e7f43f7c32efe)
- [caecf066](https://github.com/Cognis-Labs-HQ/Cognis/commit/caecf066d84d75cdf09fc337052e5df1d9393195)
- [618ba4f5](https://github.com/Cognis-Labs-HQ/Cognis/commit/618ba4f547fbde0d4dc2a9145ef02aa9451b180b)
- [0bb340a8](https://github.com/Cognis-Labs-HQ/Cognis/commit/0bb340a8bce6ce96596bfbfe36647743b696574d)
- [884b73f2](https://github.com/Cognis-Labs-HQ/Cognis/commit/884b73f2286cfd8922494c2fe65ac3b51833ea54)
- [370b8072](https://github.com/Cognis-Labs-HQ/Cognis/commit/370b8072cdf1426028d40cd35876a970639a8380)
- [2134b228](https://github.com/Cognis-Labs-HQ/Cognis/commit/2134b22899bec50afe497bb76cc8502e4f5e23ad)
- [e13f1ae7](https://github.com/Cognis-Labs-HQ/Cognis/commit/e13f1ae7cb2aadf237fd68efb03ca6f99fbf1304)
- [f5c4a1b0](https://github.com/Cognis-Labs-HQ/Cognis/commit/f5c4a1b0f7ca4e702c8acd009d456e6c259f45fa)
- [71214834](https://github.com/Cognis-Labs-HQ/Cognis/commit/71214834eda07dce6a66d5ab936af0619057035e)
- [102676cc](https://github.com/Cognis-Labs-HQ/Cognis/commit/102676cc7129164be361c769878169ce4e416962)
- [1755abca](https://github.com/Cognis-Labs-HQ/Cognis/commit/1755abcae0467c199e1ff2206c205f5e84eb2739)
- [c44c924c](https://github.com/Cognis-Labs-HQ/Cognis/commit/c44c924cd0856b818eca7b26a165c61af58e4de6)
- [129d45e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/129d45e0eee66ab1c691d850c93b8c5dacb363de)
- [6994d3de](https://github.com/Cognis-Labs-HQ/Cognis/commit/6994d3de2dbb35c0321566ccc75fdc9d0bc621ea)
- [835f7889](https://github.com/Cognis-Labs-HQ/Cognis/commit/835f7889aab52125ab607d1cbaca4a85340e9377)
- [6711b43b](https://github.com/Cognis-Labs-HQ/Cognis/commit/6711b43b9e01071fb2870536ac31e40157fc7354)
- [7dba3a24](https://github.com/Cognis-Labs-HQ/Cognis/commit/7dba3a243376b31550328461840e869787092e5e)
- [119e9b3d](https://github.com/Cognis-Labs-HQ/Cognis/commit/119e9b3d21706fc6a65b049650ee484222f916b0)
- [c9715ab3](https://github.com/Cognis-Labs-HQ/Cognis/commit/c9715ab3d9b044e06a394e09fdda27ec5f60cf4d)
- [89434568](https://github.com/Cognis-Labs-HQ/Cognis/commit/89434568d0d5865a260e3f515c5236eec7f940bd)
- [7e4af45](https://github.com/Cognis-Labs-HQ/Cognis/commit/7e4af451f4cd017081c54a3f11ff505d6e9c71c4)
- [beedf4e](https://github.com/Cognis-Labs-HQ/Cognis/commit/beedf4ef2bd4bdb7d6f54d71de91b61ced50c4fa)
- [2bb66db](https://github.com/Cognis-Labs-HQ/Cognis/commit/2bb66db7203c0e8dfdf66b847aa3e11081ff4c19)
- [a6d2410](https://github.com/Cognis-Labs-HQ/Cognis/commit/a6d2410144a73edac345feab9b6eb6e6b78e56ee)
- [6136fcb](https://github.com/Cognis-Labs-HQ/Cognis/commit/6136fcbfec13cd57346e52a38d616782f0793960)
- [f8877c7](https://github.com/Cognis-Labs-HQ/Cognis/commit/f8877c716570c9285fc7b2ce71791a27543053ba)
- [a8a115f](https://github.com/Cognis-Labs-HQ/Cognis/commit/a8a115f78a213a793a5b2fd27ccdb9fdf1c422ee)
- [24b91f9](https://github.com/Cognis-Labs-HQ/Cognis/commit/24b91f948aee0815c0dec942cfef6a606c78a1f0)
- [e461c37](https://github.com/Cognis-Labs-HQ/Cognis/commit/e461c37c4f4758e84300e8cab721eb92bb6a198d)
- [b32fcf7](https://github.com/Cognis-Labs-HQ/Cognis/commit/b32fcf7b6a21b08a61808f5f60d6c5c4e1be8df0)
- [c6a32c6](https://github.com/Cognis-Labs-HQ/Cognis/commit/c6a32c6a68b10a562fa8368faedc8f95493d2018)
- [856cd80](https://github.com/Cognis-Labs-HQ/Cognis/commit/856cd809b37f3abe4026cea01f7ece234b1ced87)
- [27f78bc](https://github.com/Cognis-Labs-HQ/Cognis/commit/27f78bcb096f891fa3790c4bf89221d9b842ff84)
- [eea52d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/eea52d437b3b8084e4bab393cb7e5f249a5447e3)
- [ddf1772](https://github.com/Cognis-Labs-HQ/Cognis/commit/ddf17726e4ef3c73a44411aeb3e4356a384848aa)
- [6d34532b](https://github.com/Cognis-Labs-HQ/Cognis/commit/6d34532b8a1346e5e83e67c7734c0f5d69191c1d)
- [1fd0cba1](https://github.com/Cognis-Labs-HQ/Cognis/commit/1fd0cba13366c2105ab3b62f4a7211042e6b52f3)
- [b30e0ee8](https://github.com/Cognis-Labs-HQ/Cognis/commit/b30e0ee83fddb7a9dafbe604d7f003567a8095b6)
- [55e98e0f](https://github.com/Cognis-Labs-HQ/Cognis/commit/55e98e0f174d600915fb7e35db3021db3f382328)
- [77013ffd](https://github.com/Cognis-Labs-HQ/Cognis/commit/77013ffdf80946228f3d5fe23d7149e274a195a2)
- [5ff1a103](https://github.com/Cognis-Labs-HQ/Cognis/commit/5ff1a103f7ee78883212810a1e30c37eaa097248)
- [44b938d](https://github.com/Cognis-Labs-HQ/Cognis/commit/44b938d30d2f521dc8f5adde88183a2e9a8c4996)
- [7f68be4](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f68be420c3c82742dd16a2b8da5c6dfacc5459d)
- [e6bcfe3](https://github.com/Cognis-Labs-HQ/Cognis/commit/e6bcfe3bf167bf6b4d1e8a9feca648e7f2b41d9e)
- [220457c](https://github.com/Cognis-Labs-HQ/Cognis/commit/220457c4c97295029577c3a1c481427bbb1b4657)
- [dd1f7a2](https://github.com/Cognis-Labs-HQ/Cognis/commit/dd1f7a270483a29c5bd0e74933611988baf4ea0c)
- [8c29d55](https://github.com/Cognis-Labs-HQ/Cognis/commit/8c29d5554f99500b7fcbcbc954ea965461fb2ce4)
- [0833f95](https://github.com/Cognis-Labs-HQ/Cognis/commit/0833f953889f056079b252135debb298f3e56051)
- [e64f233](https://github.com/Cognis-Labs-HQ/Cognis/commit/e64f23384deed84e371fbabe3649cfdad30abf59)
- [d5377cd](https://github.com/Cognis-Labs-HQ/Cognis/commit/d5377cd20e1e0714e86966f1e9e1d4a584d7951f)
