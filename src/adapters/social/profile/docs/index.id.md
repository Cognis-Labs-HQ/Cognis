# Gateway Profil

## Ikhtisar

Gateway Profil memiliki profil pengguna, grafik sosial, postingan, dan manajemen file untuk upload avatar dan banner. Gateway ini memberikan identitas publik kepada setiap akun Cognis dan tempat dalam grafik komunitas. Menghapus gateway ini menghapus semua fitur profil, sosial, postingan, dan file dari platform tanpa mempengaruhi inti, autentikasi, atau gateway lainnya.

## Tanggung Jawab

- Memiliki dan menginisialisasi tabel database `account_profiles`, `account_follows`, `account_blocks`, `posts`.
- Menegakkan visibilitas tingkat akun dan postingan pada semua endpoint profil dan sosial.
- Mengelola grafik sosial: follow, unfollow, block, unblock, dan query daftar follower/following.
- Mengelola upload avatar dan banner melalui capability `file:gateway`.
- Berkontribusi `profile:createProfile`, `profile:setRoleByHandle`, dan `preferences:store` ke capability store.

## Arsitektur

### Model Visibilitas

| Tingkat            | Profil terlihat oleh          | Postingan dan jumlah terlihat oleh |
| ------------------ | ----------------------------- | ---------------------------------- |
| `hidden` (default) | Diri sendiri dan admin saja   | — (postingan mengembalikan 403)    |
| `private`          | Hanya follower yang sudah ada | Hanya follower                     |
| `friends`          | Semua pengguna terautentikasi | Hanya follower                     |
| `community`        | Semua pengguna terautentikasi | Semua pengguna terautentikasi      |

### Lokasi Sumber Utama

| Path                                     | Tujuan                                       |
| ---------------------------------------- | -------------------------------------------- |
| `src/gateways/profile/bootstrap.ts`      | Titik masuk bootstrap                        |
| `src/gateways/profile/routes/social.ts`  | Route follow, block, follower                |
| `src/gateways/profile/routes/posts.ts`   | Pembuatan, daftar, dan penghapusan postingan |
| `src/adapters/db/reuse/profile-store.ts` | `DbProfileStore` — semua operasi SQL profil  |

## Pembaruan profil langsung

Informasi profil yang disimpan langsung ditampilkan. Jumlah dan kartu pengguna pengikut serta yang diikuti diperbarui secara otomatis. Pemilih gambar profil hanya menerima satu pilihan atau unggahan aktif pada satu waktu.

Perubahan mengikuti dan pilihan tinggi banner langsung ditampilkan sementara sinkronisasi latar belakang diselesaikan.

Umpan balik tindakan pesan dimuat dari sumber bahasa milik profil sehingga perenderan profil tidak bergantung pada adapter Pesan yang aktif.

## Ketersediaan

Menu profil menampilkan ketersediaan saat ini dan memungkinkan pengguna yang masuk memilih Luang, Sibuk, atau Tentatif. Lampu status avatar menampilkan status yang ditentukan sebagai keterangan saat penunjuk diarahkan. Komponen lain dapat meminta status pengguna yang mempertimbangkan kalender berdasarkan ID akun melalui kapabilitas ctx `social:getUserAvailability`.

## Kapabilitas UI yang disediakan

Plugin navbar profil menyediakan `ui:profileAvatarRenderer`. Modul yang merender avatar profil harus menyatakan ID ini dalam `requiresCapabilities`; Cognis kemudian memuat penyedia sebelum memasang rute SPA modul.

### Kapabilitas klien browser

`social:profileUiClient` dikontribusikan oleh penyedia Profil mandiri sebelum halaman yang bergantung dipasang dan menyediakan `getCurrentProfile()` agar modul browser memperoleh data profil melalui klien adaptor pemilik.

## Visibilitas Eksternal

`profile:applyExternalProfile` menerima nilai `profileVisibility` berupa `hidden`, `private`, `friends`, atau `community`. Nilai yang valid menjadi visibilitas profil tersimpan setelah pembuatan atau sinkronisasi profil; nilai yang tidak dikenal diabaikan.

## Ketersediaan tidak diketahui tanpa kesalahan pencarian

GET ketersediaan mengembalikan status unknown dengan respons berhasil untuk profil yang tidak ada atau dibatasi privasi. Kedua kasus memiliki bentuk respons yang sama dan tidak membaca preferensi manual atau status kalender. Aturan pemilik, pemblokiran, komunitas, teman, dan profil privat tetap berlaku; perubahan tetap memerlukan pemilik. Indikator avatar menampilkan tidak diketahui tanpa kesalahan tidak ditemukan berulang.

## Perubahan Sosial Offline

Penyedia Profile dan Messages mendaftarkan tindakan HTTP melalui ctx sesuai masa hidupnya. Profil, pos, daftar ruang, dan percakapan terenkripsi yang pernah dimuat tersedia di tab terverifikasi. Teks profil, ketersediaan, status ikuti/blokir, tata letak banner, pembuatan/penghapusan pos, pesan terenkripsi di ruang lama, status akhir reaksi, dan tanda baca memakai buffer offline per akun. Suntingan online berikutnya menunggu antrean pemilik yang sama. Pergantian akun atau sesi selama persiapan atau menunggu buffer membatalkan tindakan. Pesan dan pos memakai UUID `operationId` stabil; pengulangan berbeda atau lintas akun ditolak. Pengiriman ulang pesan tidak menggandakan notifikasi. Tanda baca mempertahankan waktu baca awal.

Percakapan dienkripsi sebelum masuk buffer: teks asli, kunci ruang, dan kredensial tidak masuk antrean. Teks profil dan isi pos disimpan di penyimpanan browser akun saat ini. Avatar/banner hingga 350.000 byte biner berbagi antrean 1 MB/1.000 catatan/tujuh hari; gambar lebih besar memerlukan koneksi. Buffer penuh menampilkan kesalahan terlokalisasi; draf pesan dan pos baru dikosongkan setelah berhasil disimpan secara permanen. Batas berlaku untuk seluruh buffer.

Perubahan tetap tertunda sampai dikonfirmasi server. Pesan menampilkan status antrean; tindakan profil, pos, dan media menampilkan toast antrean standar. Menutup atau memuat ulang browser memicu konfirmasi perubahan belum tersimpan selama akun memiliki buffer, termasuk catatan dari penyedia nonaktif. Peringatan hilang setelah konfirmasi atau pembersihan akun. Browser menentukan teks konfirmasi dan mungkin memerlukan interaksi pengguna. Catatan tetap bertahan setelah muat ulang; peringatan tidak membuangnya.

Konten sosial tersimpan tetap hanya di tab dan memerlukan persetujuan. Kunjungan pertama, muat ulang privat offline, pembuatan ruang, pengelolaan anggota/kunci, panggilan, dan unggahan besar memerlukan koneksi. Status mengetik dan kehadiran bersifat sementara dan tidak dikirim ulang. Otorisasi server terkini diperiksa saat pengiriman; cache offline tidak dapat mengetahui pencabutan akses jarak jauh. Persetujuan ToS tetap wajib sebelum akses dan pengiriman.

## Inisialisasi Profil

Ketersediaan profil dimulai saat penyedia dipasang setelah klien buffer terdaftar dan gaya avatar siap. Impor penyedia tidak memulai callback kehadiran atau polling. Penonaktifan dan pemasangan gagal menghapus langganan, listener halaman, timer, dan cache ketersediaan; pekerjaan asinkron lama tidak memperbarui cakupan penyedia berikutnya. Ini mencegah `profile_client_unavailable` saat halaman administrasi dimuat secara online.

## Nama Profil Publik

Nama profil SSO publik tidak menyertakan ruang nama penyedia. Nama berawalan penyedia yang sudah ada diganti saat inisialisasi profil; benturan diberi akhiran acak. Nama yang sudah netral tetap stabil. ID akun, pemetaan identitas, kiriman, dan hubungan tidak berubah. URL profil publik berubah ketika namanya berubah. Metadata penyedia, email, dan riwayat login tetap berada di antarmuka Pengguna khusus administrator. Bagian detail tiap akun memakai gaya bagian yang dapat diciutkan dan mengambil metadata terotorisasi saat dibuka.

## Privasi akun dan isolasi keyring

Akun SSO menggunakan ID acak yang tidak mengungkap identitas penyedia. ID penyedia disimpan terpisah dan hanya ditampilkan kepada administrator; nama pengguna publik tidak memuatnya. Auth mencadangkan nama sebelum perubahan profil atau email: nama duplikat dari penyedia yang sama ditolak, sedangkan penyedia berbeda mendapat akhiran acak pendek bila perlu. Daftar pengguna dan endpoint tindakan membedakan `username` publik dari `accountId` internal.

Akun lokal yang sudah ada tetap berfungsi meskipun ada catatan SSO lama. Startup tidak memerlukan reset basis data. Login dan provisi akun SSO lama ditolak secara individual sampai akun tersebut dibuat ulang dengan ID opak. ID akun, hubungan, dan rapat tidak dimigrasikan atau dihapus secara otomatis.

## Koneksi terputus mendadak

Polling kehadiran dan ketersediaan sementara berhenti saat Mode Luring dimulai dan dilanjutkan setelah koneksi pulih. Perubahan ketersediaan manual tetap menggunakan buffer luring yang ada.

## Hasil Antrean Tersimpan

Teks profil, postingan, dan unggahan gambar terbatas dalam antrean mempertahankan hasil selesai jika penyegaran tampilan gagal. Pembaruan teks memakai data server saat daring dan proyeksi antrean saat luring. Kegagalan pengiriman mempertahankan draf; kegagalan penyegaran berikutnya tidak mendorong pengiriman ganda.
