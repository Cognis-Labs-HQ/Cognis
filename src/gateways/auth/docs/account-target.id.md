# Kebijakan Target Akun

Auth mengelola batas akun istimewa yang digunakan oleh pengelolaan akun dan administrasi autentikasi dua faktor.

## Contoh Penggunaan

Dapatkan `auth:authorizeAccountTarget` versi 1 melalui `system:contracts`. Kirim `{ actor: { sub, role }, accountId, allowSelf }` menggunakan klaim dari penjaga Auth yang diinjeksi. Pengelolaan pengguna menetapkan `allowSelf: false`; layanan mandiri menetapkannya ke `true`.

Keputusan yang diizinkan berbentuk `{ allowed: true, accountId, isCurrent }`. Periksa target yang tepat dan panggil `isCurrent()` tepat sebelum menggunakannya. Penolakan berbentuk `{ allowed: false, status, code }`. Kontrak yang hilang atau tidak kompatibel berarti tidak tersedia, bukan izin memakai pemeriksaan yang lebih lemah.

Batasan opsional `allowFounder` bernilai `true` bila dihilangkan. Nilai `false` menolak akun pendiri dengan `403 protected_founder_account`, terlepas dari peran aktor atau target. Nilai nonboolean yang disertakan menghasilkan `400 bad_request`. Tindakan Users biasa dan TFA mempertahankan perilaku pendiri yang ada; hanya deprovision terlindungi meminta batasan tambahan ini. Penyedia alternatif harus menerapkan batasan ini sebagai bagian kontrak versi 1, bukan mengabaikannya diam-diam.

Dengan `allowSelf: true` dan `allowFounder: false`, layanan mandiri juga membaca metadata otoritatif dan dapat ditolak untuk pendiri, akun hilang, atau metadata tidak tersedia. Menghilangkan batasan pendiri mempertahankan layanan mandiri tanpa pembacaan metadata.

## Spesifikasi Teknis

### Identitas dan izin

Klaim Auth pelaku yang terverifikasi tetap menjadi acuan; kebijakan ini tidak memuat ulang atau meningkatkan perannya. Akun biasa hanya dapat bertindak pada dirinya sendiri jika layanan mandiri diizinkan. Administrator dapat mengelola akun pengguna, pengajar, dan moderator lain. Hanya pemilik yang dapat mengelola akun administrator atau pemilik lain. Pendiri dengan peran administrator atau pemilik tersimpan memiliki peran efektif pemilik; penanda pendiri saja tidak meningkatkan peran lain. Pengelolaan pengguna tetap menerapkan pembatasan pendiri, peran, dan penghapusan yang khusus untuk setiap tindakan.

ID target harus tidak kosong, tidak diubah, dan tidak berisi spasi, karakter kontrol, atau pemisah jalur. Permintaan lintas akun membaca `auth:accountStore.getInfo(accountId)` dan mengharuskan `accountId` yang cocok, peran yang dikenal, serta `isFounder` boolean. Akun yang tidak ada menghasilkan `404 not_found`; metadata tidak valid, kegagalan pembacaan, atau pemilik yang tidak tersedia menghasilkan `503 account_policy_unavailable`. Tidak ada peran pengganti atau otorisasi target yang disimpan dalam cache. Permintaan tidak valid menghasilkan `400 bad_request`; penolakan akses memakai `403 forbidden`, `protected_self_account`, atau `protected_admin_account`.

### Tahap dan masa berlaku

Auth mendaftarkan `auth:authorizeAccountTarget` dengan tahap `validateRequest`, `readAccount`, dan `authorizeTarget` dalam masa berlaku bootstrap-nya. Masukan pemanggil disalin dan dibekukan. Status operasi privat mengikat setiap tahap pada satu pemanggilan; eksekusi flow langsung, pemutaran ulang masukan yang ditangkap, dan perubahan data flow publik tidak dapat memberi kewenangan. Target lintas akun yang diizinkan dibaca kembali setelah tahap yang dapat diperluas, sehingga hook tertunda tidak mempertahankan peran lama yang lebih rendah atau target yang telah dihapus.

Penghapusan kontrak, kegagalan bootstrap, penonaktifan/pengaktifan ulang, atau penggantian penyimpanan akun membatalkan pekerjaan tertunda dan pemeriksaan masa berlaku yang telah diberikan. Konsumen juga memeriksa masa berlaku rute, pelaku terverifikasi saat ini, dan pendaftaran kontrak yang tepat sebelum efek lanjutan. Permintaan independen tidak berbagi promise metadata atau menyimpan keputusan dalam cache.

Ini adalah pemeriksaan otorisasi pada suatu waktu, bukan transaksi yang mencakup metadata akun dan penyimpanan komponen lain. Perubahan setelah pembacaan terakhir tidak dikunci; `isCurrent()` memeriksa masa berlaku, bukan membaca ulang peran akun. Pemanggil harus memakai keputusan segera, bukan menyimpannya untuk tindakan berikutnya.

### Persiapan pengelolaan dan efek deprovision

Users menyalin dan membekukan aktor terverifikasi sekali. Penolakan awal tetap dilakukan sebelum persiapan isi permintaan atau metadata, lalu kebijakan diperoleh kembali setelah penantian tersebut dan tepat sebelum mutasi pertama. Setelah perubahan peran yang diizinkan dimulai, pemeriksaan aktor/masa berlaku yang sama melindungi sinkronisasi profil; memeriksa ulang terhadap peran admin yang baru ditulis oleh operasi itu sendiri akan memutus promosi yang sah.

Input HTTP `deprovision-user` juga menyertakan `actor` beku dan fungsi murni `isAuthorizationCurrent()`. Auth menyimpannya secara privat pada `authorize-request`, memeriksa fungsi tersebut secara ketat, dan memperoleh kembali kebijakan target versi 1 pada `persist-state` setelah persiapan yang dapat diperluas. Guard yang disertakan tetapi kosong, tidak valid, melempar galat, atau tidak mengembalikan tepat `true` ditolak. Perubahan input atau hasil tahap berikutnya tidak dapat menghapus guard yang tersimpan. Penolakan kebijakan terminal mengembalikan `persisted: false`, `status`, dan `reason`; Users mengirim satu respons yang sesuai, bukan keberhasilan.

Produsen rekonsiliasi LDAP yang ada merupakan alur pemilik sistem tersendiri tanpa aktor/guard HTTP. Penghilangan ini bukan jalur cadangan untuk Users. Penghapusan dan penonaktifan dimulai dengan mutasi penyimpanan akun; pengarsipan dimulai dengan pencabutan sesi dalam `persist-state`. Pembersihan melaporkan jumlah pencabutan yang tersimpan tanpa mengulang efeknya. Setelah mutasi dimulai, pembersihan dependensi dapat selesai meskipun masa berlaku habis, sedangkan rute memeriksa kembali aktor/masa berlaku sebelum perubahan profil berikutnya. Ini bukan transaksi lintas penyimpanan: efek eksternal yang sudah dimulai tidak dapat dibatalkan atau dipulihkan oleh pemeriksaan ini, sehingga penyelesaian sebagian tetap mungkin. Deprovision terlindungi mengirim `allowFounder: false`; kebijakan terminal mengevaluasi tanda pendiri saat ini bersama peran target, mempertahankan larangan yang ada untuk setiap peran pendiri, termasuk operasi oleh pemilik. Hanya perubahan setelah pembacaan terakhir tersebut yang berada di luar batas waktu pemeriksaan ini.

### Hasil deprovision yang otoritatif

`auth:deprovisionOutcome` versi 1 adalah kontrak objek milik Auth dengan `read(input, stageResults)` dan `deletedAccount(input, stageResults)`. Metode memerlukan objek input asli yang sama dan identitas peta hasil pemanggilan yang sama dari runner alur nyata. Salinan, pasangan pemanggilan yang berbeda, dan operasi belum selesai tidak memiliki bukti hasil. Penggunaan ulang satu objek input memulai pemanggilan baru dan membatalkan bukti sebelumnya. Hasil dibekukan; status privat pemilik tetap otoritatif ketika hook berikutnya mengganti hasil tahap publik atau mengubah bidang input.

`read` mengembalikan hasil terminal pemilik `{ persisted: true, username, action, revokedTokenCount? }` atau `{ persisted: false, status, reason }`, atau `undefined` bila tidak tersedia. `deletedAccount` mengembalikan ID akun tersimpan hanya untuk penghapusan yang sudah dilakukan. Kedua metode memeriksa generasi Auth, deklarasi kontrak, dan identitas penyedia sendiri, termasuk referensi lama setelah nonaktif/aktif ulang atau penggantian. Bukti hasil tidak membaca ulang peran atau membatalkan efek yang sudah dimulai.

Users mengikat pembaca sebelum menjalankan alur, memvalidasi target/tindakan, dan hanya memakai bukti pemilik untuk respons serta efek profil berikutnya. Pembersihan instans akun Auth, Calendar, Keyring, Profile, Classes, Messages, dan Internal Notification memperoleh `deletedAccount` melalui `ctx`; nilai `persist-state` publik dan bidang input yang berubah tidak dapat mengizinkan penghapusan. Penyedia bukti yang hilang, tidak kompatibel, atau tidak valid ditolak. Terapkan Auth bersama konsumen terbaru; penyedia alternatif wajib menerapkan kontrak pemanggilan persis ini. Konsumen lama yang hanya membaca hasil publik tidak mendukung perlindungan ini. Urutan pembersihan dan batas penyelesaian sebagian untuk efek yang sudah dimulai tetap berlaku.

Batas companion yang diketahui: [Jitsi pada revisi 2dfe50b](https://github.com/Cognis-Labs-HQ/cognis-module-jitsi-meet/blob/2dfe50bfd46f32e08291a2aacbdeb27d559fb2f8/api/index.js#L380-L451) masih memakai bidang persistensi/input publik untuk pembersihan rapat dan sumber daya terkait. Revisi tersebut harus dipindahkan ke `auth:deprovisionOutcome` atau dinonaktifkan sebelum penerapan dianggap terlindungi; perubahan bawaan tidak mengamankan hook eksternal lama. Audit baca-saja API produksi/bootstrap tidak menemukan konsumen pembersihan yang cocok pada Whiteboard `ef9e9b4` atau Terms `330bf49`. Ini hasil audit sumber, bukan uji kompatibilitas yang dijalankan.

Auth memerlukan amplop alur yang tidak dapat diubah secara dangkal, diterapkan pada Core 0.6.6. Terapkan Core tersebut sebelum atau bersama Auth dan konsumen bukti hasil. Runtime memeriksa amplop yang benar-benar dibekukan, bukan label versi: runner lama yang belum dibekukan ditolak sebelum pembacaan metadata target atau efek deprovision, dan pendeteksiannya membatalkan keputusan serta bukti lama. Rentang maksimum dependensi teruji saja tidak menjamin minimum ini. Hanya referensi amplop yang tetap; isi input, data, dan hasil bersarang tetap dapat diubah, sehingga bukti hasil pemilik tetap diperlukan. Ekstensi tidak boleh mengganti referensi konteks tingkat teratas; gunakan bidang data yang dapat diubah untuk pekerjaan bersama.

### Integrasi

Terapkan Auth 2.2.12 bersama TFA 1.3.13 dan API 0.13.36. Implementasi Auth lama atau alternatif harus menyediakan kontrak versi yang dapat dijalankan sebelum pengelolaan lintas akun tersedia. Tidak ada jalur pengganti berupa pembacaan penyimpanan akun langsung atau pemeriksaan peran minimum pemanggil. Penyiapan TFA pribadi, detail metode, dan operasi login tertunda tidak memperoleh target lintas akun melalui parameter kueri.
