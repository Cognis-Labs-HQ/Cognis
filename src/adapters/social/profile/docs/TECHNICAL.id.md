# Referensi Teknis

Antarmuka publik dan aturan operasional Profil dan Kiriman.

## Antarmuka

Profil dan Kiriman terintegrasi melalui gerbang pemilik; manifesnya mengidentifikasi komponen dan dependensi yang diperlukan.

## Konfigurasi

Konfigurasi disediakan melalui gerbang pemilik. Profil dan Kiriman tidak menyatakan konfigurasi tambahan dalam manifesnya.

## Perilaku

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

Penyedia profil mandiri menyediakan `ui:profileAvatarRenderer`. Modul yang merender avatar profil harus menyatakan ID ini dalam `requiresCapabilities`; Cognis kemudian memuat penyedia sebelum memasang rute SPA modul.

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

### Penyimpanan dan Rute Bertipe

Tipe peran dan visibilitas profil sesuai dengan rekaman tersimpan, termasuk akun moderator serta visibilitas privat, teman, dan komunitas. Pembacaan preferensi menyediakan teks JSON tersimpan. Pengujian penyimpanan menggunakan simulasi basis data terstruktur milik profil dengan dukungan rollback.

### Cakupan Kredensial

Perilaku bersama: [Auth](/docs/gateways/auth/technical).

### Bukti penghapusan akun

Pada `deprovision-user` → `cleanup-dependencies`, komponen memperoleh `auth:deprovisionOutcome` versi 1 melalui `system:contracts` dan memanggil `deletedAccount(input, stageResults)` dengan objek asli dari pemanggilan tersebut. Hanya bukti milik Auth yang mengonfirmasi penghapusan tersimpan yang mengizinkan penghapusan profil, aktivitas sosial, dan preferensi akun. Hasil salinan, hasil penonaktifan/pengarsipan, serta bukti yang hilang atau tidak tersedia tidak mengizinkan pembersihan ini.

Migrasi ini melindungi konsumen pembersihan bawaan. Sebelum mengaktifkan penghapusan akun dalam penerapan, perbarui atau nonaktifkan hook pembersihan eksternal yang masih memercayai hasil alur publik yang dapat diubah.

### Ulangi Edit Profil

Edit Profil mempertahankan isian persis seperti yang dimasukkan hingga server mengonfirmasi penyimpanan atau penyangga offline terikat akun menerimanya secara tahan lama. Permintaan yang ditolak, respons yang tidak terbaca, atau kegagalan penulisan penyangga menampilkan kesalahan dan mengaktifkan Simpan kembali tanpa membuang draf. Klik Simpan dan Enter berulang hanya mengirim satu permintaan tertunda; kolom dinonaktifkan sementara selama proses berlangsung. Kegagalan pembaruan kartu, bilah navigasi, atau cache nama tampilan tidak mengubah penyimpanan yang telah diterima menjadi kegagalan.

Buang, Tutup, Escape, dan latar dialog menggunakan konfirmasi perubahan belum tersimpan yang sama. Batal dalam konfirmasi mempertahankan formulir. Konfirmasi Buang menutupnya dan mengabaikan hasil terlambat; menutup tidak membatalkan permintaan yang sudah dikirim, sebagaimana dijelaskan notifikasi informasi. Hasil penyimpanan menunggu keputusan pembuangan yang terbuka sebelum memperbarui halaman. Navigasi, pemuatan halaman baru, pergantian akun atau sesi, dan penutupan dialog membatalkan kewenangan hasil editor lama. Pembukaan ulang memakai profil terakhir yang diterima, dengan pengenal kolom dan label unik bahkan selama animasi penutupan dialog lama. Draf yang belum dikirim tidak disimpan melewati navigasi atau muat ulang.

Editor milik Profil menggunakan alur ctx `social:profile:request` yang ada serta mempertahankan gerbang validasi kolom, kepemilikan fokus dialog bersama, dan kebijakan pengiriman offline. Uji DOM sintetis menjalankan pemuatan halaman, dialog, pembuat formulir, dan alur permintaan terdaftar yang sebenarnya dengan transportasi serta penyimpanan terkendali. Uji ini tidak membuktikan tata letak peramban nyata atau perilaku server dan basis data.

### Pemulihan Pembacaan Avatar

Bilah navigasi dan pratinjau profil mempertahankan gambar yang tidak berubah saat pembaruan lain berlangsung. Kegagalan jaringan sementara serta HTTP 408, 425, 429 atau 5xx tidak menonaktifkan kunci secara permanen. Pembaruan atau pembukaan berikutnya dapat mencoba lagi; tidak ada pewaktu percobaan avatar. Penghapusan terkonfirmasi (404/410), penolakan akses (401/403), pembatalan cache eksplisit, perubahan akun/token, dan penghapusan penyedia menghapus gambar terkait. Bagian kepala profil memakai siklus hidup media milik halaman yang dijelaskan di bawah.

Penyedia mandiri memiliki `ui:profileAvatarRenderer` selama masa aktifnya. `fetch(key)` tetap mengembalikan URL atau null; `hydrate(container, { signal })` menerima pembatalan opsional, dan `invalidate(key)` membersihkan satu kunci (tanpa kunci berarti semuanya). Cache dibatasi menurut akun, token akses, dan masa aktif penyedia, menggabungkan permintaan bersamaan, serta menampung paling banyak 128 kunci. Hasil berhasil dan hasil negatif terkonfirmasi diperiksa ulang sesuai kebutuhan setelah 60 detik. Digest konten mempertahankan URL untuk bita yang sama dan membuat URL baru untuk bita yang berubah. Pengeluaran entri, pembatalan cache, dan penghentian melepaskan URL objek. Elemen yang dilepas tidak disimpan.

Penyedia bilah navigasi mengembalikan `avatarState` (`available`, `missing`, `denied`, `retryable`, `invalid`, atau `stale`), `avatarKey` opsional, `profileAvailable`, dan callback sinkron wajib `renderContent(previousContent, { retainImage })`. Callback mengembalikan elemen DOM lokal atau null, bukan promise. Kontennya tidak memiliki tautan atau tombol luar. Host memeriksa akun, token, generasi, keterhubungan elemen, dan masa aktif penyedia sebelum serta sesudah pemanggilan, sambil mempertahankan tombol menu dan indikator ketersediaan. Hanya hasil yang secara eksplisit dapat dicoba ulang boleh mempertahankan gambar dengan identitas yang sama dan kunci tetap atau belum diketahui. Profile mengelola kesalahan gambar, metadata pengganti dengan nama terkini, dan penghapusan cache. Sinyal penyedia langsung mencabut kontennya. Terbitkan aset kerangka yang sesuai bersama Profile 4.0.0: callback wajib ini merupakan perubahan kontrak penyedia navigasi yang tidak kompatibel. Kontrak yang hilang atau tidak valid hanya menghasilkan penanda umum tidak tersedia.

Tutorial identitas profil tetap menjelaskan tautan profil dan pratinjaunya; kontrol, alur, dan identitas penyelesaian tidak berubah.

Penggambar juga menyediakan penanda kesiapan `available` yang akurat bagi penyedia tampilan yang bergantung padanya, serta mengirim peristiwa miliknya `cognis:profile-avatar-renderer-changed` saat dipasang dan dicabut. Penanda menjadi salah saat cakupan dibatalkan, sebelum kapabilitas dihapus. Kegagalan pemasangan dan pengaktifan kembali memakai jalur pemberitahuan yang sama. Konsumen tidak boleh menyimpulkan kesiapan hanya dari keberadaan dalam registri.

### Gambar Profil

Halaman profil mempertahankan elemen avatar dan banner yang tidak berubah saat jumlah pengikut, detail profil, dan kartu lain diperbarui. Sinkronisasi eksplisit memeriksa media kembali dan mempertahankan gambar saat ini untuk profil, sesi, dan kunci yang sama ketika kesalahan jaringan atau HTTP 408, 425, 429, atau 5xx menghalangi pembacaan. Pesan kesalahan meminta pengguna mencoba lagi; pembaruan tersebut tidak dilaporkan berhasil. Percobaan berhasil dengan data identik mempertahankan URL yang sama, sedangkan data baru menggantinya.

Perubahan profil atau kunci gambar, kunci kosong yang dipastikan, penghapusan yang dikonfirmasi, atau media yang ditolak/tidak tersedia (401/403/404/410) menghapus gambar sebelumnya. Menghapus avatar tidak menghapus banner, dan sebaliknya. Navigasi, pemasangan ulang, perubahan akun/token/penyedia, dan pelepasan penyedia membatalkan pekerjaan lama serta melepaskan URL objeknya. Data profil, isi respons, pembacaan gambar, hasil pemotongan, unggahan, penghapusan, dan pembaruan pengikut yang terlambat tidak dapat mengubah halaman yang lebih baru. Pemilih berkas dimiliki halaman yang membukanya.

Klien Profile menerbitkan `social:profilePageSignal` sesuai masa aktifnya bersama `social:profileRequest`. Bagian kepala profil memakai alur terdaftar `social:profile:request` dan `social:profileMedia:read`, kepemilikan terbatas untuk dua gambar, serta pembaca ringkasan kriptografis Profile bersama. Hanya elemen gambar yang direkonsiliasi; bagian kepala lainnya tetap diperbarui. Kontrak composer, kerangka halaman, bilah navigasi, otorisasi pratinjau, dan editor draf tetap berlaku. Terbitkan halaman dan penyedia Profile 4.0.0 bersama-sama.

Uji regresi memakai fixture jsdom statis, ekspor halaman sebenarnya, serta siklus hidup permintaan dan penyedia terdaftar. Uji memverifikasi identitas elemen, pelepasan URL, pemulihan kegagalan, dan penyelesaian tidak berurutan. Uji tidak membuktikan tampilan atau dekode gambar di peramban asli maupun pemicu laporan produksi sebelumnya.

Pada profil Anda sendiri, Edit Profil membuka detail Anda. Jika penyimpanan gagal, perubahan tetap tersedia untuk diperbaiki dan dicoba kembali.

Foto profil tetap terlihat saat jumlah dan detail diperbarui. Buka kembali profil untuk mencoba ulang pembaruan gambar yang gagal; penghapusan yang dikonfirmasi hanya menghapus gambar terpilih. Langkah identitas mempertahankan target, urutan, dan identitas penyelesaiannya.

Inisial pada navigasi, pratinjau, dan profil memakai aturan nama dan warna yang sama. Avatar pratinjau membuka profil tersebut. Perubahan nama juga memperbarui inisial setelah kesalahan gambar. Kontrol identitas dan avatar mempertahankan target tutorial, urutan langkah, dan ID penyelesaiannya.

Pratinjau interaktif adalah dialog nonmodal bernama. Mengarahkan penunjuk tidak memindahkan fokus keyboard; kartu yang sedang fokus tetap terbuka saat penunjuk menjauh. Escape menutupnya dan mengembalikan fokus ke pemicu hanya jika fokus sebelumnya berada di dalam kartu.

### Konfirmasi Tindakan Profil

Hapus, Berhenti Mengikuti, dan Blokir meminta konfirmasi. Batal mempertahankan postingan atau hubungan. Langkah postingan dan tindakan sosial menjelaskan pilihan ini dalam semua bahasa yang didukung. Target, urutan, progres, dan ID penyelesaiannya tetap sama.

### Konten Avatar Seragam

`ui:profileAvatarRenderer.getPresentation(profile)` menghasilkan `label`, `initials`, `colorSeed`, dan `color` dari `displayName || handle` yang sudah diotorisasi. `buildContent({ profile, size, avatarKey, blobUrl, imageClass, imageAlt })` membuat markup bagian dalam yang tidak interaktif. Ukuran eksplisitnya adalah `small` (32px, 0.7rem), `medium` (48px, 1.05rem), dan `large` (80px, 1.75rem); ukuran tak dikenal ditolak. CSS Profile mengelola geometri, tipografi, warna, garis tepi, dan padding. Tautan luar, tombol menu atau unggah, posisi, dan ketersediaan tetap dikelola pemanggil. URL gambar dan data identitas harus sudah diotorisasi; API tampilan ini tidak mengambil data atau memberikan akses.

Bilah navigasi, pratinjau profil, dan kepala profil memakai aturan yang sama. Gambar valid yang tidak berubah tetap terpasang setelah pembaruan nama; kesalahan dekode berikutnya menampilkan inisial nama terkini. Avatar pratinjau menautkan profil dengan nama aksesibel terkini. Fokus atau arah penunjuk tidak memulai ulang pratinjau. Media kepala profil tetap dimiliki halaman dan tidak memakai cache avatar.

Arti `buildMarkup`, `colorSeed`, kelas khusus, ketersediaan, pemuatan gambar, dan tautan profil tidak berubah. Messages, pratinjau Settings, Share, Library, dan Calendar tetap dapat memakai kontrak tersebut; rilis ini tidak memigrasikan tampilannya atau modul eksternal. Batas dependensi teruji Messages dan Calendar meningkat ke Profile 4.0.0. Batas modul eksternal belum diverifikasi dan perlu pengujian pendamping sebelum peningkatan versi. Pengujian DOM sintetis mencakup urutan gaya pada kedua tema, bukan penggambaran atau geometri tata letak browser native.

### Konfirmasi Tindakan Profil

Dialog konfirmasi Profil memakai Batal netral. Hapus, Berhenti Mengikuti, dan Blokir bersifat destruktif; Buka Blokir bersifat netral. Tindakan berulang untuk postingan atau hubungan yang sama berbagi keputusan dan permintaan tertunda. Batal, Tutup, dan Escape tidak mengubah apa pun. Meninggalkan halaman, mengganti akun atau sesi, atau menghapus penyedia membatalkan keputusan tertunda dan kontrol lama.

Tindakan yang ditolak atau diketahui belum terkirim dapat dikonfirmasi lagi. Bila pengiriman tidak pasti, halaman saat ini tidak mengirim ulang: buka kembali profil untuk memeriksa hasilnya. Respons server yang berhasil atau penerimaan luring yang tersimpan memperbarui tampilan. Kegagalan penyegaran berikutnya melaporkan bahwa perubahan telah diterima, bukan kegagalan penulisan. Penyegaran koneksi memperbarui daftar yang berhasil dimuat dan mempertahankan daftar sebelumnya saat gagal.

Kontrol ini memakai alur social:profile:request dan masa aktif halaman yang ada. Pengujian DOM sintetis menjalankan pemasangan halaman, popup, tahap permintaan terdaftar, dan transportasi terkendali yang sebenarnya. Pengujian ini tidak membuktikan tata letak browser asli atau perilaku server dan basis data langsung.

### Ukuran Konten Ringkas

Profile 4.1.0 menambahkan `tiny` (1.22rem, inisial 0.5rem) dan `compact` (1.65rem, inisial 0.6rem) pada `buildContent`. Daftar tetap `contentSizes` mengumumkan kelima nama ukuran. Ukuran ini adalah ukuran gambar, bukan sasaran penunjuk. Pemanggil mengelola sasaran yang dapat diakses secara terpisah, jarak, dan cincin pemisah luar. Arti `small`, `medium`, `large`, dan opsi `buildMarkup` tetap sama. Konsumen ukuran baru harus memeriksa daftar yang diumumkan serta merilis JavaScript dan CSS Profile yang sesuai. Messages 2.9.0 memakai kedua ukuran; rilis asetnya bersama-sama. Tutorial Profile tetap menggunakan kontrol dan ukuran avatar saat ini.

## Keamanan

### Privasi akun dan isolasi keyring

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/gateways/auth/technical).

## Referensi

### Salinan Preferensi Terkonfirmasi

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Spesifikasi Teknis

| Halaman / bagian    | Panduan              | Akses          |
| ------------------- | -------------------- | -------------- |
| `^/profile(?:/\|$)` | Profil dan Postingan | Pengguna masuk |

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/social/messages/technical).

Identitas, postingan, dan tindakan akun menargetkan bagian profil hasil render, termasuk bagian postingan kosong. Sinyal halaman memiliki masa hidup panduan.

Posting memakai target daftar tersendiri meski editor terlihat. Sorotan aksi sosial mengikuti ukuran tombol; pratinjau editor dihilangkan pada profil lain.

Identitas dan aksi sosial muncul sebelum langkah posting dan pratinjau yang berurutan.

Panduan mengikuti identitas, tindakan sosial, kiriman, lalu pratinjau. Tata letak perangkat dan perilaku penerbitan dibahas dalam [Profil](/docs/adapters/social/profile).
