# Adapter Pustaka

Kisi bagan menyediakan inset sebesar jarak kartu agar garis tepi kartu dan fokus tetap terlihat sepenuhnya. Penempatan anak spasial mengukur kapasitas tersisa pada setiap arah, hanya mencadangkan koordinat yang dipakai jalur leluhur aktif sehingga turunan dapat memakai kembali slot cabang alternatif yang dipangkas oleh kursor, dan mengutamakan arah yang dapat memuat cabang turunan sebelum memakai kapasitas terlihat terbesar sebagai pilihan cadangan.

## Skema milik konsumen

Adapter Pustaka menyimpan materi studi generik yang saling terhubung. Konsumen mendaftarkan skema berversi dan tetap melalui kapabilitas ctx `study:library`. Skema mendefinisikan bahasa, lapisan, bidang bertipe, dan relasi terarah; istilah seperti alfabet, kata, atau kalimat tidak ditetapkan adapter.

Relasi menentukan lapisan target, kardinalitas, urutan, dan resolver opsional. Setiap penulisan memvalidasi bidang, versi skema, target, visibilitas, dan kardinalitas. Definisi alternatif dimodelkan sebagai lapisan dan relasi deklaratif milik konsumen.

Lapisan dapat menargetkan dirinya sendiri dalam suatu hubungan sehingga satu entri dapat secara eksplisit memperluas entri lain pada lapisan yang sama. Hubungan dalam lapisan yang sama ditampilkan sebagai komposisi secara default; hanya hubungan yang ditandai sebagai varian atau secara eksplisit diberi `alternateSpelling` yang menggunakan tampilan ejaan alternatif.

## Resolusi, API, dan UI

Anak bersarang tetap tersedia sebagai subpohon lengkap: mengarahkan penunjuk atau memfokuskan anak yang terbuka menampilkan semua anak langsungnya tanpa menutup jalur saudara. Petunjuk tekan lama hanya muncul saat diarahkan sebagai elemen mengambang di bawah kartunya. Kartu anak yang diarahkan mempertahankan permukaan terangkat yang sepenuhnya opak agar kartu di bawahnya tidak terlihat menembus.

Resolver `grapheme` memakai grafem Unicode, sedangkan `longest-match` memakai blok yang dipisahkan secara eksplisit. Keduanya mengembalikan usulan dan unit yang belum terselesaikan tanpa membuat entri diam-diam. Penyedia lookup dipasang melalui `registerLookupProvider`, mengembalikan saran berperingkat beserta asalnya, dan dapat dilepas melalui callback registrasi. Pembuatan, resolusi, dan lookup mengikuti flow ctx bernama.

Gateway Study menyediakan penemuan skema, daftar, pembuatan, detail, penelusuran dua arah, pratinjau resolusi, dan saran lookup. UI berbasis skema menyembunyikan lapisan definisi dan partikel yang bersifat internal dari penjelajahan langsung. Lapisan yang dapat dijelajahi memakai tab, filter metadata, kartu entri, pil metadata, dan ikon cakupan. Detail popup pakai ulang menampilkan definisi dan makna di bawah judul entri yang lebih besar. Unsur penyusun yang dikenali, termasuk partikel kalimat, muncul sebagai subkotak yang dapat dinavigasi di dalam judul tersebut alih-alih bagian Komponen terpisah; detail partikel tetap hanya-baca. Referensi berbasis resolver hanya ditampilkan sebagai kotak sorotan yang dapat dinavigasi; judul relasi dan operator komposisi yang berulang dihilangkan. Label unsur dan pelafalan disajikan melalui kontrak item judul dan judul sekunder popup; isi detail tidak pernah mengulanginya melalui wadah pelafalan atau komponen terpisah. Contoh penggunaan hanya tampil pada entri yang dirujuk langsung oleh rekaman berurutan, tidak pernah secara transitif melalui entri terkait lain. Filter metadata tampil sebagai pil yang langsung diterapkan dan memakai grup detail skema jika disediakan modul. Akses global, pengguna, dan kelas tetap ditegakkan pada batas layanan. Pemfilteran metadata kini hanya mengevaluasi kartu dasar yang membawa nilai filter terserialisasi sehingga kartu varian mengambang tidak lagi meneruskan nilai tak terdefinisi ke penguraian JSON. Kartu karakter yang memiliki varian kini menampilkan petunjuk tekan lama yang terlokalisasi saat diarahkan dan hanya membuka kartu anak setelah ambang tahan tercapai. Grup tetap terbuka selama fokus berada pada induk atau anak dan menutup saat kehilangan fokus. Relasi varian tidak diulang dalam bagian detail khusus. Kartu anak yang dibuka memakai panah arah serta garis tepi hijau, dengan jarak dari induknya yang sama seperti jarak antarkartu biasa.

Pemilik konten, administrator, dan pemilik sistem dapat memilih beberapa entri yang terlihat lalu menghapusnya secara permanen beserta relasinya. Konten modul yang dihapus dipulihkan melalui siklus pengaktifan modul saat tidak ada. Konfirmasi penghapusan juga dapat memasukkan hash konten terpilih ke daftar blokir agar rekaman identik tidak dapat diimpor lagi. Tindakan pilihan ganda memakai bilah tindakan mengambang milik penyusun halaman setelah klik kanan; klik kartu biasa atau tindakan tutup keluar dari mode pemilihan. Tautan relasi berpindah ke lapisan entri rujukan yang dapat dijelajahi dan memakai penyorot target bersama. Referensi definisi diterapkan langsung pada teks yang ditampilkan, dan hanya relasi resolver yang dideklarasikan skema yang menghasilkan kotak unsur sehingga tautan sistem tulisan yang ganda atau tidak terkait tidak muncul. Kontrol audio gelap secara eksplisit menetralkan saturasi panel bawaan.

Kisi minimal memperoleh lebar bagan terbatas dan skala kartu proporsional dari `grid.rowSize`; item kosong eksplisit tetap menjadi sel kisi berdimensi agar kolom bagan tidak pernah runtuh.

## Paket konten deklaratif

Paket bahasa terpasang memanggil `inspectContentPack(root)` untuk validasi atau `ingestContentPack(root)` untuk memasang Pustaka khusus data. Akar paket berisi `manifest.json`, berkas skema yang dirujuk, serta direktori konten dengan subdirektori ID lapisan. Berkas memuat array rekaman dengan ID stabil dan relasi eksplisit. Cognis memvalidasi seluruh graf, membuat ID bernamespace, mencatat digest dan tanda terima, lalu menulis skema, entri, serta edge secara atomik. ID entri tetap stabil di seluruh versi paket, dan pemasangan menyatukan hash konten identik dari impor lama menjadi satu entri kanonik sambil mempertahankan relasinya. Hierarki spasial memerlukan `child: true`; `variant: true` juga dapat menandai bentuk alternatif, tetapi tidak mengaktifkan atau menonaktifkan pembukaan. Rekaman dengan `hidden: true` tidak pernah menerima penempatan spasial, meskipun relasinya adalah anak. Peramban memberi setiap anak yang dideklarasikan slot kisi terbatas dan membuka rantai anak secara rekursif hingga empat tingkat. Rekaman yang hanya menjadi target komposisi menetapkan `hidden: true`; rekaman tersebut tetap dapat diresolusi dan ditautkan mendalam dalam detail, tetapi tidak pernah tampil sebagai kartu bagan. Rekaman anak merujuk induk konseptualnya yang sebenarnya dan tetap menjadi entri Pustaka mandiri. Pengguna penunjuk dapat berpindah ke varian mengambang untuk membuka detailnya. Lapisan dapat mendefinisikan `grid` dengan `rowSize` serta urutan `items` berisi ID rekaman konten, nilai numerik `displayId`, atau ruang kosong eksplisit `{ "blank": true }` (`null` tetap didukung); peramban mempertahankan posisi bagan tersebut dan menskalakan setiap kartu mengikuti lebar baris yang diminta. Bagi pemilik konten dan administrator yang berhak, kotak pilihan tetap tersembunyi hingga kartu diklik kanan, lalu muncul di seluruh Pustaka dengan dukungan tema gelap. Kontrak penulisan lengkap berada di `study-language-framework.id.md`. Grup filter metadata dapat mendeklarasikan `required: true` agar satu tag selalu terpilih serta `defaultTag` untuk memilih tag awal yang ditentukan modul; grup yang hanya merender satu tag akan memilihnya secara otomatis. Lapisan dapat menetapkan `minimal: true` untuk hanya merender label utama setiap entri dalam kartu ringkas, sambil mempertahankan interaksi klik, varian tekan lama, dan pemilihan seperti biasa. Rekaman kalimat paket konten harus sepenuhnya diwakili oleh referensi unit leksikal dan partikel yang berurutan; impor menolak label yang mengandung teks tanpa tautan. Rekaman dapat menetapkan `hidden: true` agar tetap dapat dirujuk dan tersedia dalam popup detail, tetapi tidak muncul dalam penjelajahan langsung bersama seluruh keturunannya.

## Definisi yang dilokalkan

Setiap lapisan dengan peran semantik `definition` mendeklarasikan awalan kunci string milik modul serta bidang kunci dan teks terlokalnya. Definisi dikelola hanya ketika menyunting entri yang membutuhkannya; definisi tidak dapat dijelajahi atau disunting secara langsung sebagai bagian Pustaka tersendiri. Bahasa Inggris tetap menjadi teks sumber wajib, kunci yang dihasilkan tetap disimpan pada rekaman definisi, dan kapabilitas opsional `localization:translateString` dapat melengkapi bahasa yang kosong.

## Pelafalan dan audio unit tulisan

Lapisan dengan peran `atomicWritingUnit` atau `compoundWritingUnit` mendeklarasikan bidang standar wajib `pronunciation` (`stringList`) dan `audio` (`audio`). Paket konten menyediakan berkas MP3, Ogg, WAV, WebM, atau M4A sebagai aset paket yang diautentikasi. Pustaka menyimpan berkas tersebut melalui gateway Berkas dalam namespace `study-library-audio` yang dikelola komponen. Penyimpanan persisten, kuota, dan pengelolaan berkas fisik tetap menjadi tanggung jawab gateway Berkas, sementara setiap permintaan pemutaran tetap menegakkan cakupan entri. Pelafalan karakter dan karakter alternatif tampil di samping unit tulisan pada kartu dan judul detail; pelafalan kata dan kalimat tetap berada di bawah teksnya. Modul dapat memodelkan kata satu karakter yang bermakna dengan memberi rekaman `lexicalUnit` satu referensi karakter. Detail karakter kemudian menampilkan relasi kata masuk tersebut tanpa membuat konten secara otomatis di Pustaka. Pelafalan unit tulisan di samping judul popup memakai kontrak judul sekunder yang di-escape dengan teks lebih kecil dan berbobot normal. Permukaan audio menolak penggantian warna paksa dan menetralkan saturasi kontrol bawaan dalam mode gelap.

## Grup filter metadata

Kolom lencana dapat difilter secara bawaan. Penyedia juga dapat menetapkan `detail.filterable: true` pada kolom metadata primitif atau terlokalisasi lainnya agar nilainya tersedia sebagai filter bagi pelajar. Kolom yang dapat difilter dapat memakai `detail.group` untuk mengelompokkan filter terkait dan `detail.exclusive` untuk mengatur pilihan. Jika setiap kolom dalam grup menetapkan `exclusive: true`, memilih satu pil akan menghapus pilihan grup sebelumnya. Nilai bawaan `false` mengizinkan beberapa pil terpilih. Semua kolom dalam grup bernama harus memakai pengaturan eksklusivitas yang sama.

## Pemutaran audio terautentikasi

Klien gateway Study mengambil audio entri melalui klien API terautentikasi dan memberikan URL objek sementara kepada pemutar. URL dicabut ketika jendela detail ditutup. Kontrol pemutar asli mendukung skema warna terang dan gelap serta mengikuti tema aplikasi yang aktif.

## Tampilan terstruktur

Metadata terlokalisasi setiap lapisan menentukan nama yang ditampilkan. Lapisan selain karakter dapat menetapkan `displayDefinition: true`; hal ini mewajibkan relasi definisi dan referensi tersebut pada setiap entri impor. Modul bahasa dapat menyumbangkan definisi kalimat gabungan, termasuk dampak partikel khusus bahasa, melalui `study:library:composeEntryDetail`. Cognis tidak menciptakan konten bahasa. Hanya bidang yang dideklarasikan, tidak kosong, dan terlihat yang dirender secara generik. Kisi menerima ID rekaman, nilai numerik `displayId`, serta `{ "blank": true }` sebagai ruang kosong.

Entri definisi tidak pernah dapat dibuka atau ditautkan secara langsung; entri tersebut hanya menyediakan teks terlokalisasi bagi entri lain. Terjemahan yang terlihat hanya ditampilkan dalam bahasa antarmuka aktif. Relasi resolver memakai `presentationRole` untuk membedakan `composition`, `alternateSpelling`, dan `pronunciation`, sehingga pelafalan berupa kata lengkap tidak tampil sebagai rangkaian karakter yang ambigu.

Jika komposisi hanya memuat satu entri dengan label yang sama seperti entri saat ini, blok komposisi duplikat disembunyikan dan tautan dalamnya menggantikan judul popup.

Widget page composer kini menyesuaikan lebarnya dengan skema Perpustakaan dan tetap dibatasi oleh lebar yang tersedia, sehingga lebar widget yang tidak terpakai tidak menimbulkan luapan horizontal.

Penghapusan menyelesaikan kaskade relasi akhir dan mengotorisasi setiap entri yang terdampak dalam transaksi yang sama. Karena itu, relasi yang ditambahkan secara bersamaan tidak dapat memperluas penghapusan melampaui konten yang diizinkan bagi pelaku.

Untuk unit leksikal dan urutan leksikal terurut, relasi dengan tampilan `alternateSpelling` muncul sebagai ejaan sekunder yang dapat dinavigasi tepat di bawah judul detail utama. Anak struktural atau anak varian tidak diulang sebagai bagian ejaan alternatif dalam konten detail.

Pelafalan yang sama dengan ejaan utama atau sekunder hanya ditampilkan sekali. Teks pelafalan tetap menjadi metadata judul biasa dan tidak diubah secara heuristik menjadi tautan ke catatan unit tulisan dengan label serupa; tautan relasi tetap hanya berasal dari referensi Pustaka yang dideklarasikan.

## Peningkatan paket konten

Peningkatan paket memangkas rekaman yang tidak lagi disertakan penerbit karena penyedia terpasang merupakan sumber resmi bagi namespace miliknya. Manifes hanya boleh menetapkan `pruneOmittedRecords` ke `false` bila sengaja menerbitkan kumpulan rekaman parsial.

## Administrasi dan halaman pelajar

`/study/library` adalah editor data khusus administrator. Menu samping mengelompokkan seluruh rekaman bahasa terpilih berdasarkan skema dan lapisan, termasuk rekaman definisi dan relasi. Memilih lapisan langsung memindahkan status menu aktif dan menampilkan daftar baris yang bersih. Klik pada baris membuka varian hanya-baca dari popup edit berbasis skema; klik kanan mengaktifkan mode multi-pilih, sedangkan pensil kecil yang mengikuti tema membuka varian yang dapat disunting.

Lapisan untuk pelajar menggunakan rute SPA mandiri `/study/layers/:schema/:layer` yang ditautkan langsung dari subnavigasi Study. Halaman ini menggunakan kembali renderer kartu kaya dengan filter, varian, definisi, metadata, dan popup detail tanpa menampilkan kontrol penyuntingan administratif.

## Kartu dan penyuntingan terfokus

Pratinjau kartu pelajar sengaja dibuat ringkas: label utama dan pelafalan berbagi satu baris, dengan hanya ikon cakupan di sampingnya. Definisi, metadata, relasi, dan konten pendukung lain tetap berada di popup detail, tempat tautan dalam bekerja tanpa bagian ganda.

Popup penyuntingan administrator membentuk kontrol dari skema bidang dan relasi setiap lapisan, bukan menampilkan JSON mentah. Teks terlokalisasi, daftar, boolean, angka, string, dan target relasi mendapatkan kontrol yang sesuai, sedangkan perlindungan penutupan melacak bidang yang berubah sebelum popup dapat ditutup.

## Kontrak editor milik penyedia

Setiap bidang yang dapat diedit mendeklarasikan jenis input dan semua label terlokalisasi dalam skema penyedia. Klasifikasi tetap terkunci setelah dibuat; pemilihan dan unggahan audio dibatasi pada prefiks bahasa dalam namespace gateway File. Komposisi wajib merujuk lapisan terdekat yang tersedia: 日本語 merujuk 日本 dan 語, sedangkan 日本 merujuk 日 dan 本.

Tombol entri terkait tidak lagi mengulang labelnya dalam lapisan hover. Tautan kosakata menyertakan pelafalan dari penyedia sehingga unit leksikal satu karakter yang sah seperti `人 ひと` tetap dapat dibedakan dari rekaman unit tulisan `人` tanpa menyembunyikan kata satu karakter yang bermakna. Petunjuk varian memakai sudut bawah kartu yang ringkas dan tidak menutupi konten utama. Permukaan kartu tema gelap dipadukan ke latar aplikasi, bukan ke warna putih.

Cabang varian yang terbuka tetap dibatasi oleh kisi dasar. Cognis lebih dahulu menghormati arah pilihan penyedia, lalu menguji arah alternatif terhadap batas kisi yang dirender dan memilih opsi pertama yang muat; preferensi penyedia dipulihkan saat cabang ditutup. Petunjuk tekan lama dibuat statis agar teks tetap tajam dan memakai label 25% lebih besar.

Kartu yang ditampilkan mempertahankan posisi yang ditetapkan sementara turunannya disesuaikan secara mandiri. Jika pemangkasan jalur menyisakan arah yang lebih sedikit daripada jumlah saudara, anak tambahan ditumpuk ke luar pada baris atau kolom yang sama tanpa tumpang tindih atau memindahkan induknya.

Saat cabang kartu anak terbuka, kartu induk yang tidak terkait mempertahankan permukaan normalnya tanpa bereaksi terhadap hover, dan ikon cakupan/visibilitasnya ikut diburamkan di latar belakang. Induk aktif beserta jalur turunannya yang terlihat tetap tajam dan interaktif.

Popup detail unit leksikal menampilkan label kosakata hanya pada judul popup. Detail judul hanya memuat definisi yang dilokalkan untuk bahasa Cognis aktif sehingga ejaan atau pelafalan tidak terduplikasi di samping judul.

Saat tautan entri terkait membuka unit leksikal tanpa definisinya sendiri, popup mewarisi definisi terlokalkan yang ditampilkan kartu sumber. Definisi yang disediakan catatan kosakata selalu diutamakan sehingga beberapa catatan kosakata yang tertaut ke satu unit tulisan tetap dapat memiliki makna khusus yang berbeda. Kontrol sebelumnya/berikutnya dan tautan komposisi judul tidak membawa konteks cadangan ini.

Kartu dapat merujuk beberapa catatan definisi sesuai urutan penyedia. Definisi terlokalkan pertama ditonjolkan pada detail judul kecuali isinya sama dengan judul kartu; definisi berikutnya ditampilkan dalam bagian Definisi Tambahan yang dihilangkan ketika kosong. Konteks yang diwarisi dari sumber navigasi tetap hanya menjadi cadangan saat kosakata tujuan tidak menyediakan definisi.

Penyesuaian saat jalan mencadangkan kartu akar dan setiap kartu anak yang telah ditempatkan pada cabang terlihat. Anak mempertahankan arah pilihan penyedia jika slot terbatas tersebut kosong; jika tidak, Cognis memilih kandidat dalam batas dengan tumpang tindih kartu paling kecil. Hal ini mencegah kartu saudara menumpuk pada satu slot sambil tetap mendukung penumpukan ke luar pada baris atau kolom ketika posisi terdekat habis.

Untuk urutan leksikal terurut, hanya relasi dengan `presentationRole: composition` (atau tanpa peran untuk relasi komposisi lama) yang digunakan untuk merekonstruksi label. Tautan pelafalan dan ejaan alternatif dapat menargetkan lapisan leksikal serta memakai ulang posisi tanpa dianggap sebagai unsur kalimat.

Tampilan detail menyembunyikan kelas `composite`. Kelas konten lainnya disederhanakan menjadi segmen akhir yang mudah dibaca dan ditampilkan sebagai pil (misalnya, `lexical:noun` menjadi **Noun**). Judul komposit menempatkan bacaan alternatif dan pelafalan di bawah bacaan utama, sementara definisi tetap berada di kolom sebelah. Navigasi kosakata terbalik menyembunyikan entri leksikal berlabel sama agar relasi ejaan kata-ke-unit-tulisan yang benar tidak tampak berulang ke dirinya sendiri. Ejaan bertaut pada detail judul juga dihilangkan ketika teks ternormalisasi dan tujuannya sama dengan tautan yang sudah menyusun judul utama. Relasi tanpa peran resolver atau presentasi adalah sisi dependensi saja: relasi tetap tersedia untuk navigasi balik dan kebijakan penghapusan tanpa dianggap sebagai komposisi judul. Tampilan detail menggabungkan penggunaan kosakata dan dependensi masuk lainnya ke dalam satu bagian **Digunakan Oleh**, dengan memprioritaskan target kosakata ketika beberapa rekaman memiliki label ternormalisasi yang sama. Judul popup komposit menggunakan jarak baris yang rapat antara judul utama dan detail bacaan, sementara pratinjau kartu menjaga teks judul dan definisi yang tersisa tetap terpusat setelah deduplikasi.

## Pelacakan konten baru

Pustaka menyimpan UUID entri yang telah dilihat untuk setiap akun. Pembaruan penyedia mempertahankan status ini dan hanya memberi tahu akun aktif tentang ID entri stabil yang baru diperkenalkan, bukan seluruh isi paket yang diperbarui. Entri global dari paket penyedia atau kontribusi pengguna dan administrator yang disetujui memicu notifikasi Pustaka bagi akun aktif. Entri yang belum ada dalam cache tampilan akun menampilkan pil **Baru** pada pratinjau dan popup detail. Mengarahkan penunjuk ke kartu atau membukanya secara langsung maupun melalui relasi akan menandainya sebagai telah dilihat; status tersimpan menghilangkan pil setelah halaman dimuat ulang.

## Kontribusi, permintaan visibilitas, dan pencarian

Pengguna dapat membuat kartu di namespace pribadi, guru juga di kelas miliknya, dan administrator juga secara global. Penyedia bahasa membentuk bidang formulir khusus lapisan melalui `study:library:registerConstructor`; visibilitas, pemilihan kelas, dan kontrol pratinjau definisi tetap dimiliki adapter. Sebelum pembuatan pribadi atau kelas, Pustaka menunjukkan entri global terlihat yang identik dan meminta konfirmasi eksplisit. Pembuatan memakai cakupan pribadi secara bawaan; administrator yang berhak dapat memilih publikasi global, sedangkan pengajar hanya dapat memilih kelas yang dapat ditulis dan bahasanya cocok dengan skema aktif.

Kartu pribadi dapat diterbitkan ke kelas yang diikuti untuk ditinjau gurunya atau ke koleksi global untuk ditinjau administrator. Permintaan tertunda dapat ditarik kembali oleh pengirim; setelah disetujui, kepemilikan berpindah dari pengguna dan kartu asli dipindahkan, bukan disalin. Sesudahnya hanya guru yang bertanggung jawab atau administrator yang dapat mengedit, menghapus, atau mengembalikannya ke namespace pribadi pengirim awal. Manifest penyedia dapat menetapkan `protected: true`; entri terlindungi tidak dapat dipindahkan atau dihapus. Rekaman impor dan buatan pengguna menyimpan teks pencarian ternormalisasi, dan pencarian menu samping memeriksa semua lapisan serta menyembunyikan hasil kosong.

## Konstruktor kartu milik bahasa

Paket bahasa dapat menambahkan `cardConstructor` pada setiap lapisan yang dapat dibuat di dalam skemanya. Spesifikasi ini menyediakan label utama terlokalisasi, urutan ID bidang dan relasi, nilai awal penyedia, serta pilihan untuk menampilkan sakelar kartu tersembunyi atau pratinjau definisi. Cognis menambahkan kontrol visibilitas dan kelas sesuai peran; lapisan tanpa konstruktor sengaja hanya-baca untuk pembuatan.

Pembuatan menampilkan seluruh koleksi hubungan tanpa bilah gulir atau kontrol arah. Pratinjau saat diarahkan memakai definisi dalam bahasa antarmuka saat ini. Item yang dipilih atau disarankan menjadi blok komposisi yang dapat diseret; ID stabilnya menghasilkan referensi hubungan, dan pelafalan diturunkan secara rekursif dari unit tulisan yang dirujuk. Pembuatan definisi meminta terjemahan untuk semua bahasa antarmuka yang didukung.

Modul bahasa saat runtime juga dapat mengambil kapabilitas ctx publik `study:library:provider`, memanggil `ingestContentPack(moduleRoot)`, lalu `registerConstructor(...)`. ID konstruktor divalidasi terhadap skema terdaftar sebelum formulir tersedia. Fungsi penghapus yang dikembalikan memungkinkan konstruktor dilepas saat modul dinonaktifkan.

## Kontrak paket eksternal

`study:library` adalah batas resmi bagi penyedia yang dapat dieksekusi dan paket konten khusus data. Paket memiliki tepat satu namespace yang sama pada manifes dan skema. Label skema, lapisan, bidang, relasi, konstruktor, dan opsi berupa peta terlokalisasi. Metadata penyedia dapat menambahkan nilai yang kompatibel dengan JSON; Cognis memvalidasi setiap nilai, menyimpan skema lengkap, dan mengembalikannya tanpa perubahan melalui `listSchemas()` serta `GET /api/v1/study/library/schemas`. Jenis bidang yang belum dikenal hanya diterima dengan aturan `validation` deklaratif. Jenis bawaan mencakup string, angka hingga, bilangan bulat aman, boolean, daftar, teks terlokalisasi, serta referensi aset/audio tunggal atau daftar. Perlindungan paket, peran semantik, grid, petunjuk detail, kompatibilitas aktivitas, pelokalan definisi, minat, lisensi, dan aset merupakan bagian kontrak berversi ini. Fixture sintetis di `tests/fixtures/` adalah acuan kompatibilitas untuk CI penyedia.

Registrasi skema langsung yang dapat dieksekusi tetap tidak dapat diubah untuk setiap versi skema. Namun, rilis baru paket konten otoritatif dapat merevisi dokumen skema tersimpan pada versi kompatibilitas yang sama apabila semua pemilik terpasang untuk versi skema tersebut memiliki penerbit dan ID paket yang sama. Cognis menolak benturan dengan skema yang didaftarkan secara independen atau dimiliki pihak lain, memperbarui skema dan entri dalam satu transaksi, lalu menyegarkan skema dalam memori setelah transaksi berhasil.

Rekaman konten dapat mendeklarasikan nilai `class` bernamespace seperti `lexical:noun` atau `lexical:verb`. Pustaka memvalidasi dan mempertahankan klasifikasi netral-penyedia ini untuk perenderan dan aktivitas berbasis kelas pada masa depan. Referensi audio lokal berbentuk daftar di-cache satu per satu, daftar aset ditulis ulang menjadi URL terautentikasi, dan tanda terima pemasangan mempertahankan metadata manifes.

## Permintaan penerbitan

Permintaan penerbitan Pustaka berada pada halaman subnavigasi Study **Permintaan**, bukan pada bilah alat halaman. Saat administrator atau pengajar memiliki permintaan tertunda yang dapat ditinjau, tautan Permintaan menampilkan garis tepi merah yang bernapas dan aksesibel; menyelesaikan tinjauan terakhir menghapus status perhatian. Animasi berubah menjadi garis tepi statis bila pengguna meminta pengurangan gerakan.

## Administrasi dan pembuatan

Pustaka administrasi hanya menampilkan lapisan untuk bahasa Study yang sudah dipilih dan memakai menu lapisan yang tidak dapat diciutkan. Editor menempatkan label dan kelas konten paling atas, membedakan mode Lihat dan Edit, melindungi perubahan yang belum disimpan, serta hanya menyediakan Simpan saat menyunting. Rekaman definisi selalu tersembunyi, memakai kelas `definition`, dan tidak menampilkan sakelar pratinjau atau visibilitas; urutan teratur memakai kelas `composite`. Rekaman konten dapat menetapkan `editable: false`, dan lapisan partikel tidak pernah dapat disunting. Pembuatan hanya tersedia sebagai tindakan halaman `+` pada halaman lapisan pengguna dan memandu pengguna melalui visibilitas, konten, dan relasi. Pengirim dapat melihat dan menarik permintaan penerbitannya sendiri pada halaman Permintaan.

Saat membuat kartu, kartu yang telah diselesaikan tetap berada di dalam kontrol Input dan pelafalan diturunkan secara waktu nyata dari rekaman yang dipilih serta karakter atomik yang belum diselesaikan. Label karusel duplikat disatukan ke pratinjau definisi terlokalisasi terbaik. Hubungan ditampilkan sebagai peta induk/kartu/anak hanya-baca, sedangkan tab Definisi dapat membuat dan menautkan beberapa set terjemahan lengkap melalui dialog bertingkat. Penulis di ruang pribadi dan kelas tidak menerima kontrol administratif Tersembunyi; penerbitan global diberi label Terbitkan dan menjelaskan permintaan peninjauannya melalui tooltip informasi.

Pembuatan langsung mengecualikan lapisan definisi; definisi hanya dibuat ketika diciptakan dan ditautkan dari penyusun kartu lain. Dialog penyusun menggunakan perlindungan perubahan yang belum disimpan setelah pemilihan jenis. Audio detail memakai kontrol pengeras suara ringkas: kartu memutar audionya sendiri atau, untuk komposit, audio setiap komponen berurutan, dan tetap dinonaktifkan bila ada komponen tanpa audio. Bidang `strokePattern` menyimpan koordinat ternormalisasi berurutan, waktu monotonik, tekanan opsional, dan toleransi penerimaan untuk latihan menulis deterministik.

Pembuatan kartu membatasi setiap karusel hubungan menjadi dua baris yang bergulir secara vertikal dan memakai pengontrol popup tertambat bersama untuk pratinjau stabil yang sadar area pandang. Hubungan definisi tidak menampilkan karusel; dialog khusus set pelokalannya membuat dan menautkan rekaman secara pribadi. Resolusi Input membandingkan seluruh nilai ternormalisasi untuk kecocokan tepat, dan diagram hubungan hanya menampilkan rekaman komposisi yang dipilih secara eksplisit. Kontrol Terbitkan tetap satu baris, tindakan buat memakai tanda tambah terpusat tanpa garis tepi, tindakan gambar/edit memiliki label hover, dan aset pengeras suara memiliki varian terang serta gelap.

Karusel hubungan tetap memiliki dua baris tetapi kini bergulir secara horizontal. Muatan pola goresan menjadi data implementasi khusus dan tidak pernah tampil dalam detail kartu. Tindakan gambar dan audio memakai aset terang/gelap berpasangan, dan masuk ke latihan menggambar menutup dialog detail.

Halaman Study Library menggunakan pengguliran dokumen agar halaman tidak bersaing dengan bilah gulir konten di dalamnya. Pratinjau kartu memiliki tinggi yang konsisten. Kontrol tambah relasi membuka komposer bersarang dengan tipe yang sudah dikunci dan judul yang menyebutkan tipe kartu; dialog bersarang tampil di atas dialog induknya. Pratinjau karusel hanya dirender melalui portal di badan dokumen yang mengikuti ukuran konten dan langsung dihapus saat item kehilangan arah penunjuk atau fokus.

Sebuah bidang dapat mendeklarasikan `input.linkRelationships` agar nilai bacaan atau pelafalan dapat dinavigasi melalui beberapa relasi buatan penyedia. Host menggabungkan referensi yang cocok berdasarkan posisi yang ditulis, lalu mencocokkan setiap segmen yang ditampilkan dengan label atau alias pelafalan kartu tujuan sambil mempertahankan kartu asli tersebut sebagai tujuan tautan.

Tindakan buat mengambang menggunakan tanda tambah dua rem berwarna hitam atau putih sesuai tema aktif. Judul karusel komposer berasal dari metadata lapisan tujuan milik penyedia dan itemnya tetap dibatasi pada lapisan tujuan tersebut. Ikon pengeras suara audio beralih antara aset terang dan gelap secara eksplisit berdasarkan tema aplikasi, bukan preferensi warna sistem operasi.

Kartu Library menerima tag yang dapat dicari, seperti tingkat kemahiran. Penyedia runtime dapat mendaftarkan kontrak penyedia pencarian yang ada melalui `study:library:provider`; hasil pencarian dapat menyediakan bidang tervalidasi, termasuk `strokePattern`, beserta asal dan tingkat keyakinan.

## Penyedia pencarian penyusun

Penyedia konten runtime mendaftarkan implementasi pencarian melalui `study:library:provider.registerLookupProvider`. Penyedia memasok ID stabil, label layanan terlokalisasi, pemeriksaan dukungan skema/lapisan, dan pencarian asinkron yang menerima label mentah dari penyusun. Cognis menampilkan setiap penyedia yang kompatibel sebagai **Cari dengan: nama layanan** di bawah masukan. Penyedia terpilih dapat mengembalikan label kanonis, nilai bidang tervalidasi, referensi relasi berurutan, asal, dan tingkat keyakinan; penyusun menerapkan hasil dengan keyakinan tertinggi sementara kepemilikan endpoint tetap berada di klien gateway Study.

Pengaktifan modul memvalidasi kapabilitas server yang diperlukan terhadap konteks rute yang diinjeksi dan kapabilitas publik yang dikontribusikan ke ctx sistem. Karena itu, modul dapat mendeklarasikan `study:library:provider` dengan aman di `requiresCapabilities`; kapabilitas ctx privat tetap tidak tersedia.

Pembuatan dan penyuntingan mempertahankan relasi tak berurutan tanpa menghasilkan metadata posisi. Struktur relasi hanya terlihat dalam mode Tampilan; formulir sunting dan buat mempertahankan referensi tersebut melalui kontrol tersembunyi. Formulir unit tulisan gabungan menyediakan bidang **Masukan** bebas, memberi judul karusel referensi atomis dari bidang pelafalan penyedia, dan menampilkan tindakan pencarian sebaris hanya setelah masukan diisi. Pola goresan tetap menjadi data penyedia tersembunyi. Tindakan tambah definisi menggunakan kontrol netral yang lebih besar, dan pratinjau karusel menyesuaikan permukaannya dengan seluruh isi.

Kartu unit tulisan gabungan yang sudah ada menempatkan pemilih pelafalan di dalam bidang Pelafalan, bukan di atas tab Konten atau di samping kontrol masukan tag. Judul karusel memakai nama lapisan tujuan terlokalisasi dari penyedia konten. Penyunting mengurutkan unit tulisan atomis yang dipilih berdasarkan kemunculannya dalam pelafalan atau label kartu, lalu memperoleh pelafalan tersimpan dari urutan tersebut. Bidang audio yang sudah ada menampilkan nama berkas tersimpan, berkas yang baru diunggah mempertahankan nama yang mudah dikenali, dan aset pengeras suara mengikuti tema aplikasi aktif.

## Penyuntingan pelafalan yang ditautkan penyedia

Penyedia dapat menetapkan `input.linkRelationships` pada kolom pelafalan. Penyunting kemudian mengganti masukan tag bebas dengan karusel berurutan tepat untuk relasi tersebut dan memakai label penyedia yang dilokalkan untuk setiap lapisan tujuan. Menyimpan kartu yang dipasang penyedia menandai rekaman sebagai telah diubah pengguna, sehingga rekonsiliasi paket konten berikutnya mempertahankan kolom dan relasi pengguna.

Penyuntingan pelafalan memakai proses dua langkah yang dapat diulang: pilih kartu komponen yang sesuai dengan penyedia, lalu simpan bacaan yang diturunkan. Item karusel menampilkan pelafalannya, bukan label utamanya. Unit tulisan majemuk mengambil unit tulisan atomik, sedangkan urutan leksikal terurut mengambil unit leksikal seperti kosakata dan partikel. Unggahan audio memakai kunci objek kartu-dan-kolom yang stabil, sehingga unggahan pengganti menimpa objek sebelumnya.

Saat Latihan Menggambar terbuka, memilih kartu lain yang memiliki pola goresan akan memuat kartu itu ke pad yang sama alih-alih membuka dialog rinciannya.

Kartu kosakata, kalimat, dan gabungan menurunkan panduan menggambar secara rekursif dari referensi unit tulisan terurut dan tidak boleh mendeklarasikan pola goresannya sendiri. Karakter alternatif milik penyedia memakai ulang audio karakter terkait bila memungkinkan; audio yang diunggah secara eksplisit pada kartu milik pengguna tetap menjadi sumber utama.

Formulir pembuatan memakai pembuat formulir bersama untuk label wajib dan bidang definisi terlokalisasi. Masukan karakter alternatif berupa teks bebas, tetapi baru sah setelah dikonfirmasi penyedia kamus; hasil penyedia mempertahankan bidang wajib tersembunyi seperti pola goresan. Pemilih pelafalan berada di dalam bidang Pelafalan, kata dapat menyusun pelafalan dari kartu karakter, dan partikel tidak lagi menjadi kelas konten yang dapat dipilih penulis. Penyelesaian gambar gabungan mengikuti tulisan utama sebelum tautan pelafalan.

Penyuntingan memvalidasi catatan yang ada terhadap skema penyedia terkini dan memigrasikan versi skema tersimpannya, sehingga pengambilan audio dan pembaruan tetap valid setelah peningkatan penyedia. Pelacakan detail mempertahankan izin penyuntingan setelah editor ditutup. Fitur menggambar dibatasi pada unit tulisan dan kosakata, sedangkan penyelesaian goresan kosakata memakai label tulisan utama, bukan tautan pelafalan.

Pembuatan mengecualikan lapisan partikel. Masukan kalimat dan gabungan memulihkan semua karusel relasi penyedia, termasuk kosakata, partikel, karakter alternatif, dan karakter, sambil menurunkan pelafalan tanpa editor pelafalan terpisah. Konstruktor kosakata dan karakter alternatif menyertakan pemilihan pelafalan berbasis karakter; pemilih tersebut menampilkan nilai utama karakter dan menampung ejaan terpilih sebelum pelafalan turunannya disimpan.
Komposisi pelafalan mengikuti komposisi input: ketik teks bebas pada input bertahap atau pilih kartu karakter atomik dari karusel karakter, lalu commit pelafalan gabungan. Pemilih pelafalan kosakata dan karakter alternatif tidak pernah mengganti karakter atomik dengan kartu kosakata.

Setiap payload `cardConstructor` menyediakan `input_carousels` dan `pronunciation_carousels`. Kedua larik berisi ID lapisan target milik constructor tersebut: karusel input menyusun nilai primer, sedangkan karusel pelafalan memenuhi setiap relasi bacaan terdeklarasi yang menargetkan lapisan itu. Untuk karakter alternatif, hanya batas minimum karusel pelafalan yang wajib; referensi primer yang belum terselesaikan tidak menghalangi pembuatan. Penyedia lookup boleh tidak mengirim metadata asal dan peringkat milik penyedia karena Library menormalisasi nilainya dari penyedia yang terdaftar.

Larik karusel constructor kartu wajib tersedia; larik yang hilang ditolak dan tidak disimpulkan. Kontribusi formulir runtime diterapkan pada validasi relasi sisi server serta penyajian skema. Formulir edit memakai karusel pelafalan terdeklarasi yang sama dengan formulir pembuatan. Unggahan audio memakai label kartu yang dinormalisasi dan ID bidang sebagai nama berkas penyimpanan sehingga unggahan pengganti menimpa objek yang sama.

Konstruktor kartu menjadi satu-satunya kontrak formulir untuk pembuatan dan penyuntingan. Daftar `fields` menentukan bidang skalar yang terlihat, sedangkan `relationships`, `input_carousels`, dan `pronunciation_carousels` menentukan carousel relasi yang tersedia. Konstruktor karakter alternatif dapat membiarkan Input tanpa batasan dan menempatkan relasi karakter di Pelafalan. Konstruktor kosakata dapat menempatkan relasi karakter, karakter alternatif, dan kosakata di Input; konstruktor kalimat dan gabungan dapat menempatkan relasi partikel, karakter alternatif, dan kosakata di sana. Pelafalan kosakata, kalimat, dan gabungan diturunkan secara rekursif dari bagian-bagian terurutnya, sehingga konstruktornya menghilangkan bidang pelafalan.

Setiap kali bidang pelafalan terlihat dalam formulir pembuatan atau penyuntingan, Library merender composer pelafalan alih-alih textarea daftar generik. `pronunciation_carousels` milik konstruktor tetap menentukan carousel relasi khusus lapisan yang muncul di dalamnya.

Aturan konstruktor saat ini menggantikan pemilih pelafalan kosakata sebelumnya: kosakata memakai carousel karakter, karakter alternatif, dan kosakata hanya di Input. Kalimat dan gabungan memakai carousel partikel, karakter alternatif, dan kosakata di Input. Hanya karakter alternatif yang memakai carousel karakter di Pelafalan sementara Input tetap bebas. Pelafalan kosakata, kalimat, dan gabungan dihitung ulang saat penyimpanan dari seluruh grafik relasi terurut.

Formulir kosakata, kalimat, dan gabungan tidak pernah merender penyunting nilai daftar generik untuk pelafalan, meskipun payload penyedia menyertakan bidang turunan tersebut. Bidang penyedia bernilai daftar lainnya memakai area teks biasa yang dipisahkan per baris, bukan chip tag yang dapat dihapus; tag klasifikasi entri tetap memakai kontrol metadata khususnya.

Kartu kosakata dan kalimat memutar audio dependensi terurutnya sebagai satu rangkaian ketika tidak memiliki audio unggahan sendiri. Unggahan audio opsional pada kartu menggantikan rangkaian turunan tersebut. Jika salah satu dependensi tidak memiliki audio, ikon pengeras suara yang dinonaktifkan menjelaskannya saat penunjuk diarahkan.

Carousel pelafalan kini memuat setiap relasi yang tersirat oleh deklarasi lapisan carousel milik konstruktor, meskipun kontribusi formulir runtime menghilangkan relasi itu dari daftar relasi skalarnya. Memilih item carousel langsung memperbarui nilai pelafalan; input teks bebas dan tombol commit pelafalan yang berlebihan telah dihapus dari formulir pembuatan dan penyuntingan.

Ketika konstruktor menyediakan bidang pelafalan tetapi membiarkan `pronunciation_carousels` kosong, composer kini menurunkan lapisan carousel dari relasi pelafalan yang dideklarasikan skema. Hal ini menjaga kontribusi formulir runtime lama atau tidak lengkap tetap berfungsi, sementara deklarasi carousel eksplisit tetap menjadi acuan utama.

Profil composer semantik bawaan kini menerapkan kontrak carousel yang diminta secara langsung: karakter alternatif memakai Input bebas dan carousel Pelafalan karakter atomik; kosakata memakai carousel Input karakter atomik, karakter alternatif, dan kosakata serta carousel Pelafalan karakter atomik; kalimat memakai carousel Input partikel, karakter alternatif, dan kosakata tanpa pelafalan yang dapat disunting. Pelafalan kosakata dipraisi secara rekursif dari nilai lapisan karakter, sedangkan pelafalan kalimat tetap sepenuhnya diturunkan.

Lapisan karakter atomik dan partikel adalah data katalog yang tidak dapat diubah. API Library kini menolak pembuatan, pembaruan, permintaan pembaruan, dan penghapusan untuk lapisan tersebut bagi semua peran, termasuk administrator dan pemilik. Respons kemampuan UI menyembunyikan kontrol sunting dan hapus sambil mempertahankan penjelajahan hanya-baca.

Pilihan berurutan kini memakai satu urutan posisi komposisi yang sama di seluruh karosel Input. Lencana posisi menggambarkan urutan kartu yang disimpan dan tidak lagi dimulai ulang dari satu pada setiap karosel relasi.

Formulir penulisan tidak lagi menampilkan pemilih kelas konten internal Cognis. Nama lapisan penyedia yang dilokalkan mengidentifikasi kartu dalam tampilan detail, dan rekaman urutan teratur memakai ID lapisan penyedia, bukan label semantik `sentence` atau `composite`. Pelafalan turunan diserialkan sesuai kontrak bidang yang dideklarasikan penyedia, termasuk bidang pelafalan bernilai daftar.

Serialisasi bidang turunan mengambil kontraknya dari skema penyedia, bukan dari lapisan editor yang telah difilter konstruktor. Karena itu bidang pelafalan wajib tetap dapat ditemukan walaupun composer sengaja menghilangkan kontrol input langsungnya.

Setiap kali konstruktor mendeklarasikan lapisan karosel Input atau Pelafalan, judul terkait menyertakan bidang kartu terpilih yang persisten di atas karosel tersebut. Bidang ini diinisialisasi untuk entri yang sudah ada, langsung diperbarui bersama pilihan karosel, mempertahankan urutan komposisi, dan memungkinkan penulis menghapus kartu terpilih secara langsung.

Bidang berbasis karosel menerima boolean `multi_value` milik penyedia pada tingkat bidang. Bidang multi-nilai menambahkan tindakan **Simpan {bidang}** yang eksplisit, mempertahankan nilai yang telah disimpan sebagai pil yang dapat dihapus di atas komposisi aktif, serta memungkinkan nilai tersimpan dibuka kembali untuk diganti. Setiap bidang komposisi karosel hanya menerima teks yang diselesaikan menjadi kartu yang ditawarkan karosel terkonfigurasinya; teks yang tidak terselesaikan membuat formulir tidak valid. Penghapusan kartu terpilih atau nilai tersimpan harus memakai kontrol × khusus dan konfirmasi. Editor kartu yang sudah ada memasang karosel relasi yang sama dengan formulir pembuatan.

Boolean `multi_value` pada tingkat bidang adalah satu-satunya deklarasi multi-nilai. Pil tersimpan tidak lagi mengisi kembali komposisi sementara saat diklik. Area sementara multi-nilai dimulai kosong, kontrol × ringkasnya hanya menghapus kartu sementara tanpa konfirmasi, dan referensi baru disimpan melalui tindakan Simpan khusus bidang yang terlihat. Nilai tersimpan tidak berubah ketika kartu sementaranya dihapus. Label kartu dibuat dari komposisi Input utama yang berurutan, bukan ditampilkan sebagai nilai terpisah yang dapat diedit, dan pratinjau kartu yang terlihat langsung diperbarui setelah penyimpanan berhasil.

Kartu karosel kembali menampilkan pratinjau saat diarahkan atau difokuskan dengan papan ketik untuk setiap item, termasuk entri tanpa definisi. Pratinjau karosel dan tooltip audio yang tidak tersedia dirender dalam portal berjangkar pada tingkat body sehingga luapan kartu, karosel, dan popup tidak memotongnya.

Relasi berkelompok mempertahankan larik referensi bertingkat untuk bidang multi-nilai. Dengan demikian, setiap pelafalan dapat memiliki urutan karakter terurut tersendiri yang tetap berkelompok selama pemeriksaan paket konten, validasi, penyimpanan, pengeditan API, dan penyajian judul tertaut, bukan diratakan menjadi satu daftar ambigu.

Kartu tersembunyi dikecualikan dari setiap karosel dan daftar kandidat saran ketik. Dependensi tersembunyi yang sudah ada tetap dipertahankan dalam kontrol relasi dasar saat kartu diedit, tetapi tidak pernah ditawarkan sebagai pilihan karosel yang dapat dipilih penulis.

Relasi berkelompok yang dimuat dari penyimpanan dipadatkan sebelum entri diurutkan berdasarkan posisi. Dengan demikian, indeks grup yang hilang tidak dapat menggagalkan endpoint entri Pustaka, sedangkan urutan setiap grup pelafalan tersimpan tetap deterministik.

Pratinjau kartu Pustaka menampilkan paling banyak dua pelafalan berbeda pertama. Tampilan detail entri tetap menyediakan seluruh rangkaian pelafalan tanpa membuat kartu penjelajahan terlalu tinggi atau padat.

Tampilan pelafalan menyatukan setiap urutan karakter bertingkat menjadi bacaan lengkap sebelum membandingkannya dengan label kartu. Pelafalan berkelompok seperti `["さ", "き"]` karena itu ditampilkan sebagai `さき` dan dihilangkan ketika kartu sudah memakai nilai yang sama.

Judul pelafalan tertaut juga dideduplikasi berdasarkan tampilan UI yang sebenarnya: label karakter tertaut digabungkan, spasi dan bentuk Unicode dinormalisasi, lalu bacaan hasilnya dibandingkan dengan nilai kartu. Dengan demikian, urutan tertaut `さ` + `き` tidak mengulang judul `さき` meskipun representasi pelafalan yang tersimpan berbeda.

Satu grup bidang multinilai dapat mencakup beberapa relasi tautan yang dideklarasikan. Indeks grup sejajar di seluruh relasi tersebut, sehingga validasi membandingkan jumlah nilai bidang dengan jumlah grup relasi tertaut terbesar, bukan menjumlahkan semuanya. Ini mendukung pelafalan yang disusun bersama dari segmen bacaan bermakna dan akhiran karakter langsung.

Ketika pelafalan tertaut mengeja nilai utama kartu secara tepat, detail judul turun satu tingkat presentasi dan menampilkan nilai pelafalan milik kartu tertaut. Ejaan Kana seperti `さ` + `き` karena itu dapat menampilkan bacaan lapisan karakternya alih-alih mengulang `さき`.

Deduplikasi referensi judul kini memperlakukan ejaan terurut sebagai satu kesatuan, bukan menghapus karakter yang cocok satu per satu. Ketika ejaan lengkap itu sama dengan nilai utama, kartu karakter tertaut menampilkan nilai pelafalannya; fragmen parsial tidak lagi dapat menghasilkan judul dengan pelafalan tampak yang berbeda dari nilai utama. Tampilan detail Kanji tetap menampilkan daftar bacaan lengkap yang ditulis penyedia, bukan bacaan yang disimpulkan dari kartu tetangga.

Menghapus kartu composer yang sedang disiapkan mengharuskan klik tepat pada tombol × yang ringkas; pil kartu terpilih di sekitarnya dan area komposisi kosong tidak memicu penghapusan. Sebelum popup pembuatan ditutup, composer juga memeriksa setiap jumlah minimum relasi yang diwajibkan penyedia. Definisi yang kurang kini menampilkan toast validasi standar dan membiarkan popup, kartu terpilih, teks masukan, serta definisi bertingkat tetap utuh untuk diperbaiki.

Rincian pelafalan dan definisi yang panjang pada judul entri mempertahankan posisi awalnya, tetapi menggunakan paling banyak 40% lebar judul dan membungkus ke baris tambahan. Tanda pisah kini memisahkan definisi dari pelafalan dengan lebih jelas. Komposer pembuatan menerima maksimal 8 tag, 10 definisi, dan 16 pelafalan serta menampilkan toast yang dilokalkan saat batas tercapai.

Judul dengan banyak pelafalan kini memakai susunan empat kolom hanya ketika bacaan tersedia: pengeras suara berada di bawah ikon cakupan, kelompok pelafalan menggunakan hingga 40% judul, dan definisi membungkus secara mandiri di sebelah kanannya. Batas 8 tag, 10 definisi, dan 16 pelafalan kini berlaku sama pada komposer pembuatan dan pengeditan.

Saat cabang anak karakter yang diperluas akan melewati kisi Pustaka yang terlihat, penyesuaian waktu proses kini memeriksa semua slot diagonal sebelum beralih ke arah utama yang berlawanan. Semua kartu akar yang terlihat juga dianggap terisi, sehingga diagonal pertama yang berada dalam batas dan bebas tabrakan dipilih agar kartu anak beserta penghubungnya tetap berada di kanvas.

## Komposisi kalimat dan transformasi

Penyedia menandai kosakata akhir kalimat atau transisi dengan tag stabil seperti `sentence-transition`, lalu mendeklarasikan item `tag_carousels` pada konstruktor kartu kalimat. Entri tersebut dikeluarkan dari tampilan kosakata biasa dan muncul dalam karusel khusus yang hanya tersedia saat menyusun kalimat. `literal_carousels` menyediakan satu baris tanda baca berulang yang hanya dapat dibaca; penyedia mencantumkan tanda baca bahasanya, misalnya `, . ? !` untuk bahasa Inggris atau `？！。、` untuk bahasa Jepang.

Penyedia menandai bentuk dasar verba dan adverbia dengan `verb` atau `adverb`, lalu mendeklarasikan tampilan lapisan `views` dengan `layout: transformTree`. Entri yang dimiliki tampilan ini dipindahkan dari halaman kosakata biasa ke halaman terpisah yang dinamai penyedia. Paket konten hanya boleh mengirim entri leksikal bentuk dasar (misalnya `歩く`), bukan satu kartu untuk setiap infleksi. Deklarasi `transformSets` tingkat skema memasok transisi keadaan deterministik. Setiap aturan menentukan keadaan asal dan tujuan serta mengganti satu sufiks melalui `removeSuffix` dan `append`; beberapa aturan dapat keluar dari keadaan yang sama dan aturan lanjutan dapat bekerja pada keadaan hasil. `matchTags` memilih kelas bentuk dasar yang sesuai agar keluarga konjugasi dapat dibedakan dengan tag seperti `godan-ku`.

```json
{
    "transformSets": [
        {
            "id": "godan-ku",
            "matchTags": ["verb", "godan-ku"],
            "baseState": "base",
            "rules": [
                {
                    "id": "potential",
                    "fromState": "base",
                    "toState": "potential",
                    "removeSuffix": "く",
                    "append": "ける"
                },
                {
                    "id": "negative",
                    "fromState": "base",
                    "toState": "negative",
                    "removeSuffix": "く",
                    "append": "かない"
                },
                {
                    "id": "desiderative",
                    "fromState": "base",
                    "toState": "desiderative",
                    "removeSuffix": "く",
                    "append": "きたい"
                }
            ]
        }
    ]
}
```

Tag transisi kalimat kini dikeluarkan dari karusel masukan biasa sekaligus halaman kosakata, sehingga karusel komposer terfilternya benar-benar terpisah. Komposer pengeditan merekonstruksi token tanda baca berulang dari label kalimat tersimpan dan referensi berurutan. Pohon transformasi kini memiliki simpul yang dapat dijalankan: memilih bentuk hasil memperbarui pratinjau jalur, sementara kartu bentuk dasar tetap menjadi entri kanonis yang disimpan. Validasi kontrak menolak literal tanda baca duplikat, set transformasi kosong, transisi keadaan duplikat, dan aturan tanpa perubahan.

Cabang kartu anak kini mempertahankan setiap posisi kartu yang telah disesuaikan saat turunan yang lebih dalam dibuka. Turunan yang baru ditampilkan diukur berdasarkan kedalaman dan hanya diarahkan ke slot kanvas yang terlihat serta bebas tabrakan, sehingga mencegah lompatan leluhur, tumpang tindih kartu, dan konektor yang berdesakan selama navigasi pohon alami.

Jalur kartu anak diagonal kini menyediakan koridor penunjuk berkelanjutan yang lebih besar, perubahan cabang menunggu sejenak untuk memastikan niat arah penunjuk, dan kartu aktif memakai cincin fokus stabil alih-alih animasi berdenyut. Arah alternatif tetap dekat dengan sumbu pilihan sebelum mempertimbangkan slot jauh, sehingga tata letak awal lebih rapat dan konsisten.

Komposisi input dan pelafalan kini memakai perender input token yang dapat digunakan kembali serta implementasi karosel relasi yang sama. Karosel input tampil tepat di bawah bidang tokennya, memakai kontrol hapus ringkas dan status pilihan yang sama, serta hanya menawarkan pembuatan dependensi jika lapisan tujuan mendukung kartu buatan pengguna. Dependensi baru dimasukkan melalui perender item karosel kanonis yang dapat digunakan kembali pada komposer buat maupun edit.

Dependensi baru yang dibuat dari carousel relasi dimasukkan melalui alur pemilihan normal carousel tersebut, sehingga kartu yang dikembalikan langsung dipilih dan ditambahkan ke tahap komposisi aktif. Composer pelafalan karakter alternatif juga memperlakukan setiap relasi karakter atomik sebagai sumber pelafalan, meskipun penyedia memakai peran presentasi relasi yang lebih umum.

Composer kartu yang mendukung guratan menampilkan bagian khusus **Pola Guratan**. Penyedia pencarian mendeklarasikan ID bidang yang dapat mereka isi; penyedia yang mengiklankan bidang guratan ditampilkan di sana sebagai tindakan ringkas **Cari**, dan data guratan ternormalisasi yang dimuat digambar dalam pratinjau persegi kecil berukuran empat rem. Validasi editor bertab menandai setiap tab yang memuat data wajib tidak valid, membuka tab yang berisi bidang tidak valid paling awal, lalu memindahkan fokus ke bidang tersebut atau ke tindakan pembuatan definisi ketika definisi wajib belum ada.

Definisi pada judul popup kini ditampilkan tanpa awalan tanda pisah panjang. Kelompok pelafalan dan definisi menempati baris judul dan disejajarkan secara vertikal dengan judul utama kartu.

Skema lapisan dapat menetapkan `dictionary_lookup: false` untuk menyembunyikan penyedia pencarian yang mendeklarasikan kapabilitas `dictionary`. Penyedia pencarian mendeklarasikan kapabilitas netral dan ID bidang yang diisinya agar tindakan pencarian guratan hanya ditempatkan di bagian Pola Guratan. Composer karakter alternatif memperlakukan relasi non-definisi sebagai sumber pelafalan dan tidak mewajibkan definisi. Tag ditampilkan terakhir pada setiap formulir Konten. Tab wajib mempertahankan gaya normal dan hanya menampilkan tanda bintang merah; definisi wajib yang belum ada juga menandai tindakan tambahnya.

Editor Library mendelegasikan aktivasi tab, penanda tab tidak valid, dan fokus ke bidang tidak valid pertama kepada pengontrol `bindTabbedFormValidation` milik composer formulir pakai ulang. Kode Library hanya menyediakan target fokus definisi dan kelas penanda wajib yang khusus domain.

Payload formulir karakter alternatif menyalin `pronunciation_carousels` langsung dari payload formulir kosakata pada skema yang sama. Composer memakai payload yang sudah selaras itu tanpa inferensi carousel atau penyaringan relasi khusus karakter alternatif. Perutean pencarian guratan tetap menempatkan aksi **Cari** milik penyedia di dalam Pola Guratan. Rute lapisan Library menerima segmen tampilan opsional untuk tampilan Kata Kerja dan Kata Keterangan dari penyedia.

Penyelarasan payload formulir karakter alternatif kini memperbarui `pronunciation_carousels` beserta ID relasi yang merender carousel tersebut. Relasi milik carousel pelafalan Kosakata yang diganti dihapus, lalu relasi karakter yang digunakan carousel pelafalan kartu Kosakata dimasukkan. Karena itu formulir karakter alternatif menampilkan carousel karakter dan tidak lagi menampilkan Kosakata di bawah Pelafalan.

Penurunan pelafalan kini berhenti pada pelafalan eksplisit pertama dan hanya memakai label sebagai cadangan untuk kartu karakter atomik, sehingga kata dan kalimat baru tidak lagi diratakan menjadi bacaan karakter. Pembuatan menolak duplikat yang terlihat berdasarkan input ternormalisasi saja; konfirmasi menjelaskan bahwa melanjutkan akan memilih kartu yang ada, bukan membuat baris lain. Penyimpanan dan peninjauan permintaan push mengenali jenis `update` dan `merge`.

Definisi popup kini menempati baris grid kedua yang dimulai tepat di bawah judul kartu, bukan kolom khusus di sisi kanan. Bacaan tetap berada di tengah baris judul, sedangkan definisi panjang membungkus secara alami di bawah judul.

Resolusi pelafalan partikel kini bersifat terminal seperti karakter atomik: pelafalan partikel eksplisit dipakai terlebih dahulu, dan jika tidak ada, label partikel dipakai. Resolver tidak lagi menelusuri referensi karakter partikel, sehingga partikel peka konteks seperti は dan が tetap dilafalkan sesuai penulisan.

Menyimpan tahap pelafalan kosong kini menampilkan toast kesalahan. Kartu pelafalan tersimpan menempatkan kontrol hapus di dalam kartu; memilih kartu tersimpan memindahkan referensi komponen berkelompok kembali ke tahap dan memilih ulang kartu carousel terkait untuk diedit.

Kontrol “Selalu tampilkan definisi dalam pratinjau kartu” kini berada di tab Definisi di samping ringkasan definisi. Editor kartu yang sudah ada juga menyediakan aksi tambah definisi; definisi baru langsung dipilih dan ditambahkan ke ringkasan yang terlihat.

Atribusi induk pada judul popup kartu kini menggunakan penempatan bacaan dan disisipkan sebelum penempatan definisi. Kartu yang mewarisi definisi induk mempertahankan atribusi secara utuh pada baris judul, sementara definisi tetap utuh di bawah judul.

Tag entri paket konten kini divalidasi, disertakan dalam identitas konten, serta disimpan pada kolom tag entri Pustaka dan teks pencarian. Kosakata bertag dari penyedia karena itu tetap tersedia bagi tampilan yang dideklarasikan seperti Kata Kerja dan Kata Keterangan setelah penyerapan.

Set transformasi mendukung aturan berantai dan bercabang tanpa batas, termasuk operasi sufiks pelafalan opsional serta penggantian definisi yang dilokalkan. Tampilan kata kerja dan kata keterangan merender jalur ini sebagai pohon teknologi yang terhubung. Memilih kartu korsel yang dapat ditransformasi membuka pohon yang sama dan menyisipkan bentuk terpilih ke dalam kalimat tersusun sambil mempertahankan referensi ke kartu dasar kanonis. Saat referensi yang ditransformasi dibuka kembali, bentuk yang ditulis akan dikenali, kartu dasar dibuka dengan bentuk tersebut, dan seluruh jalur ditampilkan bersama pelafalan serta definisi khusus transformasi.

Penyesuaian kartu anak memperlakukan setiap kartu leluhur sebagai zona terlarang mutlak. Arah diagonal dan kardinal diperiksa pada jarak yang makin besar, sehingga kartu anak yang terhalang dipindahkan dua slot atau lebih ke luar bila diperlukan, bukan melintasi atau menghilang di belakang kartu mana pun dalam rantai induknya.

Tampilan pohon transformasi kini dimulai sebagai kisi kartu padat selebar halaman. Kartu tanpa transformasi yang tersedia tetap tidak aktif. Membuka kartu yang dapat diperluas memindahkannya ke atas, menganimasikan kartu lainnya hingga menghilang, dan mengembangkan pohon tepat di bawah akar yang dipusatkan sepanjang lebar konten; kontrol tutup mengembalikan kisi. Memilih transformasi menyorot dan terus menganimasikan seluruh jalurnya kembali ke akar, sedangkan label transformasi ditumpuk di atas nilai agar tidak meluber pada kartu sempit.

Pohon transformasi kini mempertahankan kartu kata kerja atau kata keterangan sumber sebagai akar visual yang tidak berubah dan menghapus ringkasan bentuk terpilih yang berulang di bawahnya. Segmen penghubung bertemu tanpa celah dan beranimasi terus-menerus di seluruh pohon, sementara jalur asal yang dipilih tetap ditonjolkan. Mengklik kartu sumber yang sudah terbuka kini membuka tampilan detail standarnya.

Entri verba dan adverbia tetap berada di halaman Kosakata, dengan tag transformasi penyedia sebagai filter. Setiap aturan dapat mendeklarasikan `definitionTransform` terlokalisasi dengan batas opsional `matchPrefix` dan `matchSuffix` serta `template` wajib. Templat disusun sepanjang jalur yang dipilih dan mendukung `{{ definition }}`, `{{ stem }}`, `{{ prefix }}`, serta `{{ suffix }}`, sehingga penyedia dapat menyatakan perubahan tata bahasa alih-alih penanda tetap. Setelah Varian dipilih, tampilan detail menggambar ulang judul, pelafalan, definisi, dan masukan gambar hasil transformasi sambil menonaktifkan penyuntingan.

Graf transformasi menempatkan setiap kedalaman pada satu baris horizontal, menaruh definisi di bawah kartu, menyediakan kolom definisi selebar empat belas rem, serta membatasi luapan horizontal dan vertikal pada area graf. Kontrol popup tetap terlihat sementara konjugasi yang dalam atau sangat bercabang tetap mudah dibaca.

Transformasi definisi juga dapat mendeklarasikan `replacements` terlokalisasi yang berurutan. Substitusi pertama yang cocok menulis ulang transformasi sebelumnya sebelum templat cadangan digunakan, sehingga mendukung rantai kontekstual seperti `to (want to) exist` → `to (have wanted to) exist`; templat dengan `{{ definition }}` dapat menambahkan makna, misalnya `to (want to) exist (and then)`. Entri tanpa transformasi ditampilkan sebagai kartu akar yang terpusat di atas baris transformasi pertama.

Referensi kalimat dapat mendeklarasikan `transformation: { "setId": "...", "path": ["rule-id", "..."] }`. Cognis memvalidasi bahwa jalur tersebut berlaku pada entri dasar yang dirujuk, menyimpannya bersama relasi, lalu menemukan bentuk hasil yang tepat tanpa heuristik label. Detail hasil transformasi memakai penanda anak standar untuk menampilkan **Dari: {induk}**; memilih anotasi induk tersebut membuka verba atau adverbia kanonis.
Komposisi judul cadangan mengikuti hierarki pustaka: kalimat dapat menaut ke kata, kata dapat menaut ke unit tulisan majemuk dan atomik, serta unit tulisan majemuk dapat menaut ke unit tulisan atomik. Entri kosakata homograf tidak pernah dianggap sebagai komponen ejaan entri kosakata lain; entri seperti bacaan bahasa Jepang untuk bunga dan hidung `はな` masing-masing menaut secara mandiri ke `は` dan `な`.

Pembuatan kartu secara inline kini menyimpan pilihan karakter pelafalan yang masih disiapkan sebelum kartu dibuat. Menyimpan bacaan yang sudah diberikan oleh pencarian melampirkan tautan karakter terpilih tanpa menambahkan pelafalan duplikat. Nilai pencarian langsung ditampilkan ulang dengan format baris daftar pelafalan, dan bacaan kosakata serta kalimat yang disusun otomatis tetap terlihat saat masukan utama berubah. Judul detail mencocokkan kelompok bacaan berdasarkan bacaan lengkapnya, bukan posisi dalam daftar, dan dapat menghubungkan bacaan yang belum tertaut ke kartu karakter kanonis.

Judul dan pelafalan kosakata yang ditransformasi menautkan satuan tulisan kanonis dari bentuk yang ditampilkan. Digunakan Oleh juga mencakup komposisi ejaan dan pelafalan kanonis yang lengkap, sehingga kana gabungan dapat menautkan kembali ke kosakata meskipun referensi tersimpan menunjuk satuan yang lebih kecil. Hubungan langsung tetap terlihat; komposisi yang tidak lengkap tidak menghasilkan tautan sebagian.

Daftar hubungan dalam detail menampilkan tetangga langsung. Digunakan Oleh, Contoh Penggunaan, dan pohon hubungan mengecualikan entri yang hanya dicapai melalui induk ejaan atau pelafalan lain, termasuk referensi berkelompok. Tautan langsung tetap tersedia, dan referensi siklik tidak menyebabkan penelusuran berulang. Item Serupa tetap menampilkan entri pada lapisan yang sama.

Hubungan langsung tetap terlihat meskipun jalur melalui entri perantara mencapai kartu yang sama. Referensi tersimpan, referensi berkelompok, dan komponen judul kanonis mempertahankan tautan langsung, mendukung あ → ある + あるく serta あ → ある → あるく. Hanya hubungan yang dicapai semata-mata melalui induk lain yang dikecualikan.

Kartu yang ditransformasi tidak menampilkan pelafalan yang sama dengan judulnya setelah normalisasi. Pelafalan yang berbeda tetap memiliki tautan karakter. Tindakan terlokalisasi Kembali ke {{ verb }} memulihkan kartu dasar dan menghapus transformasi yang dipilih sambil mempertahankan navigasi kartu biasa.

Penulisan ketergantungan kini memeriksa visibilitas setiap hubungan, termasuk referensi berkelompok. Kartu pribadi dapat memakai kartu bersama yang dapat dibaca dan komponen pribadinya sendiri; kartu kelas memerlukan komponen global atau dari kelas yang sama; kartu global memerlukan komponen global. Usulan pembaruan memvalidasi skema referensi sebelum pengajuan, persetujuan penerbitan memeriksa kembali ketergantungan terkini, dan perubahan tidak boleh membatalkan keabsahan penerbitan yang tertunda. Konten bersama tidak dapat dikembalikan ke cakupan pribadi jika kartu bersama yang bergantung padanya atau permintaan tertunda masih memerlukan visibilitas yang lebih luas. Petunjuk izin dikembalikan setelah pembuatan dan perubahan serta mengikuti akses tulis kelas.

Penghapusan mengonfirmasi semua kartu turunan yang dapat dihapus berdasarkan aturan kaskade dan pembatasan, termasuk referensi berkelompok. Kartu yang hanya dipisahkan tetap disimpan. Transaksi memeriksa kepemilikan, akses kelas, perlindungan, dan peninjauan tertunda pada setiap kartu sebelum menghapus apa pun. Kartu terbatas yang dicapai melalui kaskade lain tidak lagi gagal akibat urutan penelusuran. Pembuatan kartu bersama menawarkan penyimpanan pribadi jika cakupan ketergantungan terlalu sempit. Bantuan penerbitan dapat mengajukan komponen terbawah yang memenuhi syarat, termasuk definisi tersembunyi, sebelum mengajukan kartu induk setelah persetujuan.

Server merencanakan konfirmasi penghapusan menggunakan versi skema tersimpan dan menyertakan kartu dependan yang tidak ada di halaman saat ini. Klien gateway Study menyediakan pemeriksaan penghapusan tanpa perubahan data.

## Impor kamus dan draf

Hasil kamus dapat ditinjau sebelum menerapkan pelafalan, klasifikasi, tag, referensi, dan definisi tiap makna. Pelafalan yang diimpor langsung muncul dengan kontrol yang sama seperti pelafalan yang disimpan manual. Pelafalan otomatis mengikuti perubahan masukan utama sambil mempertahankan alternatif pengguna. Tab wajib memiliki satu penanda dan tombol tambah definisi lebih ringkas.

Kontrak lookup umum menerima `class`, `tags`, `definitions` (terjemahan lokal dan asal), serta `sourceUrl`. Data khusus penyedia disimpan dalam bidang yang dideklarasikan penyedia; modul Jepang mendeklarasikan `dictionary_data` tersembunyi untuk menyimpan rekaman Jisho lengkap. Aturan cakupan, deteksi konflik, validasi dependensi, dan pembersihan saat pembatalan juga berlaku bagi definisi yang diimpor.

Ambil terjemahan yang belum tersedia menggunakan `POST /api/v1/study/library/definitions/localize` dengan `{ translations, languages }`. Bahasa UI yang belum tersedia diminta melalui `localization:translateString`, terjemahan yang diberikan tetap dipertahankan, dan `missingLanguages` dilaporkan jika penyedia tidak tersedia atau gagal. Teks yang belum diterjemahkan dapat diedit; teks Inggris tidak disalin ke bidang bahasa lain. Tindakan ini juga tersedia saat menambahkan definisi secara manual.

## Pembuatan oleh administrator dan pencarian pola goresan

Administrator membuat kartu langsung di ruang nama global tanpa kontrol Publikasikan. Definisi yang dibuat langsung atau diimpor dari kamus menggunakan tujuan global yang sama; dependensi pribadi harus diterbitkan sebelum penyimpanan. Pencarian Pola Goresan langsung menerapkan pola penyedia tanpa membuka pratinjau kamus.

## Pencarian mengisi penyusun kartu

Pencarian kamus kini langsung mengisi penyusun kartu yang terbuka dan menyimpan semua definisi serta pelafalan yang dikembalikan tanpa popup hasil atau langkah Terapkan. Nilai yang sudah ada memerlukan konfirmasi penggantian sebelum permintaan; pembatalan serta pencarian kosong atau gagal mempertahankan kartu saat ini. Pencarian Pola Goresan yang berhasil menyembunyikan tombolnya. URL sumber kamus disimpan dalam data sumber tersembunyi, bukan ditampilkan sebagai tautan.

## Impor yang terselesaikan dan definisi yang dapat diedit

Impor kamus memetakan ID catatan penyedia ke kartu terpasang yang dapat diakses sebelum menambahkan tautan biasa atau berkelompok. Target yang hilang atau ambigu membiarkan nilai hasil tanpa tautan dengan peringatan, bukan menghalangi penyimpanan. Definisi yang telah disimpan memiliki tindakan Edit melalui editor kartu yang memeriksa izin, dan perubahan tersimpan memperbarui ringkasannya. Bidang skema tersembunyi, termasuk data sumber kamus, tidak ditampilkan dalam formulir tetapi nilai tersimpannya dipertahankan.

## Perbaikan pencarian editor

Pencarian goresan disembunyikan saat pola yang berhasil diambil tersedia, termasuk pola dari hasil kamus atau kartu tersimpan. Menghapus pola menampilkan pencarian kembali. Editor definisi menampilkan terjemahan di Konten tanpa tab Definisi yang berlebihan. Makna kamus yang dipisahkan titik koma menjadi definisi tersendiri yang langsung disimpan, dengan terjemahan yang sesuai dan metadata sumber asli tetap tersimpan. Makna terstruktur menggantikan tautan definisi sumber gabungan.

## Tautan pelafalan kamus

Impor kamus menyelesaikan pelafalan lengkap ke Kana terpasang melalui kecocokan lengkap terpanjang, termasuk karakter gabungan seperti きょ dan っく serta posisi berulang. ID entri kanonis disimpan dalam kelompok bacaan berurutan; bacaan dengan karakter yang hilang tidak ditautkan sebagian. Definisi menggunakan kembali kartu yang cocok atau membuat kartu melalui alur editor biasa. Karusel tetap menjadi cara utama membuat kartu turunannya. Karakter dan partikel tetap menjadi lapisan hanya-baca yang dikelola penyedia. Editor kalimat tidak menawarkan pencarian kamus.
