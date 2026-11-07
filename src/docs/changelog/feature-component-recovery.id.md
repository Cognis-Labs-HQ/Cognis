# Pemulihan Komponen

**Cabang Fitur:** feature-component-recovery

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

Toast pemulihan komponen memakai nama tampilan manifest yang otoritatif dan katalog terjemahan komponen bila tersedia. Nama disisipkan sebagai teks utuh. Metadata pemilik penyedia memiliki kolom opsional `name` dan `stringsBaseUrl`. Toast kegagalan operasional dan penonaktifan setelah kegagalan berulang memakai `minRole: "admin"`, sehingga hanya administrator dan pemilik yang melihatnya; notifikasi biasa tetap memakai audiens normal. Stack juga mencakup jalur tutorial bersyarat, kemajuan sesuai peran, mulai ulang, geometri dok aktual, dan prioritas tindakan banner.

- [72f2c6d69](https://github.com/Cognis-Labs-HQ/Cognis/commit/72f2c6d69731a5b4ae4ebe911917af2becc52ac1)

Stack tutorial memperbaiki sorotan input pencarian di atas header, melanjutkan setelah klik pil filter mana pun, dan memberi isyarat lembut pada Berikutnya/Selesai untuk langkah manual dengan dukungan pengurangan gerakan.

- [09b9c7547](https://github.com/Cognis-Labs-HQ/Cognis/commit/09b9c7547)

Stack tutorial kini memakai boolean opsional `highlightNext` per langkah dengan nilai bawaan false. Penjelasan yang ada mengaktifkannya, sedangkan latihan otomatis menonaktifkannya. Panduan kontribusi host dan modul mewajibkan cakupan tutorial yang berfokus pada pengguna dan peninjauan setiap kali fitur antarmuka berubah.

- [2b00ca977](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b00ca9777b0c50e528698221a25341a740390f7)

Stack tutorial kini mengarahkan Kembali ke awal grup atau cabang dependensi yang selesai. Sorotan tindakan dapat memilih kecocokan pertama yang terlihat dan dapat digunakan dalam bagian yang ditetapkan jika diminta secara eksplisit; pencocokan unik tetap menjadi bawaan. Komponen menyoroti sakelar daya yang dapat diubah dan melewati langkah jika tidak tersedia. Tinjauan konten memperjelas 34 target di host dan modul pendamping.

- [b55cabbc0](https://github.com/Cognis-Labs-HQ/Cognis/commit/b55cabbc0af004f4a0fe80310684a0ebb90bf4ee)
- [7ca378e73](https://github.com/Cognis-Labs-HQ/Cognis/commit/7ca378e7344f489fd43fd081eb6ffbf69160c471)
- [69982a176](https://github.com/Cognis-Labs-HQ/Cognis/commit/69982a1763e33a63ed0418046e82ba43846ad33a)

## Tindakan keluar pemutaran ulang

Pemutaran ulang memakai Lewati sebagai satu-satunya tombol keluar. Tombol Batal yang berlebihan dihapus.

- [94ba80e35](https://github.com/Cognis-Labs-HQ/Cognis/commit/94ba80e357759320f4389e0fe20ec05afa1d0cfc)

## Panduan Pengaturan Terisolasi

Langkah fon memakai teks milik Pengaturan dari katalog host. Terjemahan Kelas opsional tidak lagi diperlukan untuk mendaftarkan panduan Pengaturan. Cakupan panduan komponen berada di dokumentasi pemiliknya.

## Indentasi Katalog Konsisten

XML bahasa yang diubah PR tutorial memakai dua spasi untuk entri string. Nilai terjemahan dipertahankan; teks langkah fon dipindahkan dari Kelas ke Pengaturan dalam keempat bahasa.

## Kesiapan Saat Riwayat Dokumen

Mundur dan Maju di dalam Dokumentasi atau Riwayat Perubahan mempertahankan kesiapan halaman terpasang. Penggantian rute yang dilakukan dan pembatalan masa hidup halaman tetap membatalkannya; riwayat dokumen internal tidak mengulang pemeriksaan awal.

- [fafd56ed4](https://github.com/Cognis-Labs-HQ/Cognis/commit/fafd56ed47d5594683481f6a1e13a2aa3c151d2f)

## Tindakan menu tutorial

Mulai Ulang Tutorial disembunyikan pada langkah terlihat pertama. Pemutaran ulang menyembunyikan Lewati pada langkah terlihat terakhir dan menyediakan Selesai. Panduan satu langkah tidak memiliki Mulai Ulang Tutorial atau Lewati. Dokumen cakupan gabungan yang berlebihan dihapus; cakupan fitur tetap bersama komponen pemiliknya.

- [155ea17b1](https://github.com/Cognis-Labs-HQ/Cognis/commit/155ea17b1e84273dbbd1008e56bfbfa399ec39b7)

## Hapus Fixture Demo Peramban

Demo peramban mandiri untuk tutorial, riwayat perubahan, dan pemulihan dihapus. Helper bersama untuk pengujian otomatis tetap dipertahankan.

- [dbaffe178](https://github.com/Cognis-Labs-HQ/Cognis/commit/dbaffe178706498350ad91d63ee22e0221372ae9)

## Kelola dek terpilih

Panduan pengelolaan memakai wadah dek terpilih sebagai batas, termasuk kontrol edit, berbagi, dan ekspor. Panduan tetap tidak tersedia dalam daftar dek.

## Perataan pemutaran ulang

Tombol ? sejajar dengan judul halaman. Tombol tidak memiliki tooltip saat diarahkan dan tetap memakai label aksesibel yang dilokalkan.

- [32840e91c](https://github.com/Cognis-Labs-HQ/Cognis/commit/32840e91c76709022a9db065a851a9f837678762)

## Tombol pemutaran ulang sejajar

Tombol ? sejajar dengan judul halaman. Tombol tidak memiliki tooltip saat diarahkan dan tetap memakai label aksesibel yang dilokalkan.
