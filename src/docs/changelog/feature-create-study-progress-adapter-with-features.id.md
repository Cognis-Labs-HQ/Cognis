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

## Penjelajahan kartu dan popup yang lebih aman

Pohon anak yang terbuka kini menggunakan klik pertama pada induk atau kartu di sebelahnya hanya untuk menutup pohon tanpa membuka detail secara tak terduga. Pratinjau kartu menggabungkan beberapa definisi dan memotongnya dengan elipsis saat ruang menyempit, sedangkan popup detail tetap menyimpan semua definisi. Detail judul popup diperbesar, dan judul entri komposisi menampilkan komponen berurutan sebagai deep link terpisah.

## Tautan judul komposisi yang lebih jelas

Item deep link di dalam judul popup tidak lagi memakai garis bawah. Status arah penunjuk dan fokus papan ketik kini menggunakan batas aksen yang lebih kuat, latar berwarna, serta lingkar fokus agar setiap komponen judul yang dapat diklik tampak jelas.

## Tautan Pustaka konsisten dan tujuan Belajar yang diingat

Tautan relasi kini secara konsisten langsung membuka detail entri tertaut, termasuk tautan invers “digunakan oleh”. Pergantian bahasa memakai kembali halaman anak Belajar yang terakhir dibuka alih-alih kembali ke hub multibahasa, dan tampilan pengaturan bahasa menghapus status aktif dari tombol bahasa.

## Tampilan anak stabil dan entri tersembunyi

Pelepasan setelah tekan lama tidak lagi menutup kartu anak sebelum dapat dijangkau, dan pembukaan popup diserialkan untuk mencegah dialog ganda. Entri konten kini dapat disembunyikan dari penjelajahan langsung sambil tetap tersedia untuk referensi dan tautan detail; menyembunyikan induk juga menyembunyikan keturunannya. Judul detail anak mencantumkan entri induknya.

## Slot kartu anak delapan arah

Kartu anak Pustaka yang ditampilkan kini dapat menempati setiap slot arah utama dan diagonal di sekitar induknya. Penempatan yang memperhatikan tepi kisi mencegah anak keluar dari konten yang terlihat ketika slot lain tersedia, sedangkan jarak tambahan pada peramban dan luapan kisi minimal yang terlihat menjaga batas kartu tidak berbenturan dengan tepi sekitarnya.

## Penempatan kartu anak yang andal

Pemuatan Pustaka tidak lagi meneruskan arah induk yang tidak tersedia ke penempatan tepi kisi. Kartu anak tingkat akar dimulai dengan daftar arah yang didukung, dan pelindung penempatan kini menolak nilai arah non-string dengan aman.

## Pohon kartu anak yang tetap berbatas

Penempatan kartu anak kini mengutamakan atas, bawah, kiri, dan kanan sebelum slot diagonal. Tingkat pertama menyediakan ruang kisi yang cukup untuk cabang terdalam jika memungkinkan, turunan melacak posisi kumulatif agar tetap berada di dalam widget Pustaka, dan membuka satu pohon kartu akan menutup setiap pohon yang sebelumnya disematkan.

## Cabang anak terfokus yang tetap terbuka

Saat penunjuk masuk ke anak bertingkat, seluruh jalur induknya kini tetap terbuka sambil menampilkan tingkat berikutnya dari anak tersebut. Cabang saudara disembunyikan sementara untuk mendapatkan kembali ruang, dan kembali ke cabang lain memperbarui jalur fokus tanpa meruntuhkan pohon ketika penunjuk melintasi celah kartu.

## Fokus anak stabil yang dapat ditelusuri balik

Kartu anak yang difokuskan kini memperoleh garis tepi animasi dengan alternatif gerakan yang dikurangi. Kembali ke induk memulihkan pilihan tingkat tersebut yang sebelumnya disembunyikan, sedangkan meninggalkan seluruh pohon induk menghapus semua status cabang dan menyembunyikan kembali setiap anak.

## Kartu Pustaka buram

Setiap kartu Pustaka kini menggunakan permukaan terang atau gelap yang sepenuhnya buram, termasuk kartu kisi ringkas, kartu anak yang ditampilkan, serta status hover, fokus, dan aktif. Label kisi di bawahnya tidak lagi terlihat menembus kartu yang saling bertumpuk.

## Pemangkasan cabang bertingkat dan petunjuk tenang

Pemangkasan cabang terfokus kini memiliki prioritas selektor yang cukup untuk mengalahkan setiap pengungkapan hover bertingkat, sehingga anak alternatif benar-benar menghilang pada setiap kedalaman. Petunjuk tekan lama disembunyikan di seluruh kisi saat pohon anak terbuka agar pesan dari kartu yang berdekatan tidak muncul di bawah cabang aktif.

## Tautan dalam induk pada konteks popup

Karakter induk di dalam konteks “Dari” pada popup anak kini menjadi tautan dalam yang dapat digunakan. Judul sekunder popup menerima fragmen tindakan yang di-escape, sehingga pengguna dapat membuka induk secara langsung tanpa menjadikan teks konteks di sekitarnya sebagai tautan.

## Judul popup yang lebih kecil

Ukuran dasar judul popup yang dapat digunakan kembali dikurangi 25 persen, sehingga judul konfirmasi dan detail yang panjang memiliki ruang jauh lebih besar sebelum memerlukan penskalaan adaptif atau elipsis, sekaligus tetap mengikuti skala tipografi pengguna.

## Status kosong, relasi, dan penghapusan yang andal

Pustaka kini hanya menampilkan satu pesan status kosong, mengabaikan tautan varian yang merujuk ke dirinya sendiri, dan secara transitif menghapus entri yang bergantung pada konten yang dihapus. Peringatan penghapusan mencantumkan semua entri terdampak dalam panel terbatas yang dapat digulir sebelum konfirmasi.

## Deteksi identitas kartu anak yang tepat

Perenderan varian kini membandingkan identitas rekaman sumber yang stabil selain ID basis data. Representasi duplikat dari kartu logis yang sama tidak lagi ditampilkan sebagai induk dan anak, sedangkan varian anak yang sebenarnya tetap tersedia.

## Popup detail stabil dan kartu Pustaka terpadu

Popup detail kini mempertahankan ruang bilah gulir saat mengunci halaman sehingga lebar Pustaka di bawahnya tidak berubah ketika dialog dibuka atau ditutup. Lapisan Pustaka juga menyatukan kartu duplikat saat label yang dinormalisasi dan seluruh hubungan definisinya sama, sekaligus mempertahankan sinonim asli serta makna banyak-ke-banyak.

## Kemajuan persisten dan modul aman

Peristiwa dan proyeksi kemajuan kini disimpan secara persisten melalui gateway DB, menolak ID peristiwa yang bertentangan, memvalidasi lingkup koreksi dan rentang waktu, menyediakan rute koreksi, serta menyembunyikan kegagalan rute internal. Modul eksternal yang dipulihkan menjalani validasi aktivasi yang sama dengan modul baru, sumber tautan simbolis tidak dapat melewati pemindaian batas, impor paket konten mengganti hubungan usang, dan penghapusan Pustaka berantai langsung memperbarui peramban.

## Validasi modul yang jelas

Modul eksternal kini dapat memakai ruang nama `/api/v1/modules/<id>` miliknya sendiri tanpa kegagalan batas positif palsu, sedangkan URL lintas modul dan internal Cognis tetap diblokir. Rute konfigurasi nonaktif yang tidak tersedia mengembalikan `module_config_unavailable`, bukan 404. Validasi Nextcloud Whiteboard kini hanya menunjukkan impor inti dan penimpaan kelas terlindungi yang benar-benar tidak kompatibel; modul harus menerbitkan pembaruan yang sesuai sebelum dapat diaktifkan dengan aman.

## Konfigurasi sebelum aktivasi

Modul nonaktif kini memuat titik masuk API yang dideklarasikan melalui konteks terbatas khusus server setelah validasi batas sumber API. Hanya rute yang secara eksplisit diizinkan saat nonaktif yang dipasang, sehingga konfigurasi Jitsi Meet dan Nextcloud Whiteboard dapat diselesaikan sebelum aktivasi tanpa mengaktifkan rute fitur, kontribusi UI, alur, atau kapabilitas. UI aktivasi juga memperlakukan kontrak konfigurasi nonaktif yang tidak tersedia sebagai jalur praaktivasi, bukan kegagalan melingkar.

## Peringatan penghapusan khusus kaskade

Konfirmasi penghapusan Pustaka kini tidak menyertakan entri yang dipilih langsung dalam peringatan kaskade. Peringatan dan daftar konten terdampak hanya muncul ketika entri terkait tambahan akan dihapus secara transitif, sedangkan kontrol pencegahan pemulihan permanen tetap tersedia untuk konten terpilih.

## Tanpa varian yang merujuk diri

Penempatan varian Pustaka kini membandingkan konten kartu stabil secara lengkap selain ID basis data dan rekaman sumber, menolak induk yang tidak tersedia, serta menyaring kembali representasi duplikat saat perenderan. Pustaka yang baru dibangun tidak lagi menampilkan kartu sebagai anaknya sendiri, sementara varian yang benar-benar berbeda tetap mempertahankan penempatan arahnya.

## Abaikan ID kisi usang

Kisi Pustaka kini menyisakan kartu kosong hanya untuk penampung tempat yang dinyatakan secara eksplisit dalam skema. ID kisi statis yang rekamannya telah dihapus tidak lagi dibuat menjadi kartu anonim, sehingga filter metadata seperti Katakana tidak menyisakan posisi Hiragana kosong yang terlihat.

## Hapus referensi diri dari rincian penggunaan

Jejak entri Pustaka kini mengabaikan relasi yang sumbernya mengarah kembali ke entri itu sendiri dan menggabungkan entri dependen berulang berdasarkan ID entri. Karena itu, popup rincian hanya menampilkan rekaman eksternal yang unik pada bagian Digunakan Oleh.

## Tautkan setiap ejaan komposit secara mendalam

Rincian kata Pustaka kini menguraikan ejaan lengkap menjadi entri unit tulisan atomik dan majemuk kanonis ketika referensi komposisi eksplisit tidak tersedia. Judul seperti 好き menautkan 好 ke karakter alternatifnya dan き ke karakternya, sedangkan pelafalan sekunder seperti すき memperoleh tautan komposisi lengkap yang sama tanpa menyajikan teks yang hanya terurai sebagian sebagai hasil resmi.

## Lengkapi cakupan data Study Progress

Kueri kemajuan kini menyelesaikan peristiwa kompensasi terhadap seluruh riwayat yang diizinkan sebelum menerapkan filter agregasi atau proyeksi, dan pembacaan luas mengabaikan peristiwa ruang kelas setelah akses dicabut. Cakupan kini memverifikasi setiap bidang peristiwa, metrik proyeksi, dimensi agregasi, rute terperinci, jendela koreksi yang tidak dapat diubah, perilaku persistensi, dan kontrak penonaktifan adaptor.

## Selesaikan administrasi kuota namespace

Gateway Berkas kini menyumbangkan bagian Administrasi untuk mengubah kuota bawaan global dan kuota bawaan setiap namespace terdaftar melalui klien UI milik gateway. Bagian ini sepenuhnya dilokalkan, dimiliki gateway, dan dicakup oleh pengujian permintaan serta pendaftaran. Berkas TODO repositori yang telah diselesaikan dihapus.

## Pulihkan pengujian penuh dan lint yang bersih

Alias TODO yang tersisa telah dihapus, pengujian dokumentasi kini memperlakukan dokumen TODO sebagai opsional, dan kontrak tata letak menu profil pakai ulang yang hilang telah dipulihkan. Modul Pustaka dan popup yang terlalu besar dipecah menjadi modul filter dan formulir konfigurasi yang terfokus, sehingga keduanya berada di bawah batas ukuran sumber tanpa mengubah API publik. Seluruh 1.999 pengujian repositori dan pipeline lint kini lulus.

## Patuhi Kebijakan Penghapusan Relasi Library

Perencanaan penghapusan Library kini mengikuti kebijakan `restrict`, `detach`, atau `cascade` pada setiap relasi skema, bukan menganggap semua referensi masuk sebagai kaskade.

## Jalankan Persistensi Progress di Dalam Flow

Adapter Progress kini menyimpan event secara permanen dan membangun ulang proyeksi pada tahap `persist` dan `project`, sehingga ekstensi berikutnya melihat status yang sudah tersimpan.

## Tutup Celah Validasi Modul

Validasi batas kini mendeteksi pemanggilan CommonJS `require()` statis dan memindai seluruh modul sebelum entrypoint API yang dinonaktifkan dimuat.

## Pertahankan Navigasi Bahasa Study yang Kanonis

Tujuan Study yang diingat hanya digunakan kembali bila bahasa tujuan benar-benar mendaftarkan halaman tersebut; jika tidak, navigasi memakai tujuan bawaan yang dideklarasikan bahasa itu.

## Evaluasi Perlindungan Infrastruktur UI Core Baru

Instruksi kontribusi AI kini mewajibkan evaluasi perlindungan secara eksplisit saat fungsi, objek hasil render, komponen, atau kelas UI core dibuat atau diperluas.

## Pulihkan label terlokalisasi Library

Browser Study Library kini mengimpor resolver label terlokalisasinya secara langsung, sehingga rute Library tidak lagi gagal saat merender tab skema dan lapisan.

## Pulihkan fungsi metadata Library

Browser Study Library kini mengimpor kedua fungsi metadata yang digunakan untuk menyusun nilai filter. Audit pengenal yang tidak terselesaikan pada tingkat sumber juga memastikan tidak ada referensi presentasi lain yang hilang selama pemisahan modul sebelumnya.

## Stabilkan pemuatan ulang Study dan perjelas detail Library

Pemuatan ulang langsung pada `/study` kini didelegasikan dengan aman dari pemuat turunan ke hub Study. Turunan varian Library ditampilkan sebagai ejaan alternatif, bukan entri “Digunakan Oleh” umum, dan bidang `localizedText` hanya merender nilai bahasa antarmuka aktif.

## Tambahkan halaman lapisan Library yang berfokus pada pelajar

Modul bahasa kini dapat mendaftarkan tujuan lapisan khusus seperti Alfabet, Kosakata, Kalimat, dan bagan karakter alternatif pada `/study/library/<schema>/<layer>`, sedangkan browser data bertab untuk seluruh lapisan dibatasi bagi administrator. Detail entri memakai fakta ringkas dan kotak bertaut dalam, serta mengelompokkan contoh kalimat di bawah bacaan leksikal yang digunakan agar beberapa bacaan dan pemetaan karakter banyak-ke-banyak tetap terpisah.

## Pisahkan anak struktural dari tautan penggunaan

Skema Pustaka kini mengaktifkan kartu anak spasial secara eksplisit dengan `child: true`; bentuk alternatif tidak lagi menjadi anak secara implisit, dan `hidden: true` mencegah rekaman khusus referensi tampil dalam bagan. Relasi masuk struktural tidak lagi muncul di bawah judul penggunaan umum, komposisi detail memakai kotak tautan mendalam tanpa label atau operator duplikat, dan overlay kartu yang dibuka dipotong pada batas bagan.

## Pertahankan tautan mendalam Pustaka dalam judul popup

Ejaan dan pelafalan entri kini hanya memakai gaya tautan judul dan judul sekunder popup; isi detail tidak lagi menggandakannya dalam wadah pelafalan atau komponen. Contoh penggunaan kini hanya muncul pada entri yang dirujuk langsung oleh rekaman berurutan, sehingga komponen atomik tidak mewarisi contoh melalui entri leksikal yang memuatnya.

## Pertahankan cabang Pustaka yang dibuka di dalam bagan

Kisi Pustaka kini menyediakan padding dalam sebesar jarak kartu agar garis tepi kartu dan fokus tetap terlihat pada setiap sisi. Penyusun pohon berarah mengukur kapasitas yang tersedia, melacak koordinat yang sudah ditempati cabang aktif, dan memilih arah yang dapat memuat turunan sebelum memakai arah terlihat terbaik yang tersisa.

## Pertahankan semua anak Pustaka bertingkat tetap terlihat

Cabang Pustaka yang dibuka tidak lagi memangkas saudara atau turunan yang lebih dalam. Mengarahkan penunjuk atau memfokuskan anak yang terlihat menampilkan seluruh tingkat berikutnya, sedangkan petunjuk tekan lama kini tetap di bagian bawah dalam kartu pemiliknya.

## Pulihkan pemangkasan cabang berfokus kursor

Pergerakan kursor kembali mempersempit pohon yang dibuka ke cabang aktif sambil mempertahankan tingkat berikutnya milik anak terpilih. Fungsi pembersihan yang hilang dipulihkan sehingga galat runtime Pustaka terselesaikan, dan TODO eksplisit mencatat rencana pemisahan tata letak pelajar dari editor administrasi berorientasi data yang persisten.

## Gunakan kembali ruang cabang terpangkas

Anak Pustaka bertingkat kini hanya mencadangkan jalur leluhur aktifnya. Anak dapat menempati slot kisi yang ditetapkan kepada cabang alternatif yang dipangkas oleh kursor, sehingga cabang terlihat memperoleh lebih banyak ruang tanpa bertabrakan dengan leluhurnya sendiri.

## Kecualikan target tersembunyi dari pohon anak

Rekaman dengan `hidden: true` tidak lagi menerima penempatan anak struktural, sehingga bentuk khusus referensi tetap tersedia melalui tautan mendalam tanpa terbuka di bawah kartu yang terlihat. Petunjuk tekan lama kembali menjadi elemen mengambang di bawah kartu yang hanya tampil saat diarahkan.

## Kecualikan bentuk alternatif dari slot anak

Relasi bentuk alternatif kini selalu menjadi tautan mendalam, bukan anak spasial, bahkan saat penyedia juga menandai relasi tersebut sebagai anak. Hanya relasi anak khusus yang bukan varian yang mengalokasikan dan membuka slot bagan, sehingga bentuk tulisan alternatif tidak memakai ruang kisi kosong.

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
- [fff72d38](https://github.com/Cognis-Labs-HQ/Cognis/commit/fff72d38bc86a30fa95db9323f05494a747b43ea)
- [26a42897](https://github.com/Cognis-Labs-HQ/Cognis/commit/26a428979ae39d94ffd502733fee6ad2306a618f)
- [9d118560](https://github.com/Cognis-Labs-HQ/Cognis/commit/9d118560c653e18847ed65945ddf363928cac172)
- [8c21c0d2](https://github.com/Cognis-Labs-HQ/Cognis/commit/8c21c0d2380f55b3b7d5c235c8f894080ea7f0fa)
- [16f02b7b](https://github.com/Cognis-Labs-HQ/Cognis/commit/16f02b7bf334a42884dc78ffc46ff7baec857722)
- [1490dd84](https://github.com/Cognis-Labs-HQ/Cognis/commit/1490dd848112eab3f7aa82465c5c5c297818b719)
- [4c928d09](https://github.com/Cognis-Labs-HQ/Cognis/commit/4c928d092a3a5dbc3589ea1dab0fbfc89bd35403)
- [d1ce3c69](https://github.com/Cognis-Labs-HQ/Cognis/commit/d1ce3c69bb04c5b061943a8e909350284d31e45d)
- [20a8c29d](https://github.com/Cognis-Labs-HQ/Cognis/commit/20a8c29d58e56c750f03f001d9aa050927135bfb)
- [1463edb3](https://github.com/Cognis-Labs-HQ/Cognis/commit/1463edb37a5708a75c1a4ce022f69b18813752ad)
- [26c14c1b](https://github.com/Cognis-Labs-HQ/Cognis/commit/26c14c1b63891f1a3115d3c69a17ae76e6f126d9)
- [e6746196](https://github.com/Cognis-Labs-HQ/Cognis/commit/e6746196dcf3aa7f1a4ae12acaf8b65db5e438f5)
- [b1c8e514](https://github.com/Cognis-Labs-HQ/Cognis/commit/b1c8e514d07ea1960ad3f47f83ff9fc0c4521a44)
- [5d0451d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/5d0451d4b3c387625ae0f37732e5ea50124ec006)
- [93a3523a](https://github.com/Cognis-Labs-HQ/Cognis/commit/93a3523ad4226f15e9c768ffcee066d21ccf8dd8)
- [bbc45581](https://github.com/Cognis-Labs-HQ/Cognis/commit/bbc45581586a7979012bc1934ab75bd7d9f5b2ad)
- [9ad5f1b](https://github.com/Cognis-Labs-HQ/Cognis/commit/9ad5f1b7b3d715d58a01e00d1e5317f8b04c5df)
- [d469f73](https://github.com/Cognis-Labs-HQ/Cognis/commit/d469f7323cb49ca8670fd22ca026bc830f9a38cf)
- [df9e46be](https://github.com/Cognis-Labs-HQ/Cognis/commit/df9e46be6f840f6fe00298e62dc179e7d5d83e06)
- [0db0f1b1](https://github.com/Cognis-Labs-HQ/Cognis/commit/0db0f1b1771af5af2f36fe618269280dfbeab96c)
- [e95559ce](https://github.com/Cognis-Labs-HQ/Cognis/commit/e95559ce6df3718d0f231f5ed8563d74b17b7b03)
- [2b3d8bdd](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b3d8bdd2d0016aacb221e26f21b79a347d2a57c)
- [fbd2c62e](https://github.com/Cognis-Labs-HQ/Cognis/commit/fbd2c62eac84d9ab568b8be7594e9ba590e68d48)
- [2b62938c](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b62938cd6e77515e161240f8de4e15b273177fd)
- [90ff0ae1](https://github.com/Cognis-Labs-HQ/Cognis/commit/90ff0ae13fb1b81ed003dc4fae6ba56e63194610)
- [a7513e45](https://github.com/Cognis-Labs-HQ/Cognis/commit/a7513e45b56ebbc8872f1798f7da4ce9e3f9b739)
- [d3d4ff25](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3d4ff25aa3b11883df67844b0204ac62d211f00)
- [3dadb7fd](https://github.com/Cognis-Labs-HQ/Cognis/commit/3dadb7fdb2f6269d735e6b8f7d0cdf8991ac5808)
- [695e05e1](https://github.com/Cognis-Labs-HQ/Cognis/commit/695e05e157a4fcf279b71f22ba98dec8420f85e1)
- [4c057009](https://github.com/Cognis-Labs-HQ/Cognis/commit/4c05700902ed81591fedc4e86e5bdd886eabd334)
- [770ca249](https://github.com/Cognis-Labs-HQ/Cognis/commit/770ca249d79ddba91f450f82c916fccd923107dd)
- [1a2fafce](https://github.com/Cognis-Labs-HQ/Cognis/commit/1a2fafceced4061dca8bbd9272274f8d4ee8877d)
- [2b29614](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b29614)
- [a7f7866](https://github.com/Cognis-Labs-HQ/Cognis/commit/a7f7866)
- [f9d2be18](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9d2be18)
- [81546618](https://github.com/Cognis-Labs-HQ/Cognis/commit/81546618)
- [a12b60f1](https://github.com/Cognis-Labs-HQ/Cognis/commit/a12b60f1)
- [79b6e2e9](https://github.com/Cognis-Labs-HQ/Cognis/commit/79b6e2e9)
- [b2becb7d](https://github.com/Cognis-Labs-HQ/Cognis/commit/b2becb7d)
- [730f448e](https://github.com/Cognis-Labs-HQ/Cognis/commit/730f448e)
- [3b863171](https://github.com/Cognis-Labs-HQ/Cognis/commit/3b863171)
- [9aa724ac](https://github.com/Cognis-Labs-HQ/Cognis/commit/9aa724ac)
- [4ad30587](https://github.com/Cognis-Labs-HQ/Cognis/commit/4ad30587)
