# Toast Dependensi Modul

**Cabang Fitur:** feature-handle-dependency-error-for-module-installation

## Kesalahan dependensi yang jelas

Pemasangan dan pengaktifan modul kini menampilkan dependensi wajib yang dinonaktifkan atau tidak tersedia sebagai toast kesalahan yang dilokalkan. Detail internal dependensi tetap tersimpan dalam log server.

## Tombol penyedia bergaya

Penyedia autentikasi dapat mendaftarkan tombol masuk bermerek yang dapat dihapus dengan ikon wajib dari asal yang sama dan label lengkap yang dilokalkan. Cognis memvalidasi kontrak tampilan, menghilangkan metode SSO tanpa gaya, serta mempertahankan ikon dan label lebar penuh pada layar kecil maupun besar. Tautan kaki halaman autentikasi kini tetap bersama dalam satu baris selebar konten.

## Alur otorisasi SSO

Tombol penyedia bermerek kini memulai alur kanonis `startSsoLogin`, bukan mengirimkan formulir nama pengguna dan kata sandi. Hook penyedia memvalidasi penyedia dan mengembalikan pengalihan otorisasi relatif atau HTTPS yang aman, sedangkan kegagalan dicatat dan ditampilkan sebagai toast yang dilokalkan.

## Pembuatan akun bertoken

Autentikasi eksternal kini melewati alur wajib `gateAccountCreation` sebelum Cognis menyimpan akun baru. Pendaftaran terbuka mengizinkan pembuatan secara langsung; pendaftaran tertutup mewajibkan token sekali pakai yang cocok dengan email penyedia dan melaporkan kapan UI SSO harus meminta email yang belum ada. Adapter Token Pendaftaran terpadu kini memiliki token undangan dan otorisasi SSO, bergantung pada pengiriman SMTP, tidak dapat dinonaktifkan, serta menyediakan tindakan undangan pada halaman Pengguna bagi administrator dan pendiri.

## Kesalahan SSO anonim yang andal

Kegagalan pemuatan metode login dan permulaan SSO pada halaman login anonim tidak lagi memanggil endpoint log server yang memerlukan autentikasi. Kesalahan login terlokalisasi yang asli tetap terlihat tanpa membuat permintaan HTTP 401 kedua atau penolakan pencatatan yang tidak tertangani.

## Komit

- [82b2e35e](https://github.com/Cognis-Labs-HQ/Cognis/commit/82b2e35e792e91be2924edc0ffa45d3d2c8a1c0d)
- [d6a4f6b5](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6a4f6b5d0c4ae212927fd18912345ba749f837f)
- [4eb78e44](https://github.com/Cognis-Labs-HQ/Cognis/commit/4eb78e4433e7371533c1cd9d26bdca0e82f006f9)
- [5bd254bb](https://github.com/Cognis-Labs-HQ/Cognis/commit/5bd254bb88a817bfe40e86eb32d25d53661ce5eb)
- [83ca6396](https://github.com/Cognis-Labs-HQ/Cognis/commit/83ca639667ff46fb7a66afeaa69b4145383a9da9)
- [88985bd5](https://github.com/Cognis-Labs-HQ/Cognis/commit/88985bd515cdbc7539c2326812879e67a39a1143)
- [4120a69d](https://github.com/Cognis-Labs-HQ/Cognis/commit/4120a69d267eaf07897bed979032b2e7706e1a7c)
- [a4c928d8](https://github.com/Cognis-Labs-HQ/Cognis/commit/a4c928d82c7c42ee4a9ec4f295199d008abc9137)
