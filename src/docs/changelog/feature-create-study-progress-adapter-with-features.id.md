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

Varian terarah kini memakai tampilan kartu Perpustakaan lengkap dengan sedikit transparansi dan bayangan mengambang. Area hover tetap terhubung ke induk sehingga pengguna dapat berpindah dan membukanya. Kotak pilihan ganda tetap tersembunyi hingga kartu yang memenuhi syarat ditekan lama, mendukung mode gelap, dan rute Perpustakaan kembali memuat gaya subnavigasi Study secara lengkap.

## Penempatan pelafalan

Kartu unit tulisan dan judul detail kini menempatkan pelafalan karakter di samping karakternya, sedangkan pelafalan kata dan kalimat tetap di bawah teks. Kata satu karakter yang bermakna dapat dideklarasikan di sisi modul melalui relasi leksikal satu karakter, dan detail karakter menampilkan kata masuk yang sesuai.

## Tautan dan tindakan terarah

Pemilihan dengan tekan lama kini membuka bilah tindakan mengambang yang ada dengan Pilih Semua, Hapus, dan tutup; klik kartu biasa keluar dari mode pemilihan. Tanda centang dipusatkan, kontrol audio gelap menekan warna jingga bawaan, dan klik relasi mengaktifkan serta menyorot kategori tujuan. Teks definisi kini memuat tautannya secara langsung, sedangkan kotak unsur dibatasi pada relasi resolver yang dideklarasikan untuk menghapus tautan Katakana yang ganda dan tidak terkait.

## Filter stabil dengan varian

Filter metadata kini hanya memproses kartu dasar Perpustakaan yang memiliki data filter terserialisasi. Varian terarah yang mengambang tidak lagi mencapai pengurai filter dengan nilai dataset tak terdefinisi sehingga galat runtime halaman Perpustakaan teratasi.

## Pelafalan dan audio netral

Pelafalan karakter di samping judul detail kini memakai teks judul sekunder yang di-escape, lebih kecil, dan berbobot normal. Permukaan audio gelap secara eksplisit menolak penggantian warna paksa dan menerapkan gaya netral pada panel serta kontrol media bawaan peramban.

## Audio bertema aplikasi dan varian andal

Pustaka kini merender kontrol audio aksesibelnya sendiri alih-alih mengandalkan tampilan media bawaan peramban, sehingga warna aksen sistem operasi dan tema paksa tidak masuk ke pemutar. Kartu karakter yang diarahkan atau difokuskan dengan papan ketik dinaikkan di atas kartu kisi di sekitarnya agar varian anak terarah tetap terlihat dan interaktif.

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
