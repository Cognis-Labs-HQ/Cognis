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

## Commit

- [57d2cdca](https://github.com/Cognis-Labs-HQ/Cognis/commit/57d2cdca)
- [6ce9fafe](https://github.com/Cognis-Labs-HQ/Cognis/commit/6ce9fafe)
- [e0f8bc49](https://github.com/Cognis-Labs-HQ/Cognis/commit/e0f8bc49)
- [5c3df5a3](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c3df5a3)
- [60c9a07e](https://github.com/Cognis-Labs-HQ/Cognis/commit/60c9a07e)
- [82ac645e](https://github.com/Cognis-Labs-HQ/Cognis/commit/82ac645e)
