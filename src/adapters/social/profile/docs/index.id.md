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

Penyedia profil mandiri menyediakan `ui:profileAvatarRenderer`. Modul yang merender avatar profil harus menyatakan ID ini dalam `requiresCapabilities`; Cognis kemudian memuat penyedia sebelum memasang rute SPA modul.

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

## Ruang Kerja Luring

Akses Profil luring memerlukan cuplikan profil sendiri yang lengkap: teks, postingan, koneksi, preferensi, serta gambar avatar dan banner terbatas. Profil pengguna lain diblokir meskipun pernah tersimpan.

## Salinan Preferensi Terkonfirmasi

Penulisan preferensi Profile yang berhasil memperbarui salinan baca terbatas milik penyedia sebelum pembacaan berikutnya, termasuk pengiriman ulang dan penyimpanan khusus daring. Penggabungan preferensi luring mempertahankan bidang terkonfirmasi dan menerapkan perubahan yang masih tertunda. Pembacaan terlambat tidak menimpa salinan terkonfirmasi yang lebih baru; pergantian akun, penghentian penyedia, dan penulisan gagal tidak menerbitkan data usang.

## Penyuntingan Profil dan Peran

Formulir profil memakai batas komponen untuk nama tampilan, biografi, lokasi, dan situs web. Sinkronisasi peran mencari nama publik profil dari ID akun yang tetap sebelum memperbarui peran dan visibilitas.

`profile:setRole(accountId, role)` → `Promise<void>`.

## Penyimpanan dan Rute Bertipe

Tipe peran dan visibilitas profil sesuai dengan rekaman tersimpan, termasuk akun moderator serta visibilitas privat, teman, dan komunitas. Pembacaan preferensi menyediakan teks JSON tersimpan. Pengujian penyimpanan menggunakan simulasi basis data terstruktur milik profil dengan dukungan rollback.

## Cakupan Kredensial

Operasi akun memerlukan sesi akun yang terverifikasi. Operasi sumber daya bersama memverifikasi kredensial tamu secara eksplisit dan memeriksa kembali izin berbagi saat ini sebelum menerapkan izin sumber daya. Nama akun tidak menentukan jenis kredensial. Akses yang dicabut atau kedaluwarsa ditolak.

## Bukti penghapusan akun

Pada `deprovision-user` → `cleanup-dependencies`, komponen memperoleh `auth:deprovisionOutcome` versi 1 melalui `system:contracts` dan memanggil `deletedAccount(input, stageResults)` dengan objek asli dari pemanggilan tersebut. Hanya bukti milik Auth yang mengonfirmasi penghapusan tersimpan yang mengizinkan penghapusan profil, aktivitas sosial, dan preferensi akun. Hasil salinan, hasil penonaktifan/pengarsipan, serta bukti yang hilang atau tidak tersedia tidak mengizinkan pembersihan ini.

Pasang bersama penyedia Auth 2.2.12 bawaan atau alternatif yang menerapkan kontrak berversi ini; hasil alur publik yang dapat diubah bukan pengganti. Pembersihan menggunakan bukti penghapusan yang sudah tersimpan, bukan melakukan otorisasi ulang setelah penghapusan. Mutasi eksternal yang sudah dimulai dapat selesai sebagian sebelum kegagalan berikutnya; pembatalan lintas komponen tidak dijamin. Kontrol antarmuka dan tutorial biasa tidak berubah.

Migrasi ini melindungi konsumen pembersihan bawaan. Sebelum mengaktifkan penghapusan akun dalam penerapan, perbarui atau nonaktifkan hook pembersihan eksternal yang masih memercayai hasil alur publik yang dapat diubah.

## Ulangi Edit Profil

Edit Profil mempertahankan isian persis seperti yang dimasukkan hingga server mengonfirmasi penyimpanan atau penyangga offline terikat akun menerimanya secara tahan lama. Permintaan yang ditolak, respons yang tidak terbaca, atau kegagalan penulisan penyangga menampilkan kesalahan dan mengaktifkan Simpan kembali tanpa membuang draf. Klik Simpan dan Enter berulang hanya mengirim satu permintaan tertunda; kolom dinonaktifkan sementara selama proses berlangsung. Kegagalan pembaruan kartu, bilah navigasi, atau cache nama tampilan tidak mengubah penyimpanan yang telah diterima menjadi kegagalan.

Buang, Tutup, Escape, dan latar dialog menggunakan konfirmasi perubahan belum tersimpan yang sama. Batal dalam konfirmasi mempertahankan formulir. Konfirmasi Buang menutupnya dan mengabaikan hasil terlambat; menutup tidak membatalkan permintaan yang sudah dikirim, sebagaimana dijelaskan notifikasi informasi. Hasil penyimpanan menunggu keputusan pembuangan yang terbuka sebelum memperbarui halaman. Navigasi, pemuatan halaman baru, pergantian akun atau sesi, dan penutupan dialog membatalkan kewenangan hasil editor lama. Pembukaan ulang memakai profil terakhir yang diterima, dengan pengenal kolom dan label unik bahkan selama animasi penutupan dialog lama. Draf yang belum dikirim tidak disimpan melewati navigasi atau muat ulang.

Editor milik Profil menggunakan alur ctx `social:profile:request` yang ada serta mempertahankan gerbang validasi kolom, kepemilikan fokus dialog bersama, dan kebijakan pengiriman offline. Uji DOM sintetis menjalankan pemuatan halaman, dialog, pembuat formulir, dan alur permintaan terdaftar yang sebenarnya dengan transportasi serta penyimpanan terkendali. Uji ini tidak membuktikan tata letak peramban nyata atau perilaku server dan basis data.

## Pemulihan Pembacaan Avatar

Bilah navigasi dan pratinjau profil mempertahankan gambar yang tidak berubah saat pembaruan lain berlangsung. Kegagalan jaringan sementara serta HTTP 408, 425, 429 atau 5xx tidak menonaktifkan kunci secara permanen. Pembaruan atau pembukaan berikutnya dapat mencoba lagi; tidak ada pewaktu percobaan avatar. Penghapusan terkonfirmasi (404/410), penolakan akses (401/403), pembatalan cache eksplisit, perubahan akun/token, dan penghapusan penyedia menghapus gambar terkait. Tampilan utama halaman profil menggunakan konsumen terpisah dan tidak diubah oleh kontrak ini.

Penyedia mandiri memiliki `ui:profileAvatarRenderer` selama masa aktifnya. `fetch(key)` tetap mengembalikan URL atau null; `hydrate(container, { signal })` menerima pembatalan opsional, dan `invalidate(key)` membersihkan satu kunci (tanpa kunci berarti semuanya). Cache dibatasi menurut akun, token akses, dan masa aktif penyedia, menggabungkan permintaan bersamaan, serta menampung paling banyak 128 kunci. Hasil berhasil dan hasil negatif terkonfirmasi diperiksa ulang sesuai kebutuhan setelah 60 detik. Digest konten mempertahankan URL untuk bita yang sama dan membuat URL baru untuk bita yang berubah. Pengeluaran entri, pembatalan cache, dan penghentian melepaskan URL objek. Elemen yang dilepas tidak disimpan.

Penyedia bilah navigasi mengembalikan `avatarState` (`available`, `missing`, `denied`, `retryable`, `invalid` atau `stale`), `avatarKey` opsional, dan `avatarBlobUrl` hanya jika pembacaan berhasil. `onAvatarError` mengeluarkan URL tertentu; `signal` menunjukkan berakhirnya masa aktif penyedia. Hanya hasil yang secara eksplisit dapat dicoba ulang boleh mempertahankan gambar untuk akun, token, dan penyedia yang sama dengan kunci yang tetap atau belum diketahui. Status tidak dikenal atau tidak diberikan tidak mengizinkan gambar; otorisasi yang belum pasti tidak pernah dianggap berhasil. Kirim konsumen host ini bersama Profile 3.0.19. Host baru dengan penyedia lama menampilkan inisial hingga penyedia yang sesuai tersedia.

Tutorial identitas profil tetap menjelaskan tautan profil dan pratinjaunya; kontrol, alur, dan identitas penyelesaian tidak berubah.

Penggambar juga menyediakan penanda kesiapan `available` yang akurat bagi penyedia tampilan yang bergantung padanya, serta mengirim peristiwa miliknya `cognis:profile-avatar-renderer-changed` saat dipasang dan dicabut. Penanda menjadi salah saat cakupan dibatalkan, sebelum kapabilitas dihapus. Kegagalan pemasangan dan pengaktifan kembali memakai jalur pemberitahuan yang sama. Konsumen tidak boleh menyimpulkan kesiapan hanya dari keberadaan dalam registri.
