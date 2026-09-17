# Token pendaftaran, SSO, dan penguatan modul

**Cabang Fitur:** registration-token-sso-review

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

## Hook permulaan SSO yang dapat digabungkan

Penyelesaian pengalihan SSO kini mengabaikan hook alur yang sengaja tidak mengembalikan hasil. Peserta `initiateAuthorization` yang tidak terkait dapat mengamati atau menolak permintaan SSO tanpa merusak pemilihan pengalihan sebelum penyedia terpilih mengembalikan URL otorisasinya.

## Otorisasi pendaftaran yang aman secara transaksi

SSO saat pendaftaran tertutup kini memvalidasi undangan sebelum membuat akun, lalu memakai token dan mencatat email terverifikasi kanonis hanya setelah penyimpanan akun berhasil. Kegagalan penyelesaian menghapus akun baru dan memulihkan kegunaan token. Token yang rusak menghasilkan penolakan gerbang biasa. Undangan pengganti mempertahankan token lama yang masih dapat digunakan sampai email baru berhasil dikirim, dan tampilan tombol login melengkapi alih-alih menimpa perilaku penyedia yang ada.

## Callback penyedia autentikasi yang terlindungi

Adapter autentikasi kini dapat mendaftarkan rute `GET` dan `POST` yang dapat dilepas dalam namespace penyedia tervalidasi di bawah `/api/v1/auth`. Namespace inti Autentikasi tetap dicadangkan, sehingga modul eksternal tetap tidak dapat mengklaim rute terlindungi secara langsung, sedangkan callback OAuth milik penyedia seperti `/api/v1/auth/x/callback` dapat diproksikan dengan aman melalui adapter terdaftar.

## Modul berprivilege yang eksplisit

Modul harus mendeklarasikan `privileged: true` sebelum memperluas alur autentikasi yang sensitif terhadap keamanan atau memproksikan rute milik gateway melalui adapter auth. Hanya mengaku sebagai penyedia SSO tidak memberikan akses tambahan. Cognis memercayai asal berprivilege dari organisasi GitHub `Cognis-Labs-HQ` yang ditetapkan langsung dan mengeluarkan peringatan eksplisit saat sumber lain meminta privilege.

## Kepemilikan modul terlindungi dan jaminan

Rute API, kemampuan, alur, hook, prefiks statis, dan registrasi UI modul kini menolak penggantian lintas pemilik serta hanya dibersihkan untuk pemilik yang tercatat. Konsumen lintas modul dapat meminta deskriptor jaminan berisi identitas tetap, versi, asal privilege, sumber, dan integritas runtime. Provenance pemasang menyegel hash manifes dan Cognis meng-hash ulang setiap file yang dideklarasikan agar integrasi dapat menolak penyedia yang dimodifikasi atau tidak dapat diverifikasi.

## Isolasi modul yang patuh

Modul tanpa privilege kini hanya dapat mendaftarkan rute API, kemampuan, dan alur baru di dalam namespace modulnya sendiri. Namespace host dan modul lain memerlukan deklarasi privilege secara eksplisit sehingga ekstensi biasa tidak dapat mengambil alih permukaan integrasi modul lain. Pemeriksaan kepatuhan juga memperbaiki diagnostik login yang dilokalkan dan struktur dokumentasi Token Pendaftaran.

## Penguatan tinjauan dan integrasi kooperatif

Callback SSO serentak kini memakai satu hasil konsumsi token sehingga callback yang kalah tidak dapat menghapus akun pemenang. Token Pendaftaran bergantung pada gateway Notifikasi yang netral, bukan SMTP; tombol bermerek dibatasi pada penyedia aktif; dan kegagalan dialog dependensi memakai panduan yang dilokalkan. Modul tanpa privilege tetap memiliki jalur kerja sama yang terdokumentasi dan teruji melalui kemampuan bernamespace milik penyedia serta alur yang tidak sensitif terhadap keamanan.

## Pemulihan siklus hidup komponen wajib

Penggabungan penukaran token kini menyertakan identitas token dan akun sehingga akun eksternal yang bersaing tidak mewarisi otorisasi callback lain. Kebijakan siklus hidup Core yang dapat digunakan ulang memaksa komponen wajib yang terkunci tetap aktif meskipun terdapat status nonaktif tersimpan yang usang; penyedia Autentikasi, Pendaftaran, dan Notifikasi selalu aktif menerapkannya saat pemuatan dan pada batas konfigurasi.

## Kesetaraan siklus hidup autentikasi runtime

Adapter autentikasi dari modul kini memulihkan konfigurasi tersimpan dan status aktif milik gateway sebelum registrasi penyedia selesai. Kemampuan registrasi menjadi asinkron agar modul dapat menunggu kesiapan siklus hidup sebelum menyumbangkan rute callback atau tombol login bermerek, sesuai urutan penemuan dan aktivasi LDAP. Dokumentasi menjelaskan jalur migrasi X SSO dan kontrak penyiapan milik gateway.

## Kelanjutan pendaftaran SSO berbasis token

Saat identitas SSO yang telah diautentikasi memerlukan akun Cognis sementara pendaftaran publik dinonaktifkan, respons login kini secara eksplisit meminta token pendaftaran dan menyediakan endpoint percobaan ulang. Cognis mempertahankan token yang dikirim serta email cadangan selama autentikasi ulang penyedia agar adapter Token Pendaftaran wajib dapat mengotorisasi pembuatan akun.

## Otorisasi SSO milik pendaftaran dan kebijakan undangan

Identitas SSO yang belum dikenal kini dialihkan ke percobaan pendaftaran sementara yang buram dan dirender oleh adapter Token Pendaftaran di dalam shell pendaftaran Cognis standar. Popup undangan Pengguna menyediakan tab Email dan Token; token manual berfungsi tanpa SMTP. Pendaftaran dari pendiri dibatasi sepuluh penggunaan berhasil dan dapat direset administrator. Pemilik mengontrol hak undangan pendiri dan administrator melalui Administrasi → Pendaftaran. Pendaftaran publik secara eksplisit melewati otorisasi token.

## Koreksi build halaman Pengguna

Tindakan pengaturan ulang undangan pendiri kini tetap berada di dalam penangan tindakan halaman Pengguna, sehingga build UI produksi kembali menghasilkan modul ECMAScript yang valid.

## Siklus hidup modul khusus kontrak terkini

Modul eksternal kini dimuat secara eksklusif melalui `entrypoints.bootstrap` dan `bootstrapModule(ctx)`. Titik masuk API lama dan jalur hook registrasi terpisah dihapus, bukan dipertahankan sebagai cabang kompatibilitas. Instalasi yang ada beralih melalui migrasi eksplisit atau memasang rilis modul terkini.

## Keandalan undangan pengguna

Popup undangan tidak lagi merujuk variabel baris tabel di luar cakupannya. Perubahan ini mencegah penolakan `user is not defined` pada halaman Pengguna sambil mempertahankan tindakan reset batas pendiri di menu masing-masing pengguna.

## Publikasi aset token pendaftaran

Gateway Pendaftaran kini menerbitkan UI adaptor token melalui registri statis milik adaptor dan menyelesaikan skripnya melalui manifes aset produksi. Lingkungan pengembangan menyajikan URL adaptor kanonis, produksi mengembalikan URL bundel berciri hash, dan string token terlokalisasi memakai namespace adaptor yang sama. Dengan demikian, kelanjutan pendaftaran SSO memuat formulir token setelah `account_creation_required`, bukan kembali ke pesan pendaftaran tertutup.

## Komit

- [82b2e35e](https://github.com/Cognis-Labs-HQ/Cognis/commit/82b2e35e792e91be2924edc0ffa45d3d2c8a1c0d)
- [d6a4f6b5](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6a4f6b5d0c4ae212927fd18912345ba749f837f)
- [4eb78e44](https://github.com/Cognis-Labs-HQ/Cognis/commit/4eb78e4433e7371533c1cd9d26bdca0e82f006f9)
- [5bd254bb](https://github.com/Cognis-Labs-HQ/Cognis/commit/5bd254bb88a817bfe40e86eb32d25d53661ce5eb)
- [83ca6396](https://github.com/Cognis-Labs-HQ/Cognis/commit/83ca639667ff46fb7a66afeaa69b4145383a9da9)
- [88985bd5](https://github.com/Cognis-Labs-HQ/Cognis/commit/88985bd515cdbc7539c2326812879e67a39a1143)
- [4120a69d](https://github.com/Cognis-Labs-HQ/Cognis/commit/4120a69d267eaf07897bed979032b2e7706e1a7c)
- [a4c928d8](https://github.com/Cognis-Labs-HQ/Cognis/commit/a4c928d82c7c42ee4a9ec4f295199d008abc9137)
- [fa24bfec](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa24bfec261a358e17e6bbb9078b160a1b4cb903)
- [e66d75f7](https://github.com/Cognis-Labs-HQ/Cognis/commit/e66d75f72b2e8ab4da4a4e93435f6472b4fe3903)
- [85b7f238](https://github.com/Cognis-Labs-HQ/Cognis/commit/85b7f238bd959f9c4230168ff1378eebc04bbcee)
- [5552b77f](https://github.com/Cognis-Labs-HQ/Cognis/commit/5552b77f945050d4e9b51e43a90c79a95d348487)
- [23517721](https://github.com/Cognis-Labs-HQ/Cognis/commit/2351772152b0d07f6c82a9683222d0d0cf6602d0)
- [d62eba99](https://github.com/Cognis-Labs-HQ/Cognis/commit/d62eba99)
- [6eec5296](https://github.com/Cognis-Labs-HQ/Cognis/commit/6eec52967246d4e0991b56691c6024cdc71c2c1e)
- [3cf4aee2](https://github.com/Cognis-Labs-HQ/Cognis/commit/3cf4aee2a35c83065d116717f71a845f36bf5416)
- [fcfbfc35](https://github.com/Cognis-Labs-HQ/Cognis/commit/fcfbfc35a6bd698b4be409764e07bf8820f3201b)
- [2f42af60](https://github.com/Cognis-Labs-HQ/Cognis/commit/2f42af6007a0935a99ca2860cfb893c8e9bc3c2d)
- [fb4cbefe](https://github.com/Cognis-Labs-HQ/Cognis/commit/fb4cbefe2974a810fe5a8dabc15267d7663a58a4)
- [a7f57fd8](https://github.com/Cognis-Labs-HQ/Cognis/commit/a7f57fd8e8d21b3783b9e316ade117343c4e5cbd)
- [a42c7af6](https://github.com/Cognis-Labs-HQ/Cognis/commit/a42c7af6b477c66a1a3d2f241c4b1f12b5bf4134)
- [9d5530e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/9d5530e0359e8edb7f47756114c4dd18e4186617)
