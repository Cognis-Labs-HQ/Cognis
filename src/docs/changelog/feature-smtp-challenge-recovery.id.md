# Pengiriman Kode SMTP

**Cabang Fitur:** feature-smtp-challenge-recovery

## Ikat pengiriman pada tantangan pemiliknya

Pada Email Code, “dalam antrean” berarti pengiriman belum selesai. Tunggu kode terbaru. Kirim ulang mengganti kode sebelumnya hanya setelah diterima; penolakan mempertahankannya. Setelah kegagalan pengiriman, kirim ulang secara eksplisit sebelum kedaluwarsa atau mulai login baru. Percobaan login berlaku lima menit dan penyiapan sepuluh menit. Pembatalan penyiapan hanya memengaruhi penyiapan tersebut. Melanjutkan login tidak mengirim email lagi atau memperpanjang tenggat.

Adapter metode wajib menerima `lifetime: { id, expiresAt, signal }` untuk penyiapan, tantangan login, dan verifikasi login. Pemanggil `tfa:getLoginMethods(accountId, lifetime)` dan `tfa:verifyLogin(accountId, methodId, payload, lifetime)` harus dimigrasikan. Penyiapan memperoleh identitas serta tenggat sepuluh menit sebelum pembacaan asinkron pertama. Auth menyediakan masa hidup login melalui `auth:getPendingLoginLifetime` versi 1. Pembatalan, kedaluwarsa, kegagalan penyimpanan, penonaktifan metode akun, reset, dan pembersihan gateway membatalkan operasi yang tepat. Pembacaan lama tetap ditolak setelah aktivasi ulang. Verifikasi dapat dibatalkan sebelum titik komit pendaftaran; setelah penulisan dimulai, pembatalan dan reset menunggu penghalang komit/pembersihan yang tetap terlihat. Verifikasi kode pemulihan juga memeriksa masa hidup setelah konsumsi asinkron. Mulai ulang menghilangkan tantangan dalam memori. Deskripsi login yang dilanjutkan adalah cuplikan penerimaan, bukan tanda terima pengiriman terkini.

## Migrasi penyedia wajib

SMTP TFA mewajibkan `notify:deliverEmail` versi 1 melalui registri kontrak publik, tanpa pengganti `notify:sendEmail` atau opsi yang diabaikan. Kode baru yang diterima mengganti dan membatalkan hanya pengiriman lama yang sesuai. Penolakan penerimaan mempertahankan kode sebelumnya. Kegagalan pengiriman berikutnya membatalkan kode baru; kirim ulang secara eksplisit selama percobaan masih berlaku untuk memulihkan. Permintaan kirim ulang bersamaan digabung hanya dalam operasi pemilik yang sama. Penyiapan dan login mandiri memiliki ID serta pembatalan terpisah. Kode sekali pakai berakhir pada batas lebih awal antara tenggat pemilik dan 15 menit; callback terlambat tidak memulihkannya. Status antrean dan terkirim ditampilkan berbeda. Terapkan Notification SMTP 0.5.5, SMTP TFA 1.1.3, TFA 1.3.12, dan Auth 2.2.11 bersama; penyedia alternatif harus menerapkan kontrak tersebut.

`auth:getPendingLoginLifetime` versi 1 hanya membaca `{ id, accountId, expiresAt, signal }` dari percobaan yang sudah melewati autentikasi utama. Operasi ini tidak membuat atau memperpanjang kewenangan. Auth membuat percobaan sebelum persiapan faktor otomatis tanpa menerbitkan sesi atau mengaktifkan profil. Tenggat lima menit yang tetap membatasi pengiriman. Konsumsi, pembatalan, kedaluwarsa, penggantian kelanjutan, logout, dan pembersihan pemilik membatalkan sumber daya tantangan. Kelanjutan berbasis cookie, perlindungan percobaan lama, dan melanjutkan tanpa pengiriman ulang tetap berlaku. Keberhasilan faktor membatalkan tantangan tanpa membatalkan komit sesi akhir yang terpisah. TFA menolak jika kontrak ini tidak tersedia.

`notify:deliverEmail` versi 1 menerima tujuan terdaftar, penerima, variabel, serta `signal: AbortSignal` dan waktu absolut milidetik `expiresAt` yang wajib. Alur validate/render/enqueue dan antrean tujuan yang sudah ada digunakan kembali. Penerimaan mengembalikan `{ receipt, completion }`; `completion` menghasilkan tanda terima akhir `sent` atau `failed`. Status antrean, pembatasan laju, atau proses pengiriman bukan bukti terkirim. Pembatalan, kedaluwarsa, atau pelepasan tujuan menghentikan antrean dan transport; hasil terlambat tidak dapat menimpa kegagalan. Perilaku tertunda `notify:sendEmail` tetap sama. Dua jeda greylist bawaan masing-masing lima menit tetap dibatasi tenggat pemilik. Pesan yang sudah diterima server SMTP tujuan tidak dapat ditarik kembali.

## Koordinasikan transisi akhir

Operasi akhir akun, metode, dan gateway memblokir penerimaan baru selama pembersihan dan penulisan status. Setiap operasi yang tumpang tindih memiliki token penghalang sendiri; penyelesaian satu operasi tidak membuka operasi lainnya. Kegagalan penulisan pendaftaran tetap menjadi kegagalan verifikasi, tetapi pembersihan menunggu penyelesaiannya tanpa menghalangi perubahan status oleh reset atau penonaktifan berikutnya.

## Komit

- [c19e37a82295b037b6e5d5ed5661e43fcd61b95c](https://github.com/Cognis-Labs-HQ/Cognis/commit/c19e37a82295b037b6e5d5ed5661e43fcd61b95c)
- [97ee12b302ac96abde12abd21defe5b0301fd1a0](https://github.com/Cognis-Labs-HQ/Cognis/commit/97ee12b302ac96abde12abd21defe5b0301fd1a0)
- [9e50528ce82886865688fc082b8af3203be1a3aa](https://github.com/Cognis-Labs-HQ/Cognis/commit/9e50528ce82886865688fc082b8af3203be1a3aa)
