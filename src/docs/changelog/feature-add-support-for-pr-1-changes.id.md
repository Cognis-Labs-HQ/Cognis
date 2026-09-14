# Integrasi Pendaftaran

**Cabang Fitur:** feature-add-support-for-pr-1-changes

## Penyimpanan dokumen berversi

Core kini menyediakan penyimpanan versi dokumen netral berbasis basis data yang hanya dapat ditambahkan untuk modul yang dikirimkan secara mandiri. Arsip Dokumentasi dan Catatan Perubahan yang ada tetap menggunakan snapshot sistem berkas multibahasa berversi komponen karena mengubah sumber statis tersebut menjadi rekaman basis data hanya akan menggandakan penyimpanan tanpa memperbaiki model versinya.

## Ekstensi pendaftaran

Alur pendaftaran milik host kini menyusun bidang modul, memvalidasi nilainya, dan menyelesaikan pekerjaan pendaftaran terautentikasi sebelum navigasi.

## Fallback gambar modul

Ikon dan banner modul yang rusak atau tidak valid kini beralih ke gambar standar modul tidak dikenal tanpa membuka popup galat runtime.

## Kapabilitas navigasi host

Siklus hidup modul kini mengenali router aplikasi sebagai penyedia `ui:navigate`, sehingga modul yang memerlukan navigasi host dapat diaktifkan.

## Pemuatan kontribusi yang aman

Administrasi kini mengimpor modul UI kontribusi di bawah pelindung SPA, sehingga titik masuk halaman tidak memasang dirinya sendiri pada URL Administrasi.

## Fallback gambar yang tangguh

Gambar modul kini menggunakan rute aset fallback publik kanonis; fallback yang tidak tersedia disembunyikan tanpa membuka popup galat runtime.

## Komposisi pendaftaran yang andal

Alur pendaftaran kini mengikuti aturan penamaan camel case untuk ctx, mengisolasi hook integrasi yang rusak agar pendaftaran dasar tetap tersedia, serta mendokumentasikan label HTML tepercaya bagi kontributor.

## Edit terlindungi dan bagian lipat pakai ulang

Pelacak perubahan kini melindungi keluar dari peramban serta navigasi SPA, pengamat sub-composer yang usang berhenti setelah pelepasan, dan composer bagian lipat berbasis payload menyediakan baris tindakan selebar sama bagi Administrasi dan modul eksternal.

## Popup wajib dan alur keluar bersama

Popup kini dapat memilih interaksi wajib tanpa tombol tutup, penutupan melalui latar, atau tombol Escape. ctx peramban juga menyediakan alur keluar bertahap yang mencabut sesi, mengunci keyring, membersihkan status akun lokal, dan mengalihkan ke halaman masuk.

## Tautan footer halaman yang dapat diperluas

Shell halaman kini menyediakan `ui:footerLinks` agar kontribusi tautan berskop dapat ditempatkan di sisi kiri atau kanan footer; host memakai registri yang sama untuk Lisensi dan Catatan Perubahan.

## Paginasi terstruktur yang dapat digunakan ulang

Riwayat peristiwa Keyring kini memakai paginator bersama dengan ukuran halaman pilihan pemanggil, hasil halaman terstruktur, kontrol yang dilokalkan, pembaruan data, dan kapabilitas ctx `ui:pagination` yang tersedia bagi modul.

## Isolasi navigasi dan pendaftaran yang lengkap

Edit yang belum disimpan kini melindungi penelusuran riwayat Mundur dan Maju serta memulihkan entri aktif ketika navigasi ditolak. Factory bidang pendaftaran gagal secara terisolasi, hook penyelesaian menerima nilai terkirim dan konteks integrasi, serta Keyring menyelesaikan paginasi melalui ctx.

## Cakupan regresi rangkaian pengujian lengkap

Pemeriksaan regresi Keyring dan router diperbarui agar sesuai dengan kontrol paginasi bersama dan status riwayat SPA berindeks, sehingga seluruh rangkaian pengujian kembali berjalan tanpa kegagalan.

## Tautan footer aktif dan menu samping bersama

Tautan footer kini menandai rute aktif beserta turunannya. Navigasi dokumentasi dan catatan perubahan sekarang menggunakan pembuat menu samping terstruktur yang dapat digunakan kembali dan tersedia bagi modul runtime melalui kapabilitas ctx `ui:sideMenu`.

## Panah pengungkapan adapter sebaris

Baris adapter Administrasi kini menyediakan kolom ringkasan terpisah untuk kontrol tindakan dan panah pengungkapan. Penghapusan kolom kontrol lama selebar panah membuat panah tetap berada tepat setelah sakelar daya pada baris yang sama.

## Commit

- [2f77a92](https://github.com/Cognis-Labs-HQ/Cognis/commit/2f77a92c78df6da12b4c000b47b2c787ab517695)
- [8b480faf](https://github.com/Cognis-Labs-HQ/Cognis/commit/8b480fafbceca1dd52b9c693dc1f0d4381d473b8)
- [84f84a43](https://github.com/Cognis-Labs-HQ/Cognis/commit/84f84a43659185eb65e48004cc9a898b69aa4458)
- [2ad50da](https://github.com/Cognis-Labs-HQ/Cognis/commit/2ad50dacc8f0a73aa965b85410054a881a05cd17)
- [1b13f90](https://github.com/Cognis-Labs-HQ/Cognis/commit/1b13f90326737588d470ac1e4919e36ed9fba4dd)
- [082e5f2](https://github.com/Cognis-Labs-HQ/Cognis/commit/082e5f2ab7fc36c948c2da97539d1b56cd7fdae0)
- [2be280e](https://github.com/Cognis-Labs-HQ/Cognis/commit/2be280efacce0abf81d80ad3aae9bd23c8db921a)
- [fb19c34e](https://github.com/Cognis-Labs-HQ/Cognis/commit/fb19c34e1ad6b7de4b7c0dd2c6bb8e0fad171484)
- [3f80ad56](https://github.com/Cognis-Labs-HQ/Cognis/commit/3f80ad56eb500d81031d7c3001bc1b5c246f84a1)
- [8f67ef9e](https://github.com/Cognis-Labs-HQ/Cognis/commit/8f67ef9eb42910f9597f694d2d7b819b1ab00940)
- [f7cfe49a](https://github.com/Cognis-Labs-HQ/Cognis/commit/f7cfe49a74f4e104348eae5938747f0d601b2b60)
- [7c16485f](https://github.com/Cognis-Labs-HQ/Cognis/commit/7c16485f5abf7b260cf6bf6311dbf80725e4fb05)
- [e240270a](https://github.com/Cognis-Labs-HQ/Cognis/commit/e240270a5a597aeb07cd3e905343be1f2c2ef4f5)
- [c63e7c8f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c63e7c8f0aab5c4e1e38d5963fd64ab7036a40e5)
- [672104a0](https://github.com/Cognis-Labs-HQ/Cognis/commit/672104a008171509ff08eb522d85c90dc70ac045)
- [957a4c49](https://github.com/Cognis-Labs-HQ/Cognis/commit/957a4c4987bbac8d259942e134c33b783e8eb4e5)
- [182a22ef](https://github.com/Cognis-Labs-HQ/Cognis/commit/182a22ef86b98848185f6a73e622bf31845aee2f)
- [5a67fcd2](https://github.com/Cognis-Labs-HQ/Cognis/commit/5a67fcd2562b01e10cf7907158de6d657bd3ec5d)
