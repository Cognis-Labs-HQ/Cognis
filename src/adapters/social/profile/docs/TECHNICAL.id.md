# Referensi Teknis

Antarmuka publik dan aturan operasional Profil dan Kiriman.

## Antarmuka

Profil dan Kiriman terintegrasi melalui gerbang pemilik; manifesnya mengidentifikasi komponen dan dependensi yang diperlukan.

## Konfigurasi

Konfigurasi disediakan melalui gerbang pemilik. Profil dan Kiriman tidak menyatakan konfigurasi tambahan dalam manifesnya.

## Perilaku

Pencarian avatar navigasi dan persiapan profil akun saat ini untuk mode offline memerlukan sesi akun. Tamu berbagi melewati pembacaan khusus akun ini, termasuk setelah autentikasi tamu berhasil; tampilan profil publik tetap mengikuti aturan aksesnya sendiri.

### Ikhtisar

Gateway Profil memiliki profil pengguna, grafik sosial, postingan, dan manajemen file untuk upload avatar dan banner. Gateway ini memberikan identitas publik kepada setiap akun Cognis dan tempat dalam grafik komunitas. Menghapus gateway ini menghapus semua fitur profil, sosial, postingan, dan file dari platform tanpa mempengaruhi inti, autentikasi, atau gateway lainnya.

### Tanggung Jawab

- Memiliki dan menginisialisasi tabel database `account_profiles`, `account_follows`, `account_blocks`, `posts`.
- Menegakkan visibilitas tingkat akun dan postingan pada semua endpoint profil dan sosial.
- Mengelola grafik sosial: follow, unfollow, block, unblock, dan query daftar follower/following.
- Mengelola upload avatar dan banner melalui capability `file:gateway`.
- Berkontribusi `profile:createProfile`, `profile:setRoleByHandle`, dan `preferences:store` ke capability store.

### Model Visibilitas

| Tingkat            | Profil terlihat oleh          | Postingan dan jumlah terlihat oleh |
| ------------------ | ----------------------------- | ---------------------------------- |
| `hidden` (default) | Diri sendiri dan admin saja   | — (postingan mengembalikan 403)    |
| `private`          | Hanya follower yang sudah ada | Hanya follower                     |
| `friends`          | Semua pengguna terautentikasi | Hanya follower                     |
| `community`        | Semua pengguna terautentikasi | Semua pengguna terautentikasi      |

### Lokasi Sumber Utama

| Path                                           | Tujuan                                       |
| ---------------------------------------------- | -------------------------------------------- |
| `src/adapters/social/profile/index.ts`         | Titik masuk bootstrap                        |
| `src/adapters/social/profile/routes/social.ts` | Route follow, block, follower                |
| `src/adapters/social/profile/routes/posts.ts`  | Pembuatan, daftar, dan penghapusan postingan |
| `src/adapters/social/profile/store.ts`         | `DbProfileStore` — semua operasi SQL profil  |

### Pembaruan profil langsung

Informasi profil yang disimpan langsung ditampilkan. Jumlah dan kartu pengguna pengikut serta yang diikuti diperbarui secara otomatis. Pemilih gambar profil hanya menerima satu pilihan atau unggahan aktif pada satu waktu.

Perubahan mengikuti dan pilihan tinggi banner langsung ditampilkan sementara sinkronisasi latar belakang diselesaikan.

Umpan balik tindakan pesan dimuat dari sumber bahasa milik profil sehingga perenderan profil tidak bergantung pada adapter Pesan yang aktif.

### Ketersediaan

Menu profil menampilkan ketersediaan saat ini dan memungkinkan pengguna yang masuk memilih Luang, Sibuk, atau Tentatif. Lampu status avatar menampilkan status yang ditentukan sebagai keterangan saat penunjuk diarahkan. Komponen lain dapat meminta status pengguna yang mempertimbangkan kalender berdasarkan ID akun melalui kapabilitas ctx `social:getUserAvailability`.

### Kapabilitas UI yang disediakan

Plugin navbar profil menyediakan `ui:profileAvatarRenderer`. Modul yang merender avatar profil harus menyatakan ID ini dalam `requiresCapabilities`; Cognis kemudian memuat penyedia sebelum memasang rute SPA modul.

### Kapabilitas klien browser

`social:profileUiClient` dikontribusikan oleh penyedia Profil mandiri sebelum halaman yang bergantung dipasang dan menyediakan `getCurrentProfile()` agar modul browser memperoleh data profil melalui klien adaptor pemilik.

### Visibilitas Eksternal

`profile:applyExternalProfile` menerima nilai `profileVisibility` berupa `hidden`, `private`, `friends`, atau `community`. Nilai yang valid menjadi visibilitas profil tersimpan setelah pembuatan atau sinkronisasi profil; nilai yang tidak dikenal diabaikan.

### Ketersediaan tidak diketahui tanpa kesalahan pencarian

GET ketersediaan mengembalikan status unknown dengan respons berhasil untuk profil yang tidak ada atau dibatasi privasi. Kedua kasus memiliki bentuk respons yang sama dan tidak membaca preferensi manual atau status kalender. Aturan pemilik, pemblokiran, komunitas, teman, dan profil privat tetap berlaku; perubahan tetap memerlukan pemilik. Indikator avatar menampilkan tidak diketahui tanpa kesalahan tidak ditemukan berulang.

### Perubahan Sosial Offline

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/social/messages/technical).

### Inisialisasi Profil

Ketersediaan profil dimulai saat penyedia dipasang setelah klien buffer terdaftar dan gaya avatar siap. Impor penyedia tidak memulai callback kehadiran atau polling. Penonaktifan dan pemasangan gagal menghapus langganan, listener halaman, timer, dan cache ketersediaan; pekerjaan asinkron lama tidak memperbarui cakupan penyedia berikutnya. Ini mencegah `profile_client_unavailable` saat halaman administrasi dimuat secara online.

### Nama Profil Publik

Nama profil SSO publik tidak menyertakan ruang nama penyedia. Nama berawalan penyedia yang sudah ada diganti saat inisialisasi profil; benturan diberi akhiran acak. Nama yang sudah netral tetap stabil. ID akun, pemetaan identitas, kiriman, dan hubungan tidak berubah. URL profil publik berubah ketika namanya berubah. Metadata penyedia, email, dan riwayat login tetap berada di antarmuka Pengguna khusus administrator. Bagian detail tiap akun memakai gaya bagian yang dapat diciutkan dan mengambil metadata terotorisasi saat dibuka.

### Koneksi terputus mendadak

Polling kehadiran dan ketersediaan sementara berhenti saat Mode Luring dimulai dan dilanjutkan setelah koneksi pulih. Perubahan ketersediaan manual tetap menggunakan buffer luring yang ada.

### Hasil Antrean Tersimpan

Teks profil, postingan, dan unggahan gambar terbatas dalam antrean mempertahankan hasil selesai jika penyegaran tampilan gagal. Pembaruan teks memakai data server saat daring dan proyeksi antrean saat luring. Kegagalan pengiriman mempertahankan draf; kegagalan penyegaran berikutnya tidak mendorong pengiriman ganda.

### Ruang Kerja Luring

Akses Profil luring memerlukan cuplikan profil sendiri yang lengkap: teks, postingan, koneksi, preferensi, serta gambar avatar dan banner terbatas. Profil pengguna lain diblokir meskipun pernah tersimpan.

### Penyuntingan Profil dan Peran

Formulir profil memakai batas komponen untuk nama tampilan, biografi, lokasi, dan situs web. Sinkronisasi peran mencari nama publik profil dari ID akun yang tetap sebelum memperbarui peran dan visibilitas.

`profile:setRole(accountId, role)` → `Promise<void>`.

### Konten Seluler yang Terbaca

Pada ponsel dan tablet, identitas profil, penulisan pos, dan linimasa mendahului bagian sosial lain. Nama panjang, biografi, dan pos mengikuti lebar tersedia. Tampilan spanduk penuh menempatkan identitas di bawah gambar; kolom dan draf bertahan saat ukuran berubah.

Pratinjau menampilkan judul dan isi terkini sebelum diterbitkan. Kembali ke mode Tulis atau putar perangkat tanpa kehilangan draf.

Pos yang diterbitkan langsung tampil, dan penghapusan memperbarui linimasa tanpa memuat ulang halaman.

## Keamanan

### Privasi akun dan isolasi keyring

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/gateways/auth/technical).

## Referensi

### Salinan Preferensi Terkonfirmasi

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/ui/technical).

### Spesifikasi Teknis

| Halaman / bagian    | Panduan              | Akses          |
| ------------------- | -------------------- | -------------- |
| `^/profile(?:/\|$)` | Profil dan Postingan | Pengguna masuk |

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/social/messages/technical).

Identitas, postingan, dan tindakan akun menargetkan bagian profil hasil render, termasuk bagian postingan kosong. Sinyal halaman memiliki masa hidup panduan.

Posting memakai target daftar tersendiri meski editor terlihat. Sorotan aksi sosial mengikuti ukuran tombol; pratinjau editor dihilangkan pada profil lain.

Identitas dan aksi sosial muncul sebelum langkah posting dan pratinjau yang berurutan.

Panduan mengikuti identitas, tindakan sosial, kiriman, lalu pratinjau. Tata letak perangkat dan perilaku penerbitan dibahas dalam [Profil](/docs/adapters/social/profile).
