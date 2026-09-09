# Peristiwa Kemajuan Belajar

**Cabang Fitur:** feature-create-study-progress-adapter-with-features

## Pelacakan kemajuan tetap

Menambahkan peristiwa belajar idempoten dengan lingkup privasi, koreksi kompensasi, proyeksi penguasaan yang dapat dibangun ulang, agregasi multidimensi, dan alur ekstensi bertahap.

## Grup filter metadata berfungsi

Grup metadata Pustaka kini dapat menetapkan pil pilihan tunggal eksklusif atau mengizinkan beberapa pilihan. Pemilihan pil langsung menyembunyikan kartu yang tidak cocok, termasuk kartu yang gaya kisi tampilannya sebelumnya mengalahkan status `hidden`.

## Audio bertema dan terautentikasi

Audio Pustaka kini dimuat melalui klien gateway Study terautentikasi, bukan permintaan media asli tanpa autentikasi. URL media sementara dibersihkan setelah dipakai, dan kontrol asli mengikuti tema aplikasi terang atau gelap.

## Struktur UI Pustaka sesuai aturan

Titik masuk peramban Pustaka dipindahkan ke tata letak adaptor wajib `ui/app/index.js`, lalu rute waktu jalan dan pengujian struktur diperbarui. Pemindaian dokumentasi kini mengabaikan keluaran build, pemeriksaan nama menangani sumber yang dipindahkan, dan pengujian router mencerminkan rute gateway dinamis serta status navigasi yang dipertahankan.

## Impor konten yang dapat diulang

ID konten Pustaka Studi kini stabil di seluruh versi paket dan setiap entri menyimpan hash konten kanonik. Impor menyatukan ID lama yang bergantung pada versi dan hash identik yang berulang menjadi satu entri kanonik sambil mempertahankan referensi masuk dan keluar sehingga kartu alfabet atau kosakata tidak berulang.

## Kegagalan audio yang jelas

Audio Pustaka yang gagal kini hanya mengganti pemutarnya dengan pesan terlokalisasi pada permukaan bertema yang sama, bukan melaporkan bahwa seluruh Pustaka gagal. Kontrol mode gelap menggunakan warna aksen dan permukaan tinggi aplikasi.

## Varian karakter terarah

Relasi karakter dan karakter alternatif dapat mendeklarasikan arah varian kiri, kanan, atas, atau bawah. Pustaka mempertahankan setiap varian sebagai entitas mandiri sambil membuka kontrol anak di sekitar kartu induk saat diarahkan atau menerima fokus papan ketik.

## Penghapusan oleh pemilik konten

Pemilik konten, administrator, dan pemilik sistem kini dapat memilih beberapa entri Perpustakaan dan menghapusnya secara permanen beserta relasinya. Pengaktifan modul memulihkan konten bawaan yang hilang secara default, sedangkan kotak centang penghapusan akan memasukkan hash konten terpilih ke daftar blokir agar rekaman yang sama tidak kembali.

## Varian dan pemilihan yang mudah

Varian terarah kini memakai tampilan kartu Perpustakaan lengkap dengan bayangan mengambang. Area hover tetap terhubung ke induk sehingga pengguna dapat berpindah dan membukanya. Kotak pilihan ganda tetap tersembunyi hingga kartu yang memenuhi syarat diklik kanan, mendukung mode gelap, dan rute Perpustakaan kembali memuat gaya subnavigasi Study secara lengkap.

## Penempatan pelafalan

Kartu unit tulisan dan judul detail kini menempatkan pelafalan karakter di samping karakternya, sedangkan pelafalan kata dan kalimat tetap di bawah teks. Kata satu karakter yang bermakna dapat dideklarasikan di sisi modul melalui relasi leksikal satu karakter, dan detail karakter menampilkan kata masuk yang sesuai.

## Tautan dan tindakan terarah

Pemilihan dengan klik kanan kini membuka bilah tindakan mengambang yang ada dengan Pilih Semua, Hapus, dan tutup; klik kartu biasa keluar dari mode pemilihan. Tanda centang dipusatkan, kontrol audio gelap menekan warna jingga bawaan, dan klik relasi mengaktifkan serta menyorot kategori tujuan. Teks definisi kini memuat tautannya secara langsung, sedangkan kotak unsur dibatasi pada relasi resolver yang dideklarasikan untuk menghapus tautan Katakana yang ganda dan tidak terkait.

## Filter stabil dengan varian

Filter metadata kini hanya memproses kartu dasar Perpustakaan yang memiliki data filter terserialisasi. Varian terarah yang mengambang tidak lagi mencapai pengurai filter dengan nilai dataset tak terdefinisi sehingga galat runtime halaman Perpustakaan teratasi.

## Pelafalan dan audio netral

Pelafalan karakter di samping judul detail kini memakai teks judul sekunder yang di-escape, lebih kecil, dan berbobot normal. Permukaan audio gelap secara eksplisit menolak penggantian warna paksa dan menerapkan gaya netral pada panel serta kontrol media bawaan peramban.

## Audio bertema aplikasi dan varian andal

Pustaka kini merender kontrol audio aksesibelnya sendiri alih-alih mengandalkan tampilan media bawaan peramban, sehingga warna aksen sistem operasi dan tema paksa tidak masuk ke pemutar. Kartu karakter yang diarahkan atau difokuskan dengan papan ketik dinaikkan di atas kartu kisi di sekitarnya agar varian anak terarah tetap terlihat dan interaktif.

## Kisi bagan yang ditentukan modul

Skema lapisan Pustaka kini dapat meminta ukuran baris dan menempatkan konten berdasarkan ID rekaman, termasuk sel kosong eksplisit untuk bagan konvensional. Kartu diskalakan secara merata untuk memenuhi baris yang diminta, dan kartu anak mengambang kini dirender dengan opasitas 95%.

## Filter metadata wajib

Modul dapat menandai grup filter metadata sebagai wajib dan memilih tag bawaan. Grup wajib selalu mempertahankan satu pilihan, sedangkan grup dengan hanya satu tag yang dirender memilih tag tersebut secara otomatis.

## Komposisi karakter eksplisit

Detail alt-character dan kata kini mengelompokkan tautan karakter berbasis resolver di bawah label relasi yang ditentukan modul serta menempatkan operator komposisi di antara karakter yang berurutan. Definisi dan bacaan pelafalan tetap dibedakan secara visual dari komposisi ejaan tersebut.

## Pembukaan varian yang disengaja

Kartu dengan anak kini menampilkan petunjuk tekan lama saat diarahkan dan hanya membuka varian setelah ambang tahan. Kartu varian mempertahankan garis tepi hijaunya saat diarahkan, menutup ketika fokus meninggalkan seluruh grup kartu, dan juga muncul di bagian khusus pada tampilan detail induk.

## Arah kartu anak yang terlihat

Kartu anak yang dibuka kini memiliki garis tepi hijau dan panah hijau yang menunjukkan arahnya dari induk. Jarak induk-ke-anak memakai token jarak yang sama dengan kisi kartu biasa.

## Kontrak varian tiga posisi

Relasi varian kini mendeklarasikan `variant: true` secara eksplisit; arah dibatasi ke kiri, atas, dan kanan. Jika dihilangkan, Pustaka memilih posisi pertama yang belum ditempati. Panah arah disediakan sebagai aset tema terang dan gelap yang terpisah, dan entri versi adaptor bahasa Jepang lama di repositori telah dihapus.

## Gestur kartu ditukar

Klik kanan kini membuka pilihan ganda, sedangkan menahan kartu induk hingga ambang tekan lama memudarkan masuk dan mempertahankan kartu anak tetap terbuka. Kartu anak sepenuhnya legap dengan garis tepi hijau yang sama saat diam maupun diarahkan, dan mengosongkan pilihan terakhir otomatis keluar dari mode pilihan ganda.

## Tampilan Perpustakaan terstruktur tanpa duplikasi

Perpustakaan kini menggunakan nama lapisan terlokalisasi, hanya merender bidang terdeklarasi yang tidak kosong, dan tidak lagi mengulang varian pada tampilan detail. Lapisan berbasis definisi mewajibkan referensi makna terlokalisasi, sedangkan modul bahasa dapat menyediakan makna kalimat gabungan dan dampak partikel melalui alur detail. Kisi juga menerima ID tampilan numerik dan ruang kosong eksplisit.

## Definisi tetap tertanam

Rekaman definisi tidak lagi dapat dibuka secara langsung dan hanya menyediakan teks bagi kartu lain. UI menampilkan konten terlokalisasi hanya dalam bahasa antarmuka aktif. Peran tampilan baru membedakan komposisi, ejaan alternatif, dan pelafalan, sedangkan pratinjau berbasis definisi kini menerima rekaman definisi yang dirujuk.

## Tautan komposisi pada judul

Saat satu tautan komposisi memuat teks yang sama dengan kartu saat ini, tautan tersebut kini menggantikan judul popup dan bagian Komposisi duplikat dihilangkan.

## Lebar Perpustakaan tanpa luapan

Widget pembungkus kini menyesuaikan ukuran dengan skema Perpustakaan sambil tetap dibatasi ruang yang tersedia, sehingga menghilangkan ruang kosong di sisi kanan dan luapan halaman horizontal.

## Kontrak shell halaman inti yang dilindungi

Menetapkan daftar lengkap yang dapat dibaca mesin untuk kelas shell halaman, composer, navigasi, widget, dan popup yang dilindungi. CSS dan skrip komponen tidak lagi dapat menimpa atau menelusuri bagian internal tersebut; pelanggaran yang ada kini memakai opsi composer inti, API popup, dan variabel tata letak yang dideklarasikan.

## Memulihkan penguraian kode bahasa Pustaka

Dependensi pengurai bahasa yang eksplisit dipulihkan dalam modul presentasi Pustaka yang telah dipisahkan, sehingga rute Pustaka tidak lagi gagal saat menyelesaikan label dan definisi yang dilokalkan.

## Melindungi kontrak UI yang dapat digunakan kembali

Penegakan kepemilikan UI diperluas ke setiap kelas yang dihasilkan oleh gaya inti yang dapat digunakan kembali. Manifest lengkap dan pemeriksaan arsitektur kini mencegah adapter, gateway, dan modul menimpa kontrol tersebut, sementara penimpaan lama dipindahkan ke selektor milik komponen atau implementasi reusable yang generik.

## Memblokir aktivasi modul eksternal yang tidak aman

Aktivasi modul eksternal kini menjalankan pemindaian batas milik host sebelum pengujian modul. Impor dan URL langsung ke internal Cognis serta penimpaan CSS atas setiap kelas inti atau reusable yang dilindungi ditolak, sementara integrasi melalui kapabilitas `ctx` yang tercakup tetap diizinkan.

## Pulihkan menu tarik-turun pengguna setelah navigasi halaman

Seluruh kerangka dasbor yang dipertahankan kini diterjemahkan setelah navigasi sisi klien, sehingga setiap tindakan menu pengguna tetap memiliki label pada halaman Belajar dan semua halaman dasbor lainnya.

## Gunakan lebar penuh halaman Perpustakaan

Kartu Perpustakaan kini memenuhi alokasi penyusun halamannya, dan penyuntingan tata letak dinonaktifkan agar penyesuaian tersimpan tidak dapat memperkecil atau memindahkan permukaan aplikasi tetap ini.

## Pertahankan menu pengguna di kerangka halaman

Menu tarik-turun pengguna kini memiliki lembar gaya khusus milik kerangka halaman inti, dan tata letak dasbor secara eksplisit mempertahankan pemuatan paket kerangka inti saat pemuatan langsung maupun navigasi SPA.

## Tampilkan menu pengguna melewati batas navigasi

Header kerangka halaman yang melekat tidak lagi memotong konten yang meluap, sehingga menu tarik-turun pengguna dapat tampil di bawah batas navigasi utama dengan urutan tumpukan kerangka yang tetap benar.

## Selaraskan tindakan menu Berbagi dan Keluar

Kontribusi menu pengguna asinkron seperti Berbagi kini otomatis menerima kelas menu milik kerangka. Tindakan Keluar memakai tampilan hover tindakan batal dan ikon daya yang menyesuaikan tema.

## Sempurnakan umpan balik tindakan bertema

Tindakan Keluar kini memberi jarak antara ikon daya dan label, serta mewarnai ikon dengan merah tindakan batal saat diarahkan. Tautan halaman Belajar memakai tampilan sukses yang lebih terang dalam mode terang, bukan hijau pekat dari tema gelap.

## Stabilkan interaksi dan tipografi kartu Perpustakaan

Kartu anak yang ditampilkan kini menutupi hitbox kartu di bawah penunjuk, judul detail diperbesar lima puluh persen, dan tindakan pemilihan memiliki jarak yang konsisten. Penyusunan detail kini menerima posisi varian dengan benar sehingga popup detail untuk catatan bereferensi dari paket modul bahasa terbaru kembali terbuka. Preferensi ukuran font aplikasi kini menjadi dasar root, dan ukuran teks piksel/poin tetap telah diubah menjadi unit relatif.

## Pertahankan pemisahan visual kartu anak

Aturan hover dan fokus papan ketik kartu anak kini cukup spesifik untuk mengesampingkan tampilan hover tombol netral bersama. Varian yang ditampilkan mempertahankan permukaan dan posisinya sehingga kartu bersebelahan di bawahnya tidak terlihat menembus kartu anak.

## Pisahkan varian yang ditampilkan dari kartu bersebelahan

Saat kartu anak dari induk terbuka, kisi kartu kini menempatkan lapisan buram dan warna noninteraktif di atas kartu bersebelahan tetapi di bawah induk aktif beserta anaknya. Ini mencegah permukaan kartu anak yang transparan bercampur secara visual dengan isi kartu tetangga.

## Tampilan lapisan minimal

Skema pustaka dapat mengaktifkan kartu ringkas pada tiap lapisan yang hanya menampilkan konten utama entri. Klik, pemilihan melalui klik kanan, penampilan varian dengan tekan lama, dan kartu turunan yang ditampilkan tetap memakai model interaksi yang ada.

## Tipografi popup relatif terhadap preferensi

Popup detail kini menetapkan tipografi berdasarkan ukuran font aplikasi pilihan pengguna, dengan tingkat judul proporsional dan bukan judul Pustaka tetap yang terlalu besar. Modul eksternal yang memakai ukuran font CSS absolut gagal dalam validasi batas sebelum aktivasi.

## Hilangkan luapan semu Pustaka

Kartu varian berarah yang tersembunyi tidak lagi ikut membentuk luapan yang dapat digulir. Kartu tersebut dikeluarkan dari tata letak hingga sengaja ditampilkan, sehingga area kosong selebar kartu dan bilah gulir horizontal hilang tanpa mengubah tekan lama maupun penampilan melalui tautan langsung.

## Kontrol Pustaka konsisten dan kalimat tervalidasi

Logout kini hanya mempertahankan tampilan batal berwarna merah saat diarahkan. Kartu minimal tetap menampilkan pelafalan dan definisi terlokalisasi di samping nilai utama, sedangkan judul detail dan kegagalan audio memakai ukuran relatif yang diperbaiki. Penyerapan paket konten menolak kalimat berurutan yang memuat teks tanpa dukungan entri unit leksikal atau partikel tertaut.

## Alihkan rute Study yang tidak tersedia

Rute SPA Study kini hanya ditawarkan selama setidaknya satu modul bahasa yang valid dan aktif tersedia. Permintaan langsung serta pemasangan SPA dari cache dialihkan ke `/error?code=503` ketika validasi bahasa membuat Study tidak tersedia, alih-alih merender kerangka Study yang kosong atau rusak.

## Kartu minimal selebar konten dan judul popup lebih tegas

Kisi Pustaka minimal tetap menyediakan jumlah kolom sama besar yang diminta modul, termasuk posisi kosong, sementara kartu yang terlihat kini menyusut sesuai konten beserta padding dan tetap berada di tengah setiap slot kisi yang diskalakan. Ukuran judul popup digandakan dan detail judul diperbesar tiga puluh persen.

## Detail kartu Pustaka yang terpadu

Setiap lapisan Pustaka kini menampilkan definisi melalui struktur detail judul popup bersama, menempatkan cakupan di samping judul, menggunakan kontrol tutup standar dan ikon navigasi SVG, serta menampilkan pratinjau definisi tertaut secara konsisten. Varian berarah di tepi kisi beralih ke atas agar tidak menimpa baris berikutnya atau sebelumnya.

## Komposisi lengkap dan navigasi Study yang stabil

Referensi komposisi Pustaka kini digabungkan berdasarkan peran presentasi dan mempertahankan posisi yang ditentukan, sehingga partikel tetap berada dalam komposisi lengkap yang sama alih-alih muncul di bawah judul duplikat. Pelipatan subnavigasi Study kini memakai ambang histeresis yang memperhitungkan tinggi header agar perubahan gulir akibat tata letak tidak membuka dan menutup navigasi utama secara cepat.

## Referensi Pustaka dalam satu lapisan

Skema dan paket konten Pustaka dapat secara eksplisit menghubungkan satu entri ke entri lain pada lapisan yang sama. Tautan tersebut kini secara default ditampilkan sebagai komposisi, sedangkan varian berarah dan hubungan yang secara eksplisit ditandai sebagai ejaan alternatif tetap mempertahankan perilakunya.

## Kisi Pustaka minimal yang seimbang

Kisi Pustaka minimal kini membatasi lebar keseluruhan bagan berdasarkan ukuran baris yang diminta serta menskalakan tinggi kartu, ruang dalam, dan teks utama secara proporsional. Posisi kosong eksplisit dirender sebagai sel kisi tersembunyi yang memiliki dimensi agar kana berikutnya tetap berada pada kolom yang diminta.

## Konten minimal lebih besar dengan pelafalan terpisah

Kartu Pustaka minimal kini menampilkan konten utamanya dua kali lebih besar daripada sebelumnya. Pelafalan menempati baris khusus di bawah konten yang diperbesar, sedangkan definisi terlokalisasi tetap menjadi teks pendukung yang terpisah.

## Bagan minimal selebar penuh

Bagan Pustaka minimal kini menggunakan seluruh lebar yang tersedia dengan sel sama besar tanpa celah yang mempertahankan rasio aspek dua banding satu. Kartu membesar bersama selnya, baris memakai pemisah berkesinambungan, dan posisi kosong yang diminta menampilkan tanda pisah redup alih-alih menghilang.

## Judul popup adaptif satu baris

Detail judul popup kini dirender sebagai elemen h4 saudara, bukan berada di dalam judul h2. Popup bersama mengukur seluruh baris judul setelah dirender, terlebih dahulu mengecilkan teks detail hingga lima puluh persen, lalu mengecilkan judul utama paling banyak tiga puluh persen, dan mengulangi penyesuaian setelah font dimuat serta ukuran jendela berubah agar baris tidak pernah terbungkus.

## Kartu anak Pustaka bertingkat

Relasi anak kini tidak menentukan arah. Pustaka memilih posisi aman berdasarkan ruang yang tersedia, menampilkan kartu anak pada permukaan buram yang terangkat tanpa mengaburkan isinya, dan membuka rantai anak bertingkat secara rekursif hingga empat tingkat.

## Pengguliran Pustaka alami

Konten Pustaka kini mengikuti pengguliran dokumen alami, bukan menggunakan area pandang konten bertingkat. Mengeklik kartu di luar pohon kartu anak yang terbuka akan menutup tampilan anak tersebut sebelum tindakan kartu dilanjutkan.

## Perluasan pohon anak bertahap

Mengarahkan penunjuk ke kartu anak yang sudah terbuka kini menampilkan keturunan kartu tersebut melalui mekanisme kartu berarah yang sama. Pohon bertingkat dapat dijelajahi secara bertahap melalui keempat tingkat yang didukung tanpa membuka semua cabang sekaligus.

## Commit

- [1d65413](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d65413154f89efbd91422bbfdc94bc8196e9f16)
- [656b59f](https://github.com/Cognis-Labs-HQ/Cognis/commit/656b59feef1ff344ce911a042eecae788a228cc4)
- [e183481](https://github.com/Cognis-Labs-HQ/Cognis/commit/e18348130104134eaa7962aa3020a03a22325e86)
- [ba25e44](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba25e4481d6c71a35ebe2ecc8d0143b85f0125b3)
- [ef782975](https://github.com/Cognis-Labs-HQ/Cognis/commit/ef782975)
- [68bd7478](https://github.com/Cognis-Labs-HQ/Cognis/commit/68bd7478dbf6343109087bd83a9fba643452a838)
- [eeabc5e1](https://github.com/Cognis-Labs-HQ/Cognis/commit/eeabc5e1231e3de246a14ee4ff49582a7169768c)
- [2cc37134](https://github.com/Cognis-Labs-HQ/Cognis/commit/2cc371343c54afed45e545d523a751cad101be3c)
- [ad01aa56](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad01aa561321b7db5982b0fbfe7f1b28ed11347b)
- [9fe9af00](https://github.com/Cognis-Labs-HQ/Cognis/commit/9fe9af0021f9a093ba432fca9761368e8df0e5f6)
- [51c727ea](https://github.com/Cognis-Labs-HQ/Cognis/commit/51c727eaeb923bd3d4a569ed9e924945f56e286c)
- [17756b2f](https://github.com/Cognis-Labs-HQ/Cognis/commit/17756b2fb83d82f25bf7c349f63170fc738db995)
- [86d3162c](https://github.com/Cognis-Labs-HQ/Cognis/commit/86d3162c19544032fa2ccc6d55f80de58f9495fb)
- [77611b4e](https://github.com/Cognis-Labs-HQ/Cognis/commit/77611b4ed1c6d7afa1221f966cf80ec9b1292316)
- [4ff6b5ec](https://github.com/Cognis-Labs-HQ/Cognis/commit/4ff6b5ec7825a19626c371347c04c43785971216)
- [1190320b](https://github.com/Cognis-Labs-HQ/Cognis/commit/1190320be506d0c74feefa441a4188d05d3892ae)
- [5bb5607e](https://github.com/Cognis-Labs-HQ/Cognis/commit/5bb5607ec3cd60ff7ff2d1329dd66cb4cfc907a8)
- [83297da5](https://github.com/Cognis-Labs-HQ/Cognis/commit/83297da5d62dcbaa8166af88531432b8468d721e)
- [164297bd](https://github.com/Cognis-Labs-HQ/Cognis/commit/164297bda76fa834f5a0e988260c7b2580ef4b87)
- [31da2e2f](https://github.com/Cognis-Labs-HQ/Cognis/commit/31da2e2fcd3284f1c2edd0da12a22c416c374b88)
- [13754134](https://github.com/Cognis-Labs-HQ/Cognis/commit/13754134d1595372336cea85a1d1f85bb4da2a9c)
- [f4ad7320](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4ad732066d653312f37bba8a08c61d7d37d3522)
- [753a02dc](https://github.com/Cognis-Labs-HQ/Cognis/commit/753a02dc9171670c41d02b9665e076422f3fc3b6)
- [82bb97c0](https://github.com/Cognis-Labs-HQ/Cognis/commit/82bb97c02aac759f995373a1e9c1234d69b61d57)
- [44617c98](https://github.com/Cognis-Labs-HQ/Cognis/commit/44617c980ed07d896925f99bd27dd0ca57d2d831)
- [95b3065d](https://github.com/Cognis-Labs-HQ/Cognis/commit/95b3065d2b20baf702b1b7ffb669cdd5351caf70)
- [f1ad82df](https://github.com/Cognis-Labs-HQ/Cognis/commit/f1ad82df827fe30850bf4516aa790304a985d925)
- [893aece3](https://github.com/Cognis-Labs-HQ/Cognis/commit/893aece39d60e4bd4c84f7a809c504811f630d13)
- [7387683a](https://github.com/Cognis-Labs-HQ/Cognis/commit/7387683a1faa0f8efd9d27a524f75b43eb81dbd4)
- [7f34d0c9](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f34d0c98a4b693a14f5c864bed07ace40bf79da)
- [c3a7f703](https://github.com/Cognis-Labs-HQ/Cognis/commit/c3a7f703c729ca3490a6bc16ad01ae7eebe02674)
- [84a349c7](https://github.com/Cognis-Labs-HQ/Cognis/commit/84a349c7fc4c1efb389ffd09b2ddd6654c2ecaba)
- [08110121](https://github.com/Cognis-Labs-HQ/Cognis/commit/08110121dca4e9ec80cf8d358c71e1b01212c2de)
- [7f0e9fdb](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f0e9fdb)
- [da4188fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/da4188fe99113db1a13c31e22d0703327fc7f540)
- [abfaddbf](https://github.com/Cognis-Labs-HQ/Cognis/commit/abfaddbf0bafef8e9e08812cebdba2ee4557fbaf)
- [7f007d44](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f007d4430f88b1ae7d37fb3daf346adc5f2c9b3)
- [8ce047ac](https://github.com/Cognis-Labs-HQ/Cognis/commit/8ce047ac3710628db7b52b16bc0169ab7fadd583)
- [8373c151](https://github.com/Cognis-Labs-HQ/Cognis/commit/8373c15186eb49298e4d961f11d273d06b3146ef)
- [a2da40bf](https://github.com/Cognis-Labs-HQ/Cognis/commit/a2da40bf07e7651088e6444259aa536755c14b8a)
- [1d47e019](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d47e019124ef7e2e90c05f96a46ff0d3282912e)
- [e4fa5f2a](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4fa5f2ac0669a6ec93fe00b2a926283b2ac8ab4)
- [b1e6e962](https://github.com/Cognis-Labs-HQ/Cognis/commit/b1e6e96288911f324cc48952431887ce89246ae1)
- [8a67d78e](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a67d78e78cf9a52a989ebc56fb01b8f90b49193)
- [8a4b37c5](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a4b37c5220db3e29036ba17d768910f7eb118cf)
- [e4db7639](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4db7639cb19c88fef26ebd55f23eb6e6095ab17)
- [00072b1f](https://github.com/Cognis-Labs-HQ/Cognis/commit/00072b1fcccbf14a647f48d5fb5b293f72e27332)
- [e1584351](https://github.com/Cognis-Labs-HQ/Cognis/commit/e1584351d43f0337d3aba919e5c369a50be4f69e)
- [dfbc9b22](https://github.com/Cognis-Labs-HQ/Cognis/commit/dfbc9b22569c7f426d08f075c8ac79e80fa7e165)
- [98eb5217](https://github.com/Cognis-Labs-HQ/Cognis/commit/98eb5217e93fcd9cf765f3461e78080d9e33fd74)
- [a6bb913b](https://github.com/Cognis-Labs-HQ/Cognis/commit/a6bb913bf18284dd5bd7f172994ec41fdacb78d6)
- [8ec16aee](https://github.com/Cognis-Labs-HQ/Cognis/commit/8ec16aee27bb9ba6e4d3b1461d30bb9b1003020f)
- [c7a41d2c](https://github.com/Cognis-Labs-HQ/Cognis/commit/c7a41d2c3933afa6502a7633b1f6089c816e7c8e)
- [c2b80b54](https://github.com/Cognis-Labs-HQ/Cognis/commit/c2b80b5468ee6acfcb2e525fcdbcfd6df7865f5d)
- [d07ce255](https://github.com/Cognis-Labs-HQ/Cognis/commit/d07ce255cc0f65d5402f264a21574155c11c853d)
- [92da28e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/92da28e2f01c823c14ca435c44d3f47cfebede9e)
- [0e6be2ce](https://github.com/Cognis-Labs-HQ/Cognis/commit/0e6be2ce8afb587a41cfc189aac8b4c4a6016a48)
- [be55dd47](https://github.com/Cognis-Labs-HQ/Cognis/commit/be55dd4775bda31fb70926e64af09fb322fdd50d)
- [fc3379e4](https://github.com/Cognis-Labs-HQ/Cognis/commit/fc3379e48419678433fd00b250ff6bf45bf9a578)
- [e4b572ee](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4b572ee)
- [764c109d](https://github.com/Cognis-Labs-HQ/Cognis/commit/764c109dfa6530c33bddf8d8deaafff2e2ea7f48)
- [5ab1b885](https://github.com/Cognis-Labs-HQ/Cognis/commit/5ab1b8853aaf5253230f4ab535e5c68fd6ccc0aa)
