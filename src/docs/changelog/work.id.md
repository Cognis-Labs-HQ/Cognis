# Navigasi Kartu Anak Stabil

**Cabang Fitur:** work

## Posisi Kartu Anak Stabil

Kartu anak mempertahankan posisi yang telah disesuaikan saat cabang yang lebih dalam dibuka. Turunan baru ditempatkan berdasarkan kedalaman pada slot bebas yang terlihat dengan jarak antartabrakan, sehingga kartu dan konektor tidak melompat atau bertumpang tindih.

## Navigasi Penunjuk Andal

Rute diagonal kini memiliki koridor sasaran berkelanjutan yang lebih besar, perubahan cabang memakai jeda singkat untuk mengenali niat penunjuk, dan kartu aktif tidak lagi berdenyut. Urutan arah alternatif juga menjaga tata letak awal kartu anak tetap rapat di sekitar sumbu pilihan.

## Karosel Komposisi Terpadu

Input dan pelafalan kini memakai input token serta perenderan karosel yang sama dan dapat digunakan kembali. Karosel input berada tepat di bawah bidangnya, token terpilih memakai tombol hapus ringkas yang sama, dan kontrol pembuatan dependensi hanya tampil untuk lapisan yang biasanya dapat dibuat pengguna.

## Komposisi Dependensi Langsung

Kartu yang dibuat melalui kontrol tambah carousel kini kembali melalui alur pemilihan yang sama seperti kartu yang sudah ada, sehingga langsung ditambahkan ke tahap aktif. Bidang pelafalan karakter alternatif kini menyertakan carousel karakter atomiknya meskipun relasi penyedia menggunakan peran presentasi yang lebih umum.

## Pencarian Guratan dan Validasi Terpandu

Composer yang mendukung guratan kini menempatkan tindakan pencarian berbasis bidang di bawah judul khusus Pola Guratan dan menggambar data yang dimuat dalam pratinjau ringkas. Validasi relasi wajib kini menandai tab yang terdampak, membuka tab dengan bidang tidak valid paling awal, lalu memfokuskan bidang atau tindakan definisi yang perlu diperbaiki.

## Detail Judul Popup Selaras

Definisi popup tidak lagi memakai awalan tanda pisah panjang. Kelompok pelafalan dan definisi kini berbagi baris judul utama dan disejajarkan secara vertikal dengan judul kartu.

## Persyaratan Composer Akurat

Persyaratan definisi kini menandai tab Definisi dan tindakan tambah, sedangkan bidang pelafalan yang tidak valid menandai dirinya langsung. Tab mempertahankan warna normal dan hanya menampilkan tanda bintang merah. Karakter alternatif boleh tanpa definisi dan kini memuat semua relasi pelafalan non-definisi. Penyedia pencarian guratan dan kamus mendeklarasikan kapabilitas netral untuk penempatan yang tepat serta pilihan keluar kamus per lapisan. Tag kini tampil terakhir pada formulir Konten.

## Validasi Formulir Bertab Pakai Ulang

Validasi multi-tab Library kini menggunakan pengontrol validasi tab milik composer formulir bersama, bukan implementasi khusus adapter. Pengontrol pakai ulang mengelola aktivasi tab, penanda tidak valid, dan fokus ke bidang tidak valid pertama; Library hanya menyediakan target fokus khusus definisi dan kelas gayanya.

## Perutean Composer Karakter Alternatif

Composer karakter alternatif kini mempertahankan karusel pelafalan karakter yang dinyatakan penyedia dan hanya menggunakan relasi karakter atomik sebagai cadangan, sehingga kartu kosakata tidak lagi muncul di bawah Pelafalan. Penyedia pola guratan diklasifikasikan melalui metadata kontrak netral atau label bidang yang dilokalkan, sehingga aksinya dipindahkan dari baris pencarian umum dan ditampilkan sebagai “Cari” di dalam Pola Guratan.

## Pembatasan Pelafalan Karakter Alternatif

Carousel pelafalan karakter alternatif kini ditentukan hanya dari relasi yang menargetkan unit tulisan atomik. Daftar carousel konstruktor tetap menjadi referensi payload formulir dan tidak lagi dapat memunculkan carousel kosakata dalam editor pelafalan karakter alternatif.

## Pemulihan Tampilan Library dan Carousel Karakter

Tampilan Kata Kerja dan Kata Keterangan yang dideklarasikan penyedia kini diselesaikan melalui rute SPA lapisan Library, bukan menghasilkan 404. Composer karakter alternatif kini mengisi pelafalan dari lapisan karakter atomik di seluruh skema dan menghilangkan relasi kosakata yang tidak terkait sambil tetap mempertahankan definisi.

## Penyelarasan Payload Karakter Alternatif

Payload formulir karakter alternatif kini menyalin daftar carousel pelafalannya langsung dari payload formulir kosakata pada skema yang sama. Kode inferensi dan penyaringan carousel khusus karakter alternatif sebelumnya telah dihapus.

## Mengganti Carousel Kosakata

Penyelarasan formulir karakter alternatif kini mengganti target pelafalan Kosakata beserta relasi perendernya dengan relasi karakter yang digunakan kartu Kosakata. Pembuatan pelafalan Kanji kini menampilkan carousel karakter, bukan Kosakata.

## Perbaikan Pelafalan dan Duplikat

Pelafalan kata dan kalimat eksplisit kini menghentikan penurunan karakter rekursif. Input duplikat yang terlihat diblokir dan melanjutkan akan memilih kartu yang ada; penyimpanan permintaan mengenali jenis update dan merge.

## Definisi Tetap di Bawah Judul

Definisi popup kini dimulai di bawah judul kartu dan membungkus pada area judul yang tersedia, bukan dipaksa ke sisi kanan.

## Pelafalan Partikel Dipertahankan

Resolusi pelafalan kini berhenti pada partikel itu sendiri sehingga referensi karakter tidak menggantikan bacaan kontekstual yang telah ditulis.

## Edit Pelafalan Tersimpan

Tahap pelafalan kosong kini menghasilkan toast kesalahan. Kartu pelafalan tersimpan memuat kontrol hapusnya, dan memilihnya memulihkan kartu komponen ke tahap serta carousel untuk diedit.

## Penyuntingan Definisi Lengkap

Kotak centang definisi pratinjau kini berada di Definisi, dan editor kartu yang sudah ada dapat membuat serta langsung memilih definisi tambahan.

## Definisi Induk yang Stabil

Atribusi induk kini tetap dikelompokkan pada baris bacaan sebelum definisi. Kartu yang mewarisi definisi induk mempertahankan definisi di bawah judul tanpa memecah label induk yang dilokalkan pada judul popup.

## Pulihkan Tampilan Bertag

Tag paket konten kini dipertahankan selama validasi dan penyerapan ke dalam rekaman entri Pustaka. Tampilan Kata Kerja dan Kata Keterangan yang dideklarasikan penyedia kini dapat mencocokkan serta merender kosakata bertag, bukan melaporkan lapisan kosong.

## Pohon Transformasi Tersusun

Transformasi kata kerja dan kata keterangan kini mendukung rantai bercabang yang diperluas, bacaan dan definisi khusus transformasi, serta tata letak pohon teknologi yang terhubung. Penyusun kalimat dapat memilih bentuk korsel yang ditransformasi sambil mempertahankan referensi kanonis, dan referensi tersebut dibuka kembali dengan bentuk yang ditulis beserta jalur lengkapnya.

## Kartu Anak Aman dari Induk

Penempatan kartu anak kini mengecualikan setiap slot leluhur dan mencari posisi diagonal serta kardinal pada jarak yang makin besar. Kartu anak yang terhalang dipindahkan ke luar melalui slot tambahan, bukan menutupi leluhur atau ditahan.

## Pohon transformasi interaktif selebar halaman

Tampilan pohon transformasi kini dimulai sebagai kisi kartu padat selebar halaman. Kartu tanpa transformasi yang tersedia tetap tidak aktif. Membuka kartu yang dapat diperluas memindahkannya ke atas, menganimasikan kartu lainnya hingga menghilang, dan mengembangkan pohon tepat di bawah akar yang dipusatkan sepanjang lebar konten; kontrol tutup mengembalikan kisi. Memilih transformasi menyorot dan terus menganimasikan seluruh jalurnya kembali ke akar, sedangkan label transformasi ditumpuk di atas nilai agar tidak meluber pada kartu sempit.

## Jalur transformasi berkelanjutan dan akar stabil

Pohon transformasi kini mempertahankan kartu kata kerja atau kata keterangan sumber sebagai akar visual yang tidak berubah dan menghapus ringkasan bentuk terpilih yang berulang di bawahnya. Segmen penghubung bertemu tanpa celah dan beranimasi terus-menerus di seluruh pohon, sementara jalur asal yang dipilih tetap ditonjolkan. Mengklik kartu sumber yang sudah terbuka kini membuka tampilan detail standarnya.

## Pemilihan transformasi terintegrasi kosakata

Entri verba dan adverbia kini tetap berada di halaman Kosakata, tempat tag transformasi yang dideklarasikan penyedia tampil sebagai filter, bukan tujuan navigasi terpisah. Aturan transformasi dapat mendeklarasikan metadata `marker` terlokalisasi dan Cognis menyisipkannya ke slot `{{ marker }}` pada definisi yang dirujuk (misalnya `to {{ marker }} watch` menjadi `to (want to) watch`). Nama bentuk dipindahkan ke tooltip informasi pada setiap simpul. Popup detail standar menyediakan tindakan Varian yang membuka pemilih graf khusus; memilih simpul menggambar ulang entri dasar dengan judul, pelafalan, definisi, dan masukan gambar yang telah ditransformasi sambil menonaktifkan penyuntingan. Karusel penyusun menandai entri yang dapat ditransformasi dan memakai pemilih dua kolom untuk memilih satu transformasi atau mempertahankan bentuk dasar.

## Graf transformasi seimbang dan penanda andal

Graf transformasi kini mengukur setiap cabang berdasarkan seluruh subpohon turunannya, mempertahankan lebar minimum dua belas rem untuk setiap simpul, menyebarkan cabang sepanjang lebar intrinsik graf, dan menggulir secara horizontal saat graf melebihi dialog. Hal ini mencegah keluarga konjugasi yang dalam atau sangat bercabang menghimpit kartu menjadi kolom sempit. Resolusi penanda definisi kini menerima metadata terlokalisasi atau string langsung, mencocokkan `{{ marker }}` maupun `{{marker}}`, menggunakan lokal antarmuka aktif, mengganti setiap penanda dalam teks multidefinisi, dan memprioritaskan templat penanda yang ditulis penyedia daripada penggantian definisi penuh lama.

## Graf Transformasi dan Ketepatan Definisi

Pohon transformasi kini memakai garis graf SVG melengkung, membatasi pengguliran pada graf, dan menjaga tindakan popup tetap terlihat. Varian yang dipilih kini dipertahankan pada tampilan detail, memperbarui setiap definisi yang dirujuk dengan penanda penyedia, dan menempatkan kontrol Varian di sebelah kiri.

## Tautan Homograf yang Benar

Komposisi judul cadangan kini mengikuti urutan lapisan semantik. Entri kosakata dengan bentuk tulisan yang sama menaut ke unit tulisan atomik atau majemuknya, bukan ke satu sama lain, sementara komposisi kalimat tetap mengenali entri kosakata.

## Graf Transformasi Ringkas

Graf transformasi kini memakai satu baris horizontal untuk setiap kedalaman, menempatkan definisi yang lapang di bawah setiap kartu, dan menahan luapan kedua sumbu di area graf setinggi viewport agar tindakan popup tetap terlihat. Transformasi terpilih menggantikan tautan judul dasar hasil komposisi sehingga judul transformasi muncul pada detail. Aturan penyedia kini memakai templat definisi terlokalisasi yang dapat disusun dengan pencocokan prefiks dan sufiks eksplisit, bukan penanda tetap.

## Rantai Definisi Kontekstual

Pohon transformasi kini menampilkan entri tanpa transformasi sebagai kartu akar terpusat dan memulai garis penghubung di bawah area definisi setiap simpul. Transformasi definisi mendukung substitusi terlokalisasi berurutan sebelum templat cadangan, sehingga aturan berikutnya dapat menulis ulang makna sebelumnya—misalnya “want to” menjadi “have wanted to”—atau menambahkan urutan setelah definisi hasil transformasi lengkap.

## Kembali dari Kartu Transformasi

Kartu hasil transformasi kini mengganti kontrol Varian dengan tindakan terlokalisasi “Kembali ke {kartu}”. Tindakan tersebut memulihkan kartu kanonik dalam konteks navigasi detail yang sama, termasuk judul, pelafalan, definisi, sasaran gambar, kemampuan penyuntingan, dan kontrol Varian.

## Ubah Ukuran Gambar Tanpa Distorsi

Kanvas Latihan Menggambar kini menyesuaikan ruang koordinat goresan logis ke viewport terpusat yang mempertahankan rasio aspek berdasarkan ukuran kanvas hasil render sebenarnya. Perubahan ukuran dapat menambahkan ruang horizontal atau vertikal, tetapi tidak lagi meregangkan karakter, panduan, anotasi, goresan yang diterima, maupun masukan penunjuk aktif.

## Komposisi Kosakata yang Andal

Formulir buat dan edit kosakata kini menampilkan carousel karakter meskipun penyedia hanya mendeklarasikan hubungan pelafalan. Grup pelafalan tersimpan terlihat berpindah dari baris penampungan, tag penyedia tidak lagi memperoleh kelas lapisan yang redundan, dan pembuatan yang gagal menampilkan galat sambil mempertahankan formulir tetap terbuka.

## Pelafalan Multi-nilai yang Andal

Penyimpanan pelafalan kini menerapkan pilihan korsel, mempertahankan pelafalan multi-nilai yang dibuat pengguna selama pembuatan kartu, dan menampilkan pesan korektif khusus jika grup pelafalan tidak valid.

## Penyimpanan Pelafalan yang Andal

Tahap pelafalan kini selesai meskipun kartu korsel tidak menampilkan penghitung, memindahkan nilai yang diterapkan ke daftar nilai tersimpan, dan menampilkan keberhasilan yang jelas atau kesalahan pengiriman yang dapat ditindaklanjuti.

## Pengujian Kartu Netral Penyedia

Skema tiruan netral penyedia yang mutakhir kini menguji pembuatan dan penyuntingan kartu dengan unit tulisan majemuk, komponen berurutan, pelafalan multi-nilai, dan referensi bacaan berkelompok. Pengujian Pustaka tidak lagi menyematkan konten dari modul bahasa tertentu.

## Konfirmasi Penyuntingan Akurat

Pembaruan server yang berhasil tidak lagi dilaporkan sebagai kegagalan saat pemuatan ulang daftar berikutnya gagal. Editor ditutup setelah pembaruan dikonfirmasi dan menampilkan pemberitahuan berhasil biasa atau peringatan jelas untuk memuat ulang halaman ketika sinkronisasi lokal gagal.

## Pelafalan Kalimat Terkini

Kartu kalimat kini mengabaikan pelafalan yang tersimpan sebelumnya saat dikirim dan menurunkan nilai baru dari referensi input berurutan saat ini. Mengurutkan ulang atau mengganti komponen kalimat akan memperbarui pelafalan yang tersimpan.

## Korsel Struktur Kalimat

Korsel tag yang dideklarasikan penyedia kini berfungsi sebagai korsel input kalimat mandiri dan tidak lagi bergantung pada entri yang dihapus dari korsel umum. Kata struktur dapat dipilih, diurutkan, dihapus, dan dipulihkan saat penyuntingan. Pohon transformasi juga menyediakan jarak vertikal yang lebih luas antarbaris kedalaman.

## Penyegaran Entri Stabil

Satu entri yang dikembalikan oleh penyuntingan popup yang berhasil kini digabungkan ke koleksi entri Pustaka sebelum dirender. Halaman tidak lagi mengganti lariknya dengan satu entri sehingga penyegaran setelah penyimpanan selesai tanpa galat runtime filter.

## Pemilihan Transformasi di Penyusun Kartu

Memilih verba yang dapat ditransformasi di penyusun kartu kini membuka dialog “Akan ditambahkan” dengan daftar dua kolom berisi bentuk yang tersedia dan definisi yang telah disesuaikan. Bentuk terpilih ditempatkan sebagai token transformasi sehingga tautan pada kalimat tersimpan membuka kembali detail verba atau adverbia hasil transformasi yang sesuai.

## Referensi kalimat transformasi buatan penyedia

Penyedia konten kini dapat melampirkan ID set transformasi dan jalur aturan yang divalidasi pada referensi kalimat. Cognis menyimpan pilihan tersebut, memulihkan token penyusun hasil transformasi yang tepat, dan membuka detail verba atau adverbia hasil transformasi yang sama dari kalimat. Detail hasil transformasi kini memakai anotasi anak standar “Dari: induk” sebagai tautan ke kartu dasar kanonis, bukan tombol kembali terpisah.

## Kompatibilitas siklus hidup modul bahasa Jepang

Batas jaminan modul kini mengenali ruang nama API dan kapabilitas kanonis yang dimiliki modul `study-language-<code>`. Modul pembelajaran bahasa Jepang terbaru dapat mendaftarkan `study:language:ja`, kapabilitas pustakanya, dan rute `/api/v1/study/languages/ja/*` saat diaktifkan tanpa meminta hak istimewa modul tanpa batas; ruang nama bahasa lain tetap ditolak.

## Pengaliran ulang judul popup sebagai upaya terakhir

Popup detail Pustaka kini mengukur tekanan ruang judul dan pelafalan setelah menerapkan penskalaan ringkas normal. Hanya jika judul akan terpotong atau pelafalan akan membungkus, header memindahkan pelafalan ke bawah judul; tata letak satu baris tetap dipertahankan dalam semua keadaan yang masih muat.

## Definisi bertingkat dan penyimpanan pelafalan yang andal

Pembuatan definisi dari dalam penyusun kartu kini menggunakan kembali definisi serupa yang sudah ada, bukan memunculkan penolakan konflik konten yang tidak ditangani. Hanya definisi bertingkat yang benar-benar baru yang ikut dibatalkan. Menyimpan pelafalan tersusun kini menggambar ulang kartu tersimpan serta membersihkan kartu korsel terpilih, nomor urutan, dan ringkasan pilihan secara bersamaan.

## Komposisi kartu bertingkat yang andal

Penyimpanan pelafalan bernilai jamak kini menggambar ulang nilai yang disimpan dan mengosongkan pilihan karusel. Definisi wajib ditandai dengan jelas dan divalidasi sebelum pengiriman, kartu bertingkat duplikat memakai kembali entri yang ada, dan masukan gabungan menawarkan kecocokan kartu berdasarkan prefiks terpanjang.

## Pelafalan turunan kalimat yang terlihat

Penyusun kalimat kini mempertahankan bidang pelafalan penyedia di formulir, menampilkannya hanya-baca, dan menurunkannya dari setiap kartu masukan yang dapat diuraikan. Teks gabungan disegmentasikan dengan pencocokan prefiks terpanjang yang deterministik agar masukan dapat diuraikan secara bertahap.

## Pengiriman kosakata berkelompok yang valid

Grup pelafalan kini ditambahkan tanpa slot null yang renggang, masukan penyedia yang rusak menghasilkan galat kontrak yang stabil alih-alih berhenti mendadak, dan definisi bertingkat yang ada digunakan kembali sebelum permintaan yang berkonflik dikirim.

## Komposisi ketikan multi-kartu

Urutan lengkap yang diketik dan dapat diuraikan menjadi beberapa kartu kini dapat diterapkan dalam satu tindakan. Pelafalan yang diturunkan otomatis langsung digambar ulang sebagai nilai tersimpan sehingga penyunting kosong tidak lagi menyiratkan bahwa pengguna harus memasukkan duplikat secara manual.

## Commit

- [0518e6c4](https://github.com/Cognis-Labs-HQ/Cognis/commit/0518e6c409501b6c12e96010ef2d039acec42bd5)
- [54c47947](https://github.com/Cognis-Labs-HQ/Cognis/commit/54c479475d86915fff94aff089b9670f887d4c7d)

- [44891fa5](https://github.com/Cognis-Labs-HQ/Cognis/commit/44891fa5705fc417cf0fbd75b96599a6fac21895)
- [3e86f4e5](https://github.com/Cognis-Labs-HQ/Cognis/commit/3e86f4e5c83828d0101fbacb4354381048de5290)

- [03268e5b](https://github.com/Cognis-Labs-HQ/Cognis/commit/03268e5bb34d94a46146b0ec6ba9f3e678752481)
- [8862690a](https://github.com/Cognis-Labs-HQ/Cognis/commit/8862690a835650a677efa6a5404ad55491b6a778)

- [ccbab39b](https://github.com/Cognis-Labs-HQ/Cognis/commit/ccbab39b)
- [db0728af](https://github.com/Cognis-Labs-HQ/Cognis/commit/db0728af)
- [9c77e48f](https://github.com/Cognis-Labs-HQ/Cognis/commit/9c77e48f)
- [41d895c6](https://github.com/Cognis-Labs-HQ/Cognis/commit/41d895c6)
- [e5f1dd4b](https://github.com/Cognis-Labs-HQ/Cognis/commit/e5f1dd4b)
- [ed27aee1](https://github.com/Cognis-Labs-HQ/Cognis/commit/ed27aee1)
- [ac06311e](https://github.com/Cognis-Labs-HQ/Cognis/commit/ac06311e)
- [517d09f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/517d09f0)
- [38faf70c](https://github.com/Cognis-Labs-HQ/Cognis/commit/38faf70c)
- [12a11fa8](https://github.com/Cognis-Labs-HQ/Cognis/commit/12a11fa8)
- [fc7e7054](https://github.com/Cognis-Labs-HQ/Cognis/commit/fc7e7054)
- [28161864](https://github.com/Cognis-Labs-HQ/Cognis/commit/28161864)
- [0fcff931](https://github.com/Cognis-Labs-HQ/Cognis/commit/0fcff931)
- [6d0da649](https://github.com/Cognis-Labs-HQ/Cognis/commit/6d0da649)
- [9d4adb8](https://github.com/Cognis-Labs-HQ/Cognis/commit/9d4adb8)
- [492cf08](https://github.com/Cognis-Labs-HQ/Cognis/commit/492cf08)
- [b3a66ab8](https://github.com/Cognis-Labs-HQ/Cognis/commit/b3a66ab8)
- [1bc87c38](https://github.com/Cognis-Labs-HQ/Cognis/commit/1bc87c38)
- [5c9ef37](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c9ef37)
- [0223c43](https://github.com/Cognis-Labs-HQ/Cognis/commit/0223c43)
- [0055fdfe](https://github.com/Cognis-Labs-HQ/Cognis/commit/0055fdfe)
- [8e60e383](https://github.com/Cognis-Labs-HQ/Cognis/commit/8e60e383)
- [5f098e37](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f098e37)
- [4d32a72e](https://github.com/Cognis-Labs-HQ/Cognis/commit/4d32a72e)
- [7dea5c6c](https://github.com/Cognis-Labs-HQ/Cognis/commit/7dea5c6c)
- [e356a233](https://github.com/Cognis-Labs-HQ/Cognis/commit/e356a233)
- [6c0ba3ed](https://github.com/Cognis-Labs-HQ/Cognis/commit/6c0ba3ed)
- [a0d73d7a](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0d73d7a)
- [4bd6efe1](https://github.com/Cognis-Labs-HQ/Cognis/commit/4bd6efe1)
- [d68194c6](https://github.com/Cognis-Labs-HQ/Cognis/commit/d68194c6)
- [508d6197](https://github.com/Cognis-Labs-HQ/Cognis/commit/508d6197)
- [0b3514f9](https://github.com/Cognis-Labs-HQ/Cognis/commit/0b3514f9)
- [1f67610e](https://github.com/Cognis-Labs-HQ/Cognis/commit/1f67610e)
- [7b038799](https://github.com/Cognis-Labs-HQ/Cognis/commit/7b038799)
- [35a54a21](https://github.com/Cognis-Labs-HQ/Cognis/commit/35a54a21)
- [6a48472b](https://github.com/Cognis-Labs-HQ/Cognis/commit/6a48472bfb28deb7094af36fc7fab7defa597b65)
- [f4640403](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4640403af8c1a228844cde3f784fa45650299cd)
- [42cf60f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/42cf60f01cbc42b765aaa71bdbcd84999c605a4a)
- [dfe0b9fb](https://github.com/Cognis-Labs-HQ/Cognis/commit/dfe0b9fbd48b84bd50dd3e346b65a825fb259f05)
- [51bf12a7](https://github.com/Cognis-Labs-HQ/Cognis/commit/51bf12a7b71ee520065eca1e02a8cf34e91c8fa9)
