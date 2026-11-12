# Pemulihan Komponen

**Cabang Fitur:** feature-component-recovery

Study kini memisahkan navigasi ringkasan dari panduan bahasa interaktif. Varian bahasa yang diikuti menggantikan Explore umum dan membahas detail kartu, menggambar, serta pembuatan kartu; pembersihan cabang terlingkup dan penemuan berbasis rute mencegah panduan bertumpuk.

## Isolasi Kegagalan

Katalog peramban menentukan pemilik penyedia dan versi terpasang dari registri host. Komponen opsional yang gagal kehilangan kemampuan parsial, alur, dan pendengarnya, sementara pemilik lain tetap dimuat. Penyegaran eksplisit atau perubahan revisi memungkinkan percobaan ulang. Komponen host wajib mempertahankan perlindungan yang sudah ada. Modul eksternal selalu opsional: manifest modul tidak dapat membuat Cognis gagal tertutup atau menjadi ketergantungan wajib host.

Pengecualian server tak terduga dikaitkan dengan pemilik terdaftar. Kesalahan masukan yang diharapkan dan JSON rusak tidak dihitung. Tiga kegagalan berbeda yang diamati administrator dalam lima menit memicu penonaktifan terautentikasi biasa. Laporan dideduplikasi, dibatasi dalam memori, dan dipisahkan menurut versi terpasang; laporan pengguna biasa tidak dapat menonaktifkan komponen secara global. Penghitung diatur ulang saat server dimulai ulang atau jendela waktu berakhir. Perbaiki atau tingkatkan komponen sebelum mengaktifkannya kembali.

## Operasi Pengelolaan

`component:info`, `component:release-channel get|set|list`, `component:upgrade`, aktivasi, dan penonaktifan mendukung sasaran tunggal maupun `--all`, dengan filter jenis atau gateway adaptor. Alur `component:*` bernama menggunakan kontrak `component:management` versi satu milik API dan rute pengelolaan terautentikasi yang sudah ada. Kontrol host wajib atau terkunci serta pemeriksaan ketergantungan tetap berwenang. Mutasi terserialisasi membaca ulang status setelah memperoleh kunci. Kegagalan katalog adaptor tetap terlihat pada gateway pemilik dan sebagai kegagalan penemuan pada kelompok terkait; pengelolaan komponen sehat dan penonaktifan gateway opsional itu tetap berfungsi. Kegagalan otorisasi tetap menghentikan operasi.

## Kanal Dan Peningkatan

Cabang dan rilis marketplace menyediakan pilihan kanal. Pilihan disimpan secara atomik dalam `config/component-channels.json`. Peningkatan mempertahankan pemeriksaan otorisasi, integritas, pemasang, dan ketergantungan yang ada. Modul yang sebelumnya aktif dinonaktifkan sementara. Pemasangan gagal mencoba pemulihan tervalidasi dengan persetujuan penafian yang diberikan pemanggil; pemasangan yang tidak pasti setelah batas waktu tetap nonaktif. Peningkatan berhasil menyebut kebutuhan memulai ulang. Gateway, adaptor, dan modul inti bawaan ditingkatkan bersama host, tidak memiliki kanal mandiri, dan dilewati dalam peningkatan massal. Perubahan konfigurasi dan impor repositori tetap bersasaran tunggal.

## Identitas Runtime

Penemuan adaptor mempertahankan ID manifest kanonis untuk ketergantungan dan mencatat ID runtime terpisah untuk kepemilikan penyedia. Penyedia Social profile, messages, dan call mempertahankan versi terpasang dan status opsional walaupun ID manifestnya memakai awalan `social-`.

## Keluaran Dan Progres CLI

Semua perintah CLI menampilkan keluaran manusia yang ringkas secara bawaan. Daftar menampilkan paling banyak dua puluh entri; kolom besar dan muatan bertingkat diringkas. Hasil siklus hidup menyebut setiap sasaran, keberhasilan, pelewatan atau kegagalan, versi terpasang, dan kebutuhan memulai ulang. Hasil kosong dinyatakan dengan jelas. Gunakan `-v` atau `--verbose` sebelum atau sesudah nama perintah untuk respons lengkap, termasuk perintah gateway, adaptor, dan modul terdaftar. Tempatkan `--` sebelum argumen literal yang sama dengan opsi global.

`-v` kini berarti keluaran terperinci; gunakan `--version` untuk versi CLI. Skrip membaca respons terstruktur dari stdout. Progres ditulis ke stderr, dimulai saat perintah dijalankan, dan menampilkan waktu berlalu untuk operasi panjang. Peningkatan modul juga mengalirkan status nyata pemilihan, penonaktifan sementara, pemasangan, penantian, pemulihan, dan hasil. Persentase unduhan tidak dikarang. Server lama yang hanya mengembalikan JSON tetap mendukung tampilan waktu berlalu. Aliran terputus menghasilkan kesalahan dan saran memeriksa status komponen sebelum mencoba lagi. Kegagalan kelompok tetap menghasilkan kode keluar bukan nol dalam kedua mode keluaran.

```sh
cognisctl component:upgrade module study-language-en
cognisctl component:upgrade module --all -v
cognisctl -v component:info module study-language-en
cognisctl --version
```

## Status Yang Tidak Berubah

Pesan menggunakan kapitalisasi kalimat dan mempertahankan ID komponen. Aktivasi dan penonaktifan melewati sasaran yang sudah sesuai. Sebelum menonaktifkan atau memasang, peningkatan membandingkan commit terpasang dengan commit cabang atau rilis katalog terpilih; nomor versi yang sama belum tentu berarti kode yang sama. Kanal terpasang dipertahankan jika tidak ada pilihan eksplisit. Segarkan katalog marketplace untuk menemukan revisi sumber baru. Informasi revisi yang hilang memerlukan `--force`, bukan pemasangan ulang tanpa pemeriksaan. `--force` mengulangi aktivasi, penonaktifan, atau peningkatan, termasuk bersama `--all`, tanpa melewati pemeriksaan otorisasi, integritas, ketergantungan, dan perlindungan host wajib.

```sh
cognisctl component:upgrade module analytics --force
cognisctl component:disable module analytics --force
```

## Kontrol Dan Teks Tutorial

Menyertakan penyempurnaan Dasbor 18 langkah: latihan klik membuka panel notifikasi dan menu akun, sementara hover dan tindakan lain tetap dibatasi. Panduan menjelaskan dok tindakan halaman, bahasa, tampilan, dan tata letak. Kepemilikan permukaan berdasarkan elemen hanya menutup panel yang cocok saat grup berakhir; kontrol yang tidak tersedia mengikuti aturan lewati pada kunjungan pertama. Katalog memiliki 55 panduan dan 175 langkah, termasuk 22 panduan administrator.

## Pemulihan dan sorotan tutorial

Mulai Ulang Tutorial tetap menjadi tindakan pemulihan; tombol Coba Lagi tidak lagi ditampilkan. Langkah pengantar menyoroti bagian yang dirujuk, termasuk daftar rapat Jitsi kosong dan Cari Peserta. Penyedia pembelajaran memakai target bahasa Study dan ruang kerja publik yang terdaftar. `highlightNext` tetap aktif untuk penjelasan dan nonaktif untuk langkah berbasis peristiwa.

## Antrean menu mengambang

Menu mengambang memakai kapabilitas `ui:floatingMenus` versi 1 dan alur bertahap `ui:floatingMenu:request`, `present`, `dismiss`, serta `release`. Prioritas sama mengikuti urutan permintaan; prioritas lebih tinggi menangguhkan menu di bawahnya. Reservasi menyediakan `ready` untuk izin pertama atau pembatalan, `present(element, { visible })`, `dismiss(element)`, dan `dispose()`. Tutorial menahan prioritas 100 sampai selesai, dibatalkan, atau pemilik dilepas, termasuk di antara langkah. Slot komposer dan pemilih pemutaran ulang memakai antrean yang sama. Permintaan batal dan tampilan lama tidak dapat menggantikan menu baru; slot kosong mengalah, dan pelepasan halaman membersihkan observer serta reservasi.

## Isyarat Berikutnya hanya dengan animasi

Isyarat Berikutnya/Selesai hanya memakai animasi berdenyut tanpa garis tepi permanen. Pengurangan gerakan menonaktifkan animasi; fokus papan ketik normal tetap terlihat.

## Target tutorial yang tepat

Balon penjelasan tetap memakai kontrol dok yang terlihat di bawah ruang menu sebagai jangkar dan menghindari menu tindakan yang sebenarnya. Langkah pemutaran ulang menyoroti tombol ? itu sendiri. Tombol mempertahankan warna teks tema selama tutorial; pemutaran ulang tidak mengganti panduan yang aktif.

## Penyelesaian bertahan setelah pembaruan

Penyelesaian terikat pada akun dan ID pemilik/tutorial yang stabil. Pembaruan isi dan paket tidak pernah mengatur ulang penyelesaian. Tutorial yang selesai hanya diulang melalui kontrol ? di judul halaman. Pertahankan ID saat merevisi panduan; penyelesaian tetap disimpan di penyimpanan peramban akun.

Toast pemulihan komponen memakai nama tampilan manifest yang otoritatif dan katalog terjemahan komponen bila tersedia. Nama disisipkan sebagai teks utuh. Metadata pemilik penyedia memiliki kolom opsional `name` dan `stringsBaseUrl`. Toast kegagalan operasional dan penonaktifan setelah kegagalan berulang memakai `minRole: "admin"`, sehingga hanya administrator dan pemilik yang melihatnya; notifikasi biasa tetap memakai audiens normal. Stack juga mencakup jalur tutorial bersyarat, kemajuan sesuai peran, mulai ulang, geometri dok aktual, dan prioritas tindakan banner.

Stack tutorial memperbaiki sorotan input pencarian di atas header, melanjutkan setelah klik pil filter mana pun, dan memberi isyarat lembut pada Berikutnya/Selesai untuk langkah manual dengan dukungan pengurangan gerakan.

Stack tutorial kini memakai boolean opsional `highlightNext` per langkah dengan nilai bawaan false. Penjelasan yang ada mengaktifkannya, sedangkan latihan otomatis menonaktifkannya. Panduan kontribusi host dan modul mewajibkan cakupan tutorial yang berfokus pada pengguna dan peninjauan setiap kali fitur antarmuka berubah.

Stack tutorial kini mengarahkan Kembali ke awal grup atau cabang dependensi yang selesai. Sorotan tindakan dapat memilih kecocokan pertama yang terlihat dan dapat digunakan dalam bagian yang ditetapkan jika diminta secara eksplisit; pencocokan unik tetap menjadi bawaan. Komponen menyoroti sakelar daya yang dapat diubah dan melewati langkah jika tidak tersedia. Tinjauan konten memperjelas 34 target di host dan modul pendamping.

## Tindakan keluar pemutaran ulang

Pemutaran ulang memakai Lewati sebagai satu-satunya tombol keluar. Tombol Batal yang berlebihan dihapus.

## Panduan Pengaturan Terisolasi

Langkah fon memakai teks milik Pengaturan dari katalog host. Terjemahan Kelas opsional tidak lagi diperlukan untuk mendaftarkan panduan Pengaturan. Cakupan panduan komponen berada di dokumentasi pemiliknya.

## Indentasi Katalog Konsisten

XML bahasa yang diubah PR tutorial memakai dua spasi untuk entri string. Nilai terjemahan dipertahankan; teks langkah fon dipindahkan dari Kelas ke Pengaturan dalam keempat bahasa.

## Kesiapan Saat Riwayat Dokumen

Mundur dan Maju di dalam Dokumentasi atau Riwayat Perubahan mempertahankan kesiapan halaman terpasang. Penggantian rute yang dilakukan dan pembatalan masa hidup halaman tetap membatalkannya; riwayat dokumen internal tidak mengulang pemeriksaan awal.

## Tindakan menu tutorial

Mulai Ulang Tutorial disembunyikan pada langkah terlihat pertama. Pemutaran ulang menyembunyikan Lewati pada langkah terlihat terakhir dan menyediakan Selesai. Panduan satu langkah tidak memiliki Mulai Ulang Tutorial atau Lewati. Dokumen cakupan gabungan yang berlebihan dihapus; cakupan fitur tetap bersama komponen pemiliknya.

## Hapus Fixture Demo Peramban

Demo peramban mandiri untuk tutorial, riwayat perubahan, dan pemulihan dihapus. Helper bersama untuk pengujian otomatis tetap dipertahankan.

## Kelola dek terpilih

Panduan pengelolaan memakai wadah dek terpilih sebagai batas, termasuk kontrol edit, berbagi, dan ekspor. Panduan tetap tidak tersedia dalam daftar dek.

## Perataan pemutaran ulang

Tombol ? sejajar dengan judul halaman. Tombol tidak memiliki tooltip saat diarahkan dan tetap memakai label aksesibel yang dilokalkan.

## Tombol pemutaran ulang sejajar

Tombol ? sejajar dengan judul halaman. Tombol tidak memiliki tooltip saat diarahkan dan tetap memakai label aksesibel yang dilokalkan.

## Perbaiki kontrol pemutaran ulang

Kontrol pemutaran ulang berupa ikon ringkas tanpa bingkai terlihat dengan jarak jelas dari judul halaman. Kontrol tidak memperbesar baris judul, mempertahankan warna teks tema, serta menampilkan umpan balik hover halus dan fokus papan ketik yang terlihat. Tooltip tetap tidak ditampilkan.

## Batas marketplace lengkap

Panduan marketplace mencakup bilah alat, kartu, pengaturan sumber, dan tindakan detail modul sambil mempertahankan kondisi daftar/detail.

## Pulihkan penyajian terputus

Target yang hilang saat perenderan asinkron dicari ulang sebelum kesiapan diterbitkan. Penyajian yang dimulai ulang atau dibatalkan tidak dapat melanjutkan pemulihan lama atau menahan menu mengambang.

## Kondisi visibilitas terpisah

`scope` membatasi target dan penemuan. `visibleWhen` opsional memerlukan satu elemen terlihat tanpa membatasi target ke turunannya; target tetap berada dalam akar komponen. Administrasi Pustaka memakainya untuk visibilitas browser sambil menyoroti pencarian di bilah samping. Selektor tidak valid menggagalkan registrasi dan membersihkan pemilik.

## Panduan halaman terarah

Panduan mengikuti urutan UI terlihat dan memakai kontrol nyata yang berbeda. Pengaturan menghilangkan penjelasan tindakan perubahan yang tidak tersedia. Profil, Pengguna, Dokumen, Kalender, dan Study memakai target bermakna, termasuk kalender kosong, menu samping dokumen, dan detail kartu.

## SPA dan pemulihan target

Pemblokir kesiapan berbagi kepemilikan yang aman saat diganti antara impor bundel dan langsung. Masa hidup halaman melepas kontribusi lama. Gulir atau perubahan tata letak tidak diam-diam melewati target yang sudah ditampilkan. Satu panduan otomatis berjalan per tampilan; panduan tambahan dapat dipilih melalui ?.

## Aturan penulisan tutorial

Petunjuk dan keempat dokumen tutorial host mencakup penemuan tampilan aktif, kartu stabil, cabang dialog eksplisit, kondisi opsional dan kosong, urutan UI, pembersihan, serta verifikasi sumber dan produksi. Menu akun ditutup sebelum tutorial dimulai.

## Cabang detail asinkron

Cabang detail dan pengelolaan kelas menunggu tampilan yang dibuka. Hitungan tahap opsional diperbarui setelah penyiapan, sehingga aksi menulis yang tidak ada dikeluarkan sebelum kontrol langkah berikut ditampilkan. Dialog lain menginterupsi panduan meskipun ditumpuk di atas dialog detail yang diizinkan. Hanya portal dialog aktif yang menyediakan target; overlay yang ditutup tidak dapat menjadi cabang baru atau aksi menulisnya. Kondisi opsional memakai hasil targetAvailable publik dengan otorisasi pemilik, bukan markup modal bersama.

## Posisi Aksi Mulai Ulang

Mulai Ulang Tutorial menjadi aksi pertama pada menu mengambang dan memakai gaya btn-cancel. Aksi ini tetap tersembunyi pada langkah terlihat pertama.

## Panduan Terarah

Panduan menyorot seluruh elemen peserta rapat dan bagian peserta tersedia, membedakan posting profil dan aksi sosial yang ringkas, menghapus penjelasan pesan berulang, serta menangani berbagi kosong. Panduan modul bahasa memerlukan pendaftaran eksplisit dan dimulai dengan aktivitas. Administrasi komponen menyediakan cabang detail dan pengaturan bersyarat; kontrol opsional yang tidak tersedia dihilangkan. Pilihan panduan memakai animasi berdenyut bersama, dan isi menjelaskan aksi serta hasil yang berguna.

## Contoh Stabil Dan Chat Kosong

Langkah kartu terkait memakai wadah targetScope yang stabil: kontrol favorit dan detail kartu harus merujuk contoh yang sama setelah pengurutan berubah. targetScope adalah selektor CSS milik halaman yang digunakan bersama dan tidak boleh digabung dengan portal. Periksa warna animasi terhitung untuk pilihan panduan di luar lapisan panduan aktif; Batal tetap tanpa animasi. Contoh konfigurasi harus memiliki bidang skema yang dapat diedit; endpoint saja tidak membuktikannya. Hilangkan pengelolaan ruang jika belum ada percakapan dan tempatkan aksi sosial profil sebelum langkah posting yang berurutan.

## Ulang Dan Kepemilikan Pengaturan

Target contoh dan lingkup kartu bersama direset pada setiap sesi ulang baru, sementara Kembali dan Mulai Ulang mempertahankan contoh sesi saat ini. Uji pemutaran ulang setelah menyembunyikan kartu lama tanpa melepasnya dari DOM. Jangan mengganti kontrol dalam menu antre dengan label terdekat; hilangkan langkah saat kontrol aslinya tidak dapat ditampilkan. Editor adaptor yang dibuka melalui API popup terinjeksi berbagi target konten dan masa aktif milik host, termasuk editor khusus dan formulir multihalaman. Pertahankan callback onOpen dan perlindungan perubahan; dialog konfirmasi bersarang tetap memiliki identitas modal sendiri.

## Kepemilikan Dan Pemulihan

Kepemilikan penyedia browser dicatat dari lingkup bootstrap yang mendaftarkannya sebelum URL ditulis ulang. Alias direktori statis tidak menentukan identitas komponen. Adaptor host yang wajib atau terkunci tetap dilindungi; modul eksternal tetap opsional. Direktori adaptor yang dikonfigurasi mengidentifikasi manifes tanpa bidang gateway. Adaptor dalam folder bernama berbeda mendeklarasikan gateway logisnya di manifes. Ketersediaan yang terhalang dependensi dilaporkan tidak aktif, bukan dinonaktifkan secara eksplisit, sehingga permintaan penonaktifan tetap mencapai pemiliknya. Rute JSON berbasis objek menerima objek, menolak null, array, dan nilai primitif sebagai kesalahan klien, serta mengklasifikasikan masukan terlalu besar sebagai kesalahan klien sebelum atribusi pemulihan. Endpoint dengan muatan array memilih `shape: "array"` secara eksplisit, termasuk preferensi notifikasi.

## Pembukaan Tutorial Tertunda

Pembukaan kartu terikat pada cabang tutorial sebelum klik. Mulai ulang dan selesai membatalkan tampilan detail tertunda, termasuk penyusunan asinkron dan persiapan popup. Percobaan baru dapat dimulai segera, dan penyelesaian lama tidak dapat melepaskan kunci percobaan baru. Pembukaan kartu biasa mempertahankan masa hidup halaman.

## Kontrol Pengelolaan Adaptor

Katalog adaptor khusus administrator di `GET /api/v1/gateways/tfa/adapters` menyediakan endpoint `config`, `enable`, dan `disable` untuk setiap metode. Perintah siklus hidup komponen menggunakan kontrol yang dipublikasikan ini untuk operasi tunggal maupun massal, tanpa menebak rute. Gateway memeriksa hak administrator pada katalog dan setiap kontrol. Metode tidak menawarkan tindakan uji karena gateway ini tidak mengimplementasikannya.

## Pemulihan Terjemahan Katalog

Endpoint terjemahan katalog yang diautentikasi menyajikan bahasa yang diminta dari cache jika tersedia, lalu menggunakan bahasa Inggris dalam cache jika bahasa tersebut tidak tersedia. Respons menyatakan bahasa yang disajikan melalui `Content-Language`; modul yang tidak dikenal dan modul tanpa bundel yang dapat digunakan tetap mengembalikan 404. Penyegaran manual memindai seluruh sumber yang dikonfigurasi di server sebelum menyiapkan terjemahan katalog, sehingga bundel cache yang rusak atau daftar sumber yang belum dimuat tidak menghalangi pemindaian pemulihan. Jika persiapan gagal, katalog terakhir tetap tersedia dan tombol penyegaran dapat digunakan kembali.

## Penyelesaian Tutorial Per Akun

Penyelesaian tutorial disimpan dalam basis data aplikasi untuk akun yang diautentikasi dan ID pemilik/tutorial yang stabil. Penyelesaian mengikuti akun di berbagai browser dan perangkat, tetap tersimpan setelah data browser dihapus, serta tidak diatur ulang oleh pembaruan tutorial atau pengaturan preferensi. Hanya tombol ? pada judul halaman yang mengulang panduan yang selesai. `GET /api/v1/tutorials/completions` membaca ID penyelesaian pemanggil; `POST` mencatat hingga 100 ID tervalidasi secara idempoten melalui alur bernama dan transaksi basis data. Identitas akun berasal dari autentikasi, bukan isi permintaan. Catatan browser lama dimigrasikan setelah masuk dan baru dihapus setelah basis data mengonfirmasi penyimpanan. Kegagalan membaca menunda tutorial otomatis; kegagalan menulis menampilkan kesalahan dan dapat dicoba kembali. Sesi menunggu penyimpanan sebelum mengonfirmasi penyelesaian.

## Aturan Namespace Terjemahan

Kunci pelokalan menggunakan kata huruf kecil yang hanya dipisahkan titik, termasuk namespace modul dan kunci tutorial. Untuk ID tetap `terms-of-service`, gunakan `module.terms.of.service.admin.title`. Metadata manifes, katalog, dan referensi memakai namespace yang sama; ID modul, UUID, nama kapabilitas, dan ID pemilik/penyelesaian tutorial mempertahankan identitasnya. Jangan melonggarkan validasi namespace untuk menerima kunci yang tidak valid. Ikuti indentasi entri XML di sekitarnya dan pertahankan nilai terjemahan saat memformat.

## Commit

- [27dbfaaac](https://github.com/Cognis-Labs-HQ/Cognis/commit/27dbfaaac48ada61ec79bcfb61bc7b630103a2f1) — Isolasi kegagalan komponen dan tambahkan perintah siklus hidup.
- [29290416b](https://github.com/Cognis-Labs-HQ/Cognis/commit/29290416bcdb5709d9074fee5c43a7c653eccc6d) — Tambahkan keluaran CLI ringkas, mode terperinci, dan progres peningkatan.
- [5f5201043](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f5201043c021b8587a959533c0b8cc10b0ee05a) — Perbaiki temuan tinjauan dan pertahankan modul eksternal opsional.
- [833155c20](https://github.com/Cognis-Labs-HQ/Cognis/commit/833155c20f324a22737d834a8e73aa264ee4b3e5) — Lewati tindakan komponen berulang kecuali dipaksa dan seragamkan kapitalisasi CLI.
- [b4409b89c](https://github.com/Cognis-Labs-HQ/Cognis/commit/b4409b89c29fec24ba2e5246f216e3d1e6f9de9a) — Sinkronkan tampilan viewport tutorial dan versi host.
- [66080c8dd](https://github.com/Cognis-Labs-HQ/Cognis/commit/66080c8dd041974b6a2f9cf0c9aa7d6a49cc27bb) — Sinkronkan kesiapan popup awal dari cabang tutorial.
- [acbbf4781](https://github.com/Cognis-Labs-HQ/Cognis/commit/acbbf4781c42eeca29623be59bd3d4f951e62706)
- [fe0e6366e](https://github.com/Cognis-Labs-HQ/Cognis/commit/fe0e6366ee681f493f018a06c8f65cd9a0360b0a)
- [41ad3cfb8](https://github.com/Cognis-Labs-HQ/Cognis/commit/41ad3cfb81333d5ba6970b696d679689a07e987e)
- [7e36ab051](https://github.com/Cognis-Labs-HQ/Cognis/commit/7e36ab0513a43eb2cd62483ca7d2b461fd9989a7)
- [cd556b79d](https://github.com/Cognis-Labs-HQ/Cognis/commit/cd556b79daded5f84a1df77b32cfdb7a98e4f60a)
- [72f2c6d69](https://github.com/Cognis-Labs-HQ/Cognis/commit/72f2c6d69731a5b4ae4ebe911917af2becc52ac1)
- [09b9c7547](https://github.com/Cognis-Labs-HQ/Cognis/commit/09b9c7547)
- [2b00ca977](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b00ca9777b0c50e528698221a25341a740390f7)
- [b55cabbc0](https://github.com/Cognis-Labs-HQ/Cognis/commit/b55cabbc0af004f4a0fe80310684a0ebb90bf4ee)
- [7ca378e73](https://github.com/Cognis-Labs-HQ/Cognis/commit/7ca378e7344f489fd43fd081eb6ffbf69160c471)
- [69982a176](https://github.com/Cognis-Labs-HQ/Cognis/commit/69982a1763e33a63ed0418046e82ba43846ad33a)
- [94ba80e35](https://github.com/Cognis-Labs-HQ/Cognis/commit/94ba80e357759320f4389e0fe20ec05afa1d0cfc)
- [fafd56ed4](https://github.com/Cognis-Labs-HQ/Cognis/commit/fafd56ed47d5594683481f6a1e13a2aa3c151d2f)
- [155ea17b1](https://github.com/Cognis-Labs-HQ/Cognis/commit/155ea17b1e84273dbbd1008e56bfbfa399ec39b7)
- [dbaffe178](https://github.com/Cognis-Labs-HQ/Cognis/commit/dbaffe178706498350ad91d63ee22e0221372ae9)
- [32840e91c](https://github.com/Cognis-Labs-HQ/Cognis/commit/32840e91c76709022a9db065a851a9f837678762)
- [46dab0ac3](https://github.com/Cognis-Labs-HQ/Cognis/commit/46dab0ac3c37d0167f700ebd98de72eed034a476)
- [221dec1da](https://github.com/Cognis-Labs-HQ/Cognis/commit/221dec1da771d5d83f0112dd1d07da331c28de66)
- [e47034c9e](https://github.com/Cognis-Labs-HQ/Cognis/commit/e47034c9e2138b1e34f6f1309143c5637b3afd01)
- [81d180198](https://github.com/Cognis-Labs-HQ/Cognis/commit/81d1801989dd2922ef7a182040f362883dd8a42c)
- [3588b9fd4](https://github.com/Cognis-Labs-HQ/Cognis/commit/3588b9fd46785f3f83570719a2b707231e1c968c)
- [fcde545ea](https://github.com/Cognis-Labs-HQ/Cognis/commit/fcde545ead9ae19b52580154f718fa5893a58505)
- [f744ed1ff](https://github.com/Cognis-Labs-HQ/Cognis/commit/f744ed1ff133e702d17b99a55c2292ea831bc0b7)
- [e14d74fd2](https://github.com/Cognis-Labs-HQ/Cognis/commit/e14d74fd26a17fb36908456580b49a0daa6009f1)
- [34757d5ec](https://github.com/Cognis-Labs-HQ/Cognis/commit/34757d5ec0826abe7918af96c87e23f9eee05e60)
- [c7c2c2c5b](https://github.com/Cognis-Labs-HQ/Cognis/commit/c7c2c2c5b10e72244f2ae42793099c6927dc33bb)
- [5ecd84ae3](https://github.com/Cognis-Labs-HQ/Cognis/commit/5ecd84ae3e2b2d83a2456b2994c82ef44b0335e1)
- [bbbd1a5fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/bbbd1a5fa3ea2cc9ee5b99af2e8f200388ecbaee)
- [2879b39c5](https://github.com/Cognis-Labs-HQ/Cognis/commit/2879b39c53d42bbff0809997ce87ecff17e0e0c4)
- [d500bcfc7](https://github.com/Cognis-Labs-HQ/Cognis/commit/d500bcfc7f8b64f06088bf59b05e9c2c30e33c9b)
- [980e2990e](https://github.com/Cognis-Labs-HQ/Cognis/commit/980e2990e0501a8a49c4cfed32f15a65ba5c6c4b)
- [1055336d9](https://github.com/Cognis-Labs-HQ/Cognis/commit/1055336d97d57138a9668b022756d0700bffc7e9)
- [3f0b55744](https://github.com/Cognis-Labs-HQ/Cognis/commit/3f0b55744f35e6595024790c23916de4308757dc)
- [2a16b8206](https://github.com/Cognis-Labs-HQ/Cognis/commit/2a16b820668bf7e7df6b8076b95fd655394ad27d)
- [c39f46dac](https://github.com/Cognis-Labs-HQ/Cognis/commit/c39f46dac94426e706b10877115e66eae43248f2)
- [6dd3f0702](https://github.com/Cognis-Labs-HQ/Cognis/commit/6dd3f07026b7f0fb51ecf3ef2787229a2083b00e)
