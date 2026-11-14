# Adaptor Kelas

Adaptor Classes mengelola kelas per bahasa, permintaan keanggotaan, penugasan pengajar, dan preferensi ruang kelas.

## Contoh penggunaan

Pengajar mengelola kelas melalui `/classes`; pelajar yang masuk melihat keanggotaan melalui `/my-classes`. `GET /api/v1/study/classes?language=ja` mengembalikan kelas pengajar yang sesuai, sedangkan `GET /api/v1/study/my-classes` mengembalikan kelas yang diikuti pelajar.

## Spesifikasi teknis

### Rute dan izin

Adaptor mendaftarkan rute dan penyimpanannya melalui gateway Study dan ctx. Rute pengajar memerlukan peran pengajar; persetujuan dan penolakan permintaan pengajar memerlukan administrator. Perubahan keanggotaan dan ruang kelas tetap menggunakan pemeriksaan otorisasi akun dan kelas.

### Bukti penghapusan akun

Pada `deprovision-user` → `cleanup-dependencies`, komponen memperoleh `auth:deprovisionOutcome` versi 1 melalui `system:contracts` dan memanggil `deletedAccount(input, stageResults)` dengan objek asli dari pemanggilan tersebut. Hanya bukti milik Auth yang mengonfirmasi penghapusan tersimpan yang mengizinkan penghapusan keanggotaan, penugasan pengajar, dan aktivitas ruang kelas akun. Hasil salinan, hasil penonaktifan/pengarsipan, serta bukti yang hilang atau tidak tersedia tidak mengizinkan pembersihan ini.

Pasang bersama penyedia Auth 2.2.12 bawaan atau alternatif yang menerapkan kontrak berversi ini; hasil alur publik yang dapat diubah bukan pengganti. Pembersihan menggunakan bukti penghapusan yang sudah tersimpan, bukan melakukan otorisasi ulang setelah penghapusan. Mutasi eksternal yang sudah dimulai dapat selesai sebagian sebelum kegagalan berikutnya; pembatalan lintas komponen tidak dijamin. Kontrol antarmuka dan tutorial biasa tidak berubah.

Migrasi ini melindungi konsumen pembersihan bawaan. Sebelum mengaktifkan penghapusan akun dalam penerapan, perbarui atau nonaktifkan hook pembersihan eksternal yang masih memercayai hasil alur publik yang dapat diubah.
