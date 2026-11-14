# Referensi Teknis

Antarmuka publik dan aturan operasional Pesan.

## Antarmuka

### Endpoint

Semua endpoint berada di bawah `/api/v1/social/messages`. Autentikasi wajib, kecuali
`GET /messages/ping`.

| Metode | Path                                                | Deskripsi                                                                      |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| GET    | `/messages/ping`                                    | Cek ketersediaan adapter (`{ ready: true }`).                                  |
| GET    | `/messages/users/lookup?q=…`                        | Cari profil penerima pesan.                                                    |
| GET    | `/messages/rooms`                                   | Daftar ruang pengguna saat ini dengan pratinjau dan jumlah belum dibaca.       |
| POST   | `/messages/rooms`                                   | Buat DM/grup; DM bisa dimulai sebagai permintaan tertunda.                     |
| GET    | `/messages/requests`                                | Daftar permintaan pesan masuk yang masih tertunda.                             |
| POST   | `/messages/requests/:id/approve`                    | Setujui permintaan dan buka/buat ruang DM.                                     |
| POST   | `/messages/requests/:id/reject`                     | Tolak permintaan dan keluarkan penerima dari ruang DM yang sempat disiapkan.   |
| GET    | `/messages/rooms/:id`                               | Metadata ruang dan anggota.                                                    |
| GET    | `/messages/rooms/:id/messages?before&limit`         | Riwayat berpaginasi (penerima permintaan masuk tetap kosong sampai disetujui). |
| POST   | `/messages/rooms/:id/messages`                      | Tambah pesan (`ciphertext`, `iv`, opsional `authTag`).                         |
| POST   | `/messages/rooms/:id/messages/:messageId/reactions` | Toggle reaksi emoji pada pesan.                                                |
| POST   | `/messages/rooms/:id/read`                          | Tandai ruang sudah dibaca hingga saat ini.                                     |
| GET    | `/messages/rooms/:id/typing`                        | Daftar pengguna yang sedang mengetik (kecuali peminta).                        |
| POST   | `/messages/rooms/:id/typing`                        | Perbarui status mengetik anggota saat ini.                                     |
| POST   | `/messages/rooms/:id/members`                       | Tambah anggota (khusus owner/admin).                                           |
| DELETE | `/messages/rooms/:id/members/:handle`               | Hapus anggota (keluar sendiri atau dikeluarkan owner).                         |

## Konfigurasi

Ruang mendeklarasikan peserta dan keadaan enkripsi/akses. Templat serta draf terikat akun; luring perlu aset dan riwayat tersimpan.

## Perilaku

### Klien browser Pesan

Ruang grup baru menyelesaikan pembuatan kunci dan seluruh penambahan anggota sebelum mengikat sumber integrasi. Kegagalan inisialisasi atau pengikatan menghapus ruang parsial; kegagalan pembersihan dicatat dan diteruskan. Ruang yang sudah ada dan eksklusivitas sumber tetap berperilaku sama.

Klien browser Pesan memungkinkan modul mencantumkan pesan ruang, membuka ruang privat, dan mengirim pesan melalui kontrak API terautentikasi milik adaptor Social Messages.

### Spesifikasi teknis

Klien mengembalikan `Response` asli agar pemanggil menangani status dan payload. Klien mengodekan ID ruang untuk URI, mempertahankan pengetahuan rute di adaptor pemilik, meneruskan token akses opsional dan penekanan penolakan akses, mengirim penulisan sebagai JSON, dan hanya tersedia ketika gateway Social serta adaptor Messages aktif.

Kapabilitas publik `social:messages:deleteChatroom` menerima ID ruang dan ID akun pelaku. Kapabilitas ini menghapus ruang beserta data terkait secara permanen jika pelaku membuat ruang tersebut atau menjadi satu-satunya peserta yang tersisa.

Adaptor juga menerbitkan `social:messages:resolveRoomMembership`. Dengan ID ruang dan ID akun pemohon, capability ini hanya mengizinkan anggota ruang aktif dan mengembalikan ID akun anggota aktif. Penyedia memakai batas ini alih-alih membaca persistensi Messages secara langsung.

Pemilih Ruang Baru memakai parameter `category: "user"` dan `typeFilter: "user"` dari popup pencarian bersama, sama seperti konsumen khusus pengguna lain seperti Jitsi Meet, sehingga hanya hasil pengguna yang ditawarkan untuk membuat percakapan.

Panggilan masuk ditampilkan sebagai bilah tindakan kontribusi tepat di bawah tajuk utas, dengan label di kiri serta tindakan SVG Jawab dan Tolak milik penyedia di kanan. Peristiwa panggilan historis tetap menjadi catatan lini masa biasa, bukan prompt interaktif.

Adapter menyediakan capability generik `social:messages:appendRoomEvent` bagi komponen yang perlu mencatat peristiwa linimasa dalam ruang. Payload hanya menyimpan metadata peristiwa yang netral; komponen pemilik tetap memiliki nama dan bidang peristiwa khusus domainnya. Flow browser `messages:formatRoomEvent` memungkinkan komponen tersebut menyediakan tampilan terlokalisasi tanpa menambahkan teks atau aturan render ke Messages.

### Percakapan milik sumber daya

`social:messages:resolveGroupChatUrl` menerima `usernames` serta `title`, `createdByAccountId`, `allowSingleMember`, `reuseExisting` dan `roomId` opsional. Default memakai ulang grup dengan anggota persis sama. `reuseExisting: false` membuat percakapan tersendiri; `roomId` tersimpan dipertahankan meski anggota berubah, dan diganti jika sudah terhapus. Ruang baru mendapat kunci dan anggota sendiri; ruang yang dipakai ulang mempertahankan judulnya. Opsi netral ini mendukung sumber daya independen, termasuk rapat.

### Pengikatan sumber integrasi eksklusif

`social:messages:sourceBinding` menyediakan `bind` dan `release` dengan `{roomId, actorAccountId, sourceType, sourceId}`. Resolusi grup juga menerima `source: {sourceType, sourceId}`. Anggota ruang yang berwenang dapat mengikat ruang yang belum terikat; sumber lain menerima `source_conflict` tanpa menimpa pengikatan. Klaim ulang oleh sumber yang sama bersifat idempoten. Pembaruan bersyarat menentukan pemenang klaim bersamaan, dan pelepasan hanya menghapus sumber yang cocok. Resolusi grup dan pengikatan menjalankan alur ctx terdaftar.

Penyedia browser memperoleh `ui:scopedActions` dari ctx terbatasnya. Pemanggilan dengan `(ctx, moduleId, actions)` mendaftarkan alur yang dapat dijalankan untuk setiap tindakan bernama dan mengembalikan fungsi tindakan. Gunakan fungsi ini untuk membaca dan mengubah administrasi; host membuang alur dan menangani penolakan fungsi usang setelah penghentian. Hak administrator berasal dari peran terkini akun aktif, bukan bidang peran yang diberikan pemanggil.

### Perubahan Sosial Offline

Penyedia Profile dan Messages mendaftarkan tindakan HTTP melalui ctx sesuai masa hidupnya. Profil, pos, daftar ruang, dan percakapan terenkripsi yang pernah dimuat tersedia di tab terverifikasi. Teks profil, ketersediaan, status ikuti/blokir, tata letak banner, pembuatan/penghapusan pos, pesan terenkripsi di ruang lama, status akhir reaksi, dan tanda baca memakai buffer offline per akun. Suntingan online berikutnya menunggu antrean pemilik yang sama. Pergantian akun atau sesi selama persiapan atau menunggu buffer membatalkan tindakan. Pesan dan pos memakai UUID `operationId` stabil; pengulangan berbeda atau lintas akun ditolak. Pengiriman ulang pesan tidak menggandakan notifikasi. Tanda baca mempertahankan waktu baca awal.

Percakapan dienkripsi sebelum masuk buffer: teks asli, kunci ruang, dan kredensial tidak masuk antrean. Teks profil dan isi pos disimpan di penyimpanan browser akun saat ini. Avatar/banner hingga 350.000 byte biner berbagi antrean 1 MB/1.000 catatan/tujuh hari; gambar lebih besar memerlukan koneksi. Buffer penuh menampilkan kesalahan terlokalisasi; draf pesan dan pos baru dikosongkan setelah berhasil disimpan secara permanen. Batas berlaku untuk seluruh buffer.

Perubahan tetap tertunda sampai dikonfirmasi server. Pesan menampilkan status antrean; tindakan profil, pos, dan media menampilkan toast antrean standar. Menutup atau memuat ulang browser memicu konfirmasi perubahan belum tersimpan selama akun memiliki buffer, termasuk catatan dari penyedia nonaktif. Peringatan hilang setelah konfirmasi atau pembersihan akun. Browser menentukan teks konfirmasi dan mungkin memerlukan interaksi pengguna. Catatan tetap bertahan setelah muat ulang; peringatan tidak membuangnya.

Konten sosial tersimpan tetap hanya di tab dan memerlukan persetujuan. Kunjungan pertama, muat ulang privat offline, pembuatan ruang, pengelolaan anggota/kunci, panggilan, dan unggahan besar memerlukan koneksi. Status mengetik dan kehadiran bersifat sementara dan tidak dikirim ulang. Otorisasi server terkini diperiksa saat pengiriman; cache offline tidak dapat mengetahui pencabutan akses jarak jauh. Persetujuan ToS tetap wajib sebelum akses dan pengiriman.

### Navigasi luring

Messages hanya mengaktifkan navigasi luring jika akun dan sesi saat ini memiliki daftar ruang tersimpan serta aset halaman yang siap. Percakapan tetap memerlukan pesan terenkripsi tersimpan dan keyring yang terbuka; percakapan yang belum tersimpan memerlukan koneksi. Penggambaran ulang penyedia mempertahankan status nonaktif tautan luring.

### Hasil Antrean Tersimpan

Pesan terenkripsi hanya menghapus draf setelah pengakuan server atau penyimpanan dalam antrean. Kegagalan penyegaran ruang berikutnya tidak menandai bukti tersebut sebagai pengiriman gagal. Pesan tertunda mempertahankan identitas operasi yang stabil untuk pengiriman ulang.

### Ketersediaan Luring

Messages menyiapkan daftar ruang, terjemahan, templat panel samping, dan katalog emoji setelah masuk terverifikasi. Dengan aset halaman yang disiapkan dan daftar ruang tersimpan, halaman dapat dibuka luring sebelum kunjungan daring pertama. Hanya ruang dengan metadata dan percakapan tersimpan yang terbuka otomatis; memilih percakapan yang belum tersimpan menampilkan pemberitahuan informasi khusus. Pendaftaran ruang dan ketersediaan aset tetap terjaga saat impor berulang melalui bundel maupun berkas langsung.

### Penggunaan Emoji Terpisah

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Konten Seluler yang Terbaca

Buka percakapan melalui tombol panel sudut ganda bersama di kiri atas. Judul ruang memakai dua baris terlihat sambil mempertahankan judul lengkap yang aksesibel. Riwayat pesan memperoleh lebih banyak ruang dan draf bertahan saat orientasi berubah.

### Bilah Samping Ringkas

Pesan menampilkan Ruang Baru, percakapan, dan Templat berdekatan dengan menggunakan seluruh lebar bilah samping. Daftar kosong dan pendek tidak lagi direntangkan setinggi panel. Daftar ruang dan templat yang panjang memakai satu area gulir Composer.

### Ringkasan

Adapter pesan menyediakan percakapan privat 1:1 dan grup di atas Social
Gateway. Ruang obrolan, keanggotaan, dan isi pesan disimpan di database. Isi
pesan dienkripsi di sisi klien dengan kunci per-ruang, lalu dibungkus lagi saat
tersimpan menggunakan `DATA_ENCRYPTION_KEY`.

### Kelayakan

Pengguna **A** bisa membuka DM dengan **B** jika:

1. tidak ada pemblokiran dua arah,
2. kedua profil terlihat,
3. keduanya saling mengikuti.

Jika hanya syarat (3) yang tidak terpenuhi, `POST /messages/rooms` dapat
mengembalikan `202` dengan status permintaan tertunda.

Riwayat permintaan yang pernah disetujui dapat melewati syarat saling mengikuti,
tetapi tetap tidak boleh melewati aturan blokir atau visibilitas.

### Model Ancaman

- **Transit**: Dilindungi oleh TLS.
- **Database**: Isi pesan dibungkus dua kali (enkripsi klien + pembungkusan
  at-rest server dengan `DATA_ENCRYPTION_KEY`).
- **Bukan E2E penuh**: Jika server kompromi, konten bisa didekripsi.
- **Metadata**: Keanggotaan, waktu kirim, dan panjang ciphertext tetap terlihat
  oleh operator.

### Integrasi Notifikasi

Saat pesan baru ditambahkan, adapter mengirim amplop notifikasi per anggota lain
dengan kategori `messages` dan `actionUrl` `/messages/<room-id>` ke Notify
Gateway. Pengaturan mute per ruang dan preferensi kategori dapat menonaktifkan
pengiriman.

### Peristiwa linimasa keanggotaan ruang

Perubahan keanggotaan disimpan secara atomik bersama entri pasif `member_joined` dan `member_left` di linimasa `chat_messages` ruang. Entri ini memakai jenis konten `application/vnd.cognis.room-event+json`; pemanggil mengubah keanggotaan tanpa membuat ruang kedua atau menerbitkan peristiwa secara terpisah. Resolusi obrolan rapat menerapkan operasi yang sama untuk setiap peserta yang berhasil ditemukan.

Permintaan pesan tidak membuat ruang obrolan. Ruang pesan langsung, kunci, keanggotaan, dan peristiwa bergabung awal baru dibuat saat penerima menyetujui permintaan, sehingga ruang yang hanya berisi permintaan tidak muncul dalam daftar ruang peserta.

### Pemuatan keyring kontekstual

Halaman Pesan menyelesaikan kunci ruang melalui lingkup keyring `Social Messages`. Membuka halaman meminta akses untuk memuat rahasia obrolan yang ada; pembatalan buka kunci tidak dilanjutkan dengan permintaan kedua untuk menyimpan kunci kiriman. Saat buka kunci berhasil atau dipulihkan setelah muat ulang, halaman memperbarui pratinjau daftar ruang dan percakapan aktif agar placeholder terenkripsi segera diganti.

### Penyimpanan dan Rute Bertipe

Deklarasi peran dan visibilitas profil sosial kini sesuai dengan rekaman tersimpan. Rute pesan dan profil tetap mempertahankan pemeriksaan izin, sementara callback, notifikasi, dan perintah basis data menggunakan kontrak eksplisit. Resolusi sesi tamu yang tidak tersedia tetap menggagalkan proses sebelum profil tamu dibaca.

### Cakupan Kredensial

Operasi akun memerlukan sesi akun yang terverifikasi. Operasi sumber daya bersama memverifikasi kredensial tamu secara eksplisit dan memeriksa kembali izin berbagi saat ini sebelum menerapkan izin sumber daya. Nama akun tidak menentukan jenis kredensial. Akses yang dicabut atau kedaluwarsa ditolak.

## Keamanan

Kelayakan ruang, keanggotaan, dan pembacaan pesan diperiksa terpisah. Ruang terenkripsi bergantung pada kunci klien; model ancaman membedakan konten dan metadata perutean.

## Referensi

### Spesifikasi Teknis

| Halaman / bagian     | Panduan       | Akses          |
| -------------------- | ------------- | -------------- |
| `^/messages(?:/\|$)` | Panduan Pesan | Pengguna masuk |

Panduan didaftarkan melalui kapabilitas publik `ui:tutorials` dengan definisi, katalog, target, dan sinyal masa hidup milik komponen. Halaman, bagian yang terlihat, dan persyaratan akses menentukan ketersediaan. Pelepasan komponen melepas panduannya. Penyajian dan penyelesaian bersama dijelaskan dalam [kontrak tutorial host](/docs/tutorials).

Sinyal router membatasi registrasi tutorial dan komposer halaman. Menggulir mempertahankan kontrol tutorial; target yang sudah tampil lalu hilang sementara dipulihkan tanpa maju diam-diam.

Panduan menjelaskan penulisan sekali, lalu menyorot input pesan dan kontrol pratinjau secara terpisah.

Pengelolaan ruang tidak dimasukkan dalam alur dan jumlah langkah sampai judul ruang tersedia.

Langkah pemilih percakapan ringkas menargetkan kontrol panel samping Composer yang terlihat. Pada desktop, tindakan tersembunyi ini tidak masuk dalam alur maupun jumlah langkah yang ditampilkan. Ukuran panel dan penyimpanan draf dijelaskan dalam [Pesan](/docs/adapters/social/messages).
