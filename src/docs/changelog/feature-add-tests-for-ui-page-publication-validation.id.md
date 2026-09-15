# Wajibkan Penggunaan Ulang UI

**Cabang Fitur:** feature-add-tests-for-ui-page-publication-validation

## Lindungi penyusunan halaman

Cakupan arsitektur otomatis kini menolak halaman inti dan modul eksternal terpasang yang menerbitkan fungsi pemasangan tanpa menggunakan penyusun halaman Cognis.

## Lindungi utilitas pakai ulang

Modul peramban eksternal tidak dapat lagi mendeklarasikan ulang fungsi yang sudah ditawarkan oleh permukaan pakai ulang UI Cognis, dan perenderan langsung ke akar pemasangan dilaporkan bersama penggunaan penyusun yang hilang.

## Lindungi penyusunan formulir

Kode peramban inti dan modul eksternal wajib memakai pembangun formulir Cognis setiap kali menerbitkan formulir atau menangani pengiriman. Pembangun kini mendukung konten kompleks tepercaya dan atribut formulir tervalidasi agar formulir khusus tetap memakai pembungkus bersama.

## Terbitkan halaman modul anonim

Modul aktif kini dapat mendaftarkan rute SPA publik secara tegas untuk konten seperti ketentuan layanan. Klien anonim hanya menerima deskriptor rute publik, sedangkan rute terautentikasi tetap terlindungi dan rute publik tidak dapat menggabungkan akses anonim dengan pembatasan peran.

## Pulihkan cakupan pengujian penuh

Pembangun formulir konfirmasi kata sandi kini disuntikkan oleh integrasi perambannya agar pengujian gateway berbasis Node dapat menjalankan pelindung yang netral terhadap penyedia. Cakupan tata letak masuk kini memeriksa penempatan formulir tersusun, bukan urutan deklarasi sumber.

## Tambahkan tautan dokumen autentikasi

Halaman masuk dan pendaftaran kini menampilkan bilah tautan bersama di bagian bawah. Modul aktif mendaftarkan kontributor peramban footer autentikasi melalui `ctx`; kontributor menerbitkan tautan dokumen melalui kemampuan tautan footer netral yang sudah ada. Validasi publikasi kini menolak placeholder penyusun dalam komentar, penulisan langsung ke akar pemasangan meskipun ada penyusun, serta jalan pintas eksternal untuk permintaan API, stempel waktu, dialog umpan balik, dan pemuatan skrip.

## Tampilkan dependensi saat aktivasi

Kartu marketplace tidak lagi menandai modul hanya karena modul lain yang terpasang atau tersedia mendeklarasikannya sebagai dependensi. Dependensi wajib dan opsional hanya ditampilkan saat modul peminta sedang diaktifkan, ketika hubungan tersebut dapat ditindaklanjuti.

## Lengkapi akses hukum anonim

Footer autentikasi kini dirender di dalam panel masuk dan pendaftaran yang terlihat sehingga kontributor dokumen hukum terdaftar dapat menampilkan tautannya. Pemuatan langsung rute SPA publik yang disetujui server melewati alur `load-page` terautentikasi, sehingga `/terms-of-service` tidak lagi mengubah ketiadaan sesi menjadi pengalihan masuk karena sesi kedaluwarsa.

## Jaga tautan autentikasi sesuai publikasi

Kontributor footer autentikasi kini mengembalikan tautan yang saat ini layak dari `listAuthFooterLinks()`, bukan mendorong kumpulan tetap sebagai efek samping impor. Cognis memvalidasi dan mengganti kumpulan tautan setiap penyedia secara atomik agar dokumen yang belum diterbitkan atau telah ditarik tidak tetap muncul pada halaman masuk dan pendaftaran.

## Halaman hukum publik menggunakan shell Cognis

Halaman Lisensi bawaan kini secara eksplisit bersifat publik, sedangkan Catatan Perubahan hanya tersedia di dalam aplikasi terautentikasi dan tidak ditampilkan pada footer autentikasi. Page composer menormalkan halaman modul publik agar tetap menggunakan shell Cognis anonim alih-alih merender dokumen tanpa bingkai.

## Pulihkan tautan autentikasi yang diterbitkan modul

Plugin footer autentikasi kembali dapat menyumbangkan tautan sebagai efek samping impor sesuai kontrak modul yang telah ditetapkan. Cognis membatasi kontribusi tersebut pada halaman autentikasi, mempertahankan tautan khusus aplikasi ketika plugin menghapusnya, dan membiarkan setiap modul menentukan dokumen terbitan yang layak. Pemasangan langsung kini menetapkan konteks halaman publik sebelum komposisi sehingga halaman Lisensi publik tidak menjalankan penegakan sesi akun.

## Jadikan validasi publikasi peka terhadap sumber

Validasi publikasi UI kini menghapus komentar sebelum menemukan ekspor penggunaan ulang sehingga contoh terdokumentasi tidak dianggap sebagai API nyata. Penegakan modul eksternal hanya memindai sumber UI browser dan melewati pengujian, dependensi, keluaran hasil pembuatan, cakupan, serta pohon build agar kode server atau vendor tidak dikenai aturan khusus browser.

## Commit

- [57d2cdca](https://github.com/Cognis-Labs-HQ/Cognis/commit/57d2cdca)
- [6ce9fafe](https://github.com/Cognis-Labs-HQ/Cognis/commit/6ce9fafe)
- [e0f8bc49](https://github.com/Cognis-Labs-HQ/Cognis/commit/e0f8bc49)
- [5c3df5a3](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c3df5a3)
- [60c9a07e](https://github.com/Cognis-Labs-HQ/Cognis/commit/60c9a07e)
- [82ac645e](https://github.com/Cognis-Labs-HQ/Cognis/commit/82ac645e)
- [841e6c76](https://github.com/Cognis-Labs-HQ/Cognis/commit/841e6c76)
- [234d0e03](https://github.com/Cognis-Labs-HQ/Cognis/commit/234d0e03)
- [5f0ad5f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f0ad5f0)
- [c44fcd61](https://github.com/Cognis-Labs-HQ/Cognis/commit/c44fcd61)
- [d317260b](https://github.com/Cognis-Labs-HQ/Cognis/commit/d317260b)
