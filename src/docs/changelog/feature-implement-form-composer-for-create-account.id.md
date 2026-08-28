# Pembuatan akun yang lebih terarah

**Cabang Fitur:** feature-implement-form-composer-for-create-account

## Susun formulir akun lengkap secara konsisten

Halaman Buat Akun kini menampilkan seluruh formulir pembuatan akun melalui penyusun formulir bersama, sehingga bidang, umpan balik validasi, penghitung karakter, dan tindakan konsisten dengan formulir Cognis lainnya.

## Buat detail undangan lebih mudah dipindai

Waktu kedaluwarsa undangan kini tampil dalam pil ringkas yang bukan wilayah live, sehingga pembaruan setiap detik tidak berulang kali mengganggu pengguna pembaca layar. Kartu pengantar dan kartu formulir juga menyesuaikan tinggi secara terpisah, sehingga formulir pembuatan yang panjang tidak lagi membuat kartu kiri terlalu tinggi.

## Jaga halaman publik bebas dari permintaan akun

Pelaporan ketersediaan dan kehadiran kini meminta status melalui kapabilitas konteks UI gateway Auth alih-alih membaca penyimpanan token milik Auth. Dengan demikian, halaman autentikasi publik tidak mengirim permintaan ke API Social khusus akun tanpa mengikat Social Profile pada penyedia autentikasi.

## Pertahankan penekanan bidang wajib

Formulir Buat Akun kini menyerahkan seluruh tampilan bidang kepada penyusun formulir bersama tanpa menerapkan gaya registrasi atau masuk, sehingga tanda bintang bidang wajib tetap konsisten dalam tema terang maupun gelap.

## Komit

- [74cb218](https://github.com/Cognis-Labs-HQ/Cognis/commit/74cb218dfafdfd93dcfef2ca2928ac6657ff5245)
- [9cc4ed9](https://github.com/Cognis-Labs-HQ/Cognis/commit/9cc4ed9c285c77d2901d2ea4cadb35b66af6ddc6)
- [1690cdb](https://github.com/Cognis-Labs-HQ/Cognis/commit/1690cdb58e8bcad63b60ef8beba367c3d0a03031)
- [a057317](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0573172b0549e663be0058f77b3af5aecc12432)
- [00fd542](https://github.com/Cognis-Labs-HQ/Cognis/commit/00fd5422)
