# Klien browser Pesan

Ruang grup baru menyelesaikan pembuatan kunci dan seluruh penambahan anggota sebelum mengikat sumber integrasi. Kegagalan inisialisasi atau pengikatan menghapus ruang parsial; kegagalan pembersihan dicatat dan diteruskan. Ruang yang sudah ada dan eksklusivitas sumber tetap berperilaku sama.

Klien browser Pesan memungkinkan modul mencantumkan pesan ruang, membuka ruang privat, dan mengirim pesan melalui kontrak API terautentikasi milik adaptor Social Messages.

## Contoh penggunaan

Impor `uiCtx`, wajibkan `social:messagesUiClient`, lalu panggil `listRoomMessages(roomId, options)`, `openPrivateRoom(payload, options)`, atau `sendRoomMessage(roomId, payload)` dari kode browser.

## Spesifikasi teknis

Klien mengembalikan `Response` asli agar pemanggil menangani status dan payload. Klien mengodekan ID ruang untuk URI, mempertahankan pengetahuan rute di adaptor pemilik, meneruskan token akses opsional dan penekanan penolakan akses, mengirim penulisan sebagai JSON, dan hanya tersedia ketika gateway Social serta adaptor Messages aktif.

Kapabilitas publik `social:messages:deleteChatroom` menerima ID ruang dan ID akun pelaku. Kapabilitas ini menghapus ruang beserta data terkait secara permanen jika pelaku membuat ruang tersebut atau menjadi satu-satunya peserta yang tersisa.

Adaptor juga menerbitkan `social:messages:resolveRoomMembership`. Dengan ID ruang dan ID akun pemohon, capability ini hanya mengizinkan anggota ruang aktif dan mengembalikan ID akun anggota aktif. Penyedia memakai batas ini alih-alih membaca persistensi Messages secara langsung.

Pemilih Ruang Baru memakai parameter `category: "user"` dan `typeFilter: "user"` dari popup pencarian bersama, sama seperti konsumen khusus pengguna lain seperti Jitsi Meet, sehingga hanya hasil pengguna yang ditawarkan untuk membuat percakapan.

Panggilan masuk ditampilkan sebagai bilah tindakan kontribusi tepat di bawah tajuk utas, dengan label di kiri serta tindakan SVG Jawab dan Tolak milik penyedia di kanan. Peristiwa panggilan historis tetap menjadi catatan lini masa biasa, bukan prompt interaktif.

Adapter menyediakan capability generik `social:messages:appendRoomEvent` bagi komponen yang perlu mencatat peristiwa linimasa dalam ruang. Payload hanya menyimpan metadata peristiwa yang netral; komponen pemilik tetap memiliki nama dan bidang peristiwa khusus domainnya. Flow browser `messages:formatRoomEvent` memungkinkan komponen tersebut menyediakan tampilan terlokalisasi tanpa menambahkan teks atau aturan render ke Messages.

### Percakapan milik sumber daya

`social:messages:resolveGroupChatUrl` menerima `usernames` serta `title`, `createdByAccountId`, `allowSingleMember`, `reuseExisting` dan `roomId` opsional. Default memakai ulang grup dengan anggota persis sama. `reuseExisting: false` membuat percakapan tersendiri; `roomId` tersimpan dipertahankan meski anggota berubah, dan diganti jika sudah terhapus. Ruang baru mendapat kunci dan anggota sendiri; ruang yang dipakai ulang mempertahankan judulnya. Opsi netral ini mendukung sumber daya independen, termasuk rapat.

## Pengikatan sumber integrasi eksklusif

`social:messages:sourceBinding` menyediakan `bind` dan `release` dengan `{roomId, actorAccountId, sourceType, sourceId}`. Resolusi grup juga menerima `source: {sourceType, sourceId}`. Anggota ruang yang berwenang dapat mengikat ruang yang belum terikat; sumber lain menerima `source_conflict` tanpa menimpa pengikatan. Klaim ulang oleh sumber yang sama bersifat idempoten. Pembaruan bersyarat menentukan pemenang klaim bersamaan, dan pelepasan hanya menghapus sumber yang cocok. Resolusi grup dan pengikatan menjalankan alur ctx terdaftar.

Penyedia browser memperoleh `ui:scopedActions` dari ctx terbatasnya. Pemanggilan dengan `(ctx, moduleId, actions)` mendaftarkan alur yang dapat dijalankan untuk setiap tindakan bernama dan mengembalikan fungsi tindakan. Gunakan fungsi ini untuk membaca dan mengubah administrasi; host membuang alur dan menangani penolakan fungsi usang setelah penghentian. Hak administrator berasal dari peran terkini akun aktif, bukan bidang peran yang diberikan pemanggil.

## Perubahan Sosial Offline

Penyedia Profile dan Messages mendaftarkan tindakan HTTP melalui ctx sesuai masa hidupnya. Profil, pos, daftar ruang, dan percakapan terenkripsi yang pernah dimuat tersedia di tab terverifikasi. Teks profil, ketersediaan, status ikuti/blokir, tata letak banner, pembuatan/penghapusan pos, pesan terenkripsi di ruang lama, status akhir reaksi, dan tanda baca memakai buffer offline per akun. Suntingan online berikutnya menunggu antrean pemilik yang sama. Pergantian akun atau sesi selama persiapan atau menunggu buffer membatalkan tindakan. Pesan dan pos memakai UUID `operationId` stabil; pengulangan berbeda atau lintas akun ditolak. Pengiriman ulang pesan tidak menggandakan notifikasi. Tanda baca mempertahankan waktu baca awal.

Percakapan dienkripsi sebelum masuk buffer: teks asli, kunci ruang, dan kredensial tidak masuk antrean. Teks profil dan isi pos disimpan di penyimpanan browser akun saat ini. Avatar/banner hingga 350.000 byte biner berbagi antrean 1 MB/1.000 catatan/tujuh hari; gambar lebih besar memerlukan koneksi. Buffer penuh menampilkan kesalahan terlokalisasi; draf pesan dan pos baru dikosongkan setelah berhasil disimpan secara permanen. Batas berlaku untuk seluruh buffer.

Perubahan tetap tertunda sampai dikonfirmasi server. Pesan menampilkan status antrean; tindakan profil, pos, dan media menampilkan toast antrean standar. Menutup atau memuat ulang browser memicu konfirmasi perubahan belum tersimpan selama akun memiliki buffer, termasuk catatan dari penyedia nonaktif. Peringatan hilang setelah konfirmasi atau pembersihan akun. Browser menentukan teks konfirmasi dan mungkin memerlukan interaksi pengguna. Catatan tetap bertahan setelah muat ulang; peringatan tidak membuangnya.

Konten sosial tersimpan tetap hanya di tab dan memerlukan persetujuan. Kunjungan pertama, muat ulang privat offline, pembuatan ruang, pengelolaan anggota/kunci, panggilan, dan unggahan besar memerlukan koneksi. Status mengetik dan kehadiran bersifat sementara dan tidak dikirim ulang. Otorisasi server terkini diperiksa saat pengiriman; cache offline tidak dapat mengetahui pencabutan akses jarak jauh. Persetujuan ToS tetap wajib sebelum akses dan pengiriman.
