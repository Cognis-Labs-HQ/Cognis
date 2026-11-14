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

## Navigasi luring

Messages hanya mengaktifkan navigasi luring jika akun dan sesi saat ini memiliki daftar ruang tersimpan serta aset halaman yang siap. Percakapan tetap memerlukan pesan terenkripsi tersimpan dan keyring yang terbuka; percakapan yang belum tersimpan memerlukan koneksi. Penggambaran ulang penyedia mempertahankan status nonaktif tautan luring.

## Hasil Antrean Tersimpan

Pesan terenkripsi hanya menghapus draf setelah pengakuan server atau penyimpanan dalam antrean. Kegagalan penyegaran ruang berikutnya tidak menandai bukti tersebut sebagai pengiriman gagal. Pesan tertunda mempertahankan identitas operasi yang stabil untuk pengiriman ulang.

## Ketersediaan Luring

Messages menyiapkan daftar ruang, terjemahan, dan katalog emoji setelah masuk terverifikasi. Dengan aset halaman yang disiapkan dan daftar ruang tersimpan, halaman dapat dibuka luring sebelum kunjungan daring pertama. Hanya ruang dengan metadata dan percakapan tersimpan yang terbuka otomatis; memilih percakapan yang belum tersimpan menampilkan pemberitahuan informasi khusus. Pendaftaran ruang dan ketersediaan aset tetap terjaga saat impor berulang melalui bundel maupun berkas langsung.

## Penggunaan Emoji Terpisah

Pemilih reaksi Messages yang dapat digunakan kembali mencatat frekuensi emoji secara terpisah dari perubahan reaksi. Hanya permintaan reaksi pesan yang menyertakan keadaan aktif akhir. Kegagalan pencatatan penggunaan dicatat tanpa menghalangi reaksi yang dipilih atau fungsi pembaruannya.

## Penyimpanan dan Rute Bertipe

Deklarasi peran dan visibilitas profil sosial kini sesuai dengan rekaman tersimpan. Rute pesan dan profil tetap mempertahankan pemeriksaan izin, sementara callback, notifikasi, dan perintah basis data menggunakan kontrak eksplisit. Resolusi sesi tamu yang tidak tersedia tetap menggagalkan proses sebelum profil tamu dibaca.

## Cakupan Kredensial

Operasi akun memerlukan sesi akun yang terverifikasi. Operasi sumber daya bersama memverifikasi kredensial tamu secara eksplisit dan memeriksa kembali izin berbagi saat ini sebelum menerapkan izin sumber daya. Nama akun tidak menentukan jenis kredensial. Akses yang dicabut atau kedaluwarsa ditolak.

## Pembungkusan Teks Pesan

Teks pesan membungkus sesuai lebar percakapan yang tersedia dalam gaya bawaan, gelembung percakapan, dan IRC. Pesan pendek tetap satu baris jika muat. Pergantian baris eksplisit, format Markdown, dan teks literal menyerupai HTML tetap dipertahankan; teks panjang tanpa spasi dapat membungkus di dalam pesan. Perilaku ini berlaku untuk pesan masuk dan keluar tanpa mengubah avatar, reaksi, atau informasi pengiriman.

## Pembaruan Percakapan Asinkron

Hanya percakapan yang terakhir dipilih yang dapat memperbarui judul, pesan, kunci, dan tindakannya. Berpindah ruang atau meninggalkan Messages membatalkan pembaruan tampilan yang tertunda. Draf tetap terkait dengan ruang asal selama halaman saat ini aktif.

Anda dapat mulai menulis draf berikutnya saat pesan dikirim. Konfirmasi atau penyimpanan permanen dalam antrean hanya menghapus versi draf yang dikirim, sehingga suntingan baru dan draf di ruang lain tetap tersimpan. Pengiriman ulang diblokir selama pengiriman berlangsung. Jika percakapan gagal diperbarui sesudahnya, pesan tetap berstatus terkirim atau dalam antrean dan notifikasi meminta Anda tidak mengirimkannya lagi.

Penanda belum dibaca hanya berubah setelah konfirmasi status baca berhasil. Kegagalan mempertahankan jumlah belum dibaca dan menampilkan notifikasi terjemahan satu kali selama kegagalan berlanjut. Setelah konfirmasi berhasil, kegagalan berikutnya dapat dilaporkan kembali.

Kegagalan pembaruan latar belakang menampilkan pemberitahuan terlokalisasi dan mempertahankan draf saat ini. Kegagalan berulang dicatat, tetapi pemberitahuan baru ditampilkan lagi setelah pemulihan atau pemilihan percakapan lain. Kegagalan terlambat dari ruang atau akun yang telah ditinggalkan tidak dapat menampilkan galat pengiriman lama, memulai pembacaan lanjutan, atau mengganggu percakapan saat ini. Keluar dan membuka kembali Pesan juga mengakhiri pembaruan tertunda milik tampilan lama.

Perubahan reaksi dan Muat Lebih Awal tetap terkait dengan percakapan tempat tindakan dimulai. Kegagalan pada percakapan aktif menampilkan pemberitahuan terjemahan dan dicatat tanpa isi pesan; kegagalan dari ruang, akun, atau halaman yang telah ditinggalkan diabaikan. Tindakan ini tidak dicoba ulang secara otomatis. Tutorial Pratinjau mencakup format, tautan, dan jeda baris, bukan lampiran.

## Pilihan Teks Pesan yang Stabil

Pilihan pada teks pesan yang tidak berubah mempertahankan rentang DOM, arah, dan posisi saat pesan baru, reaksi, atau metadata pembaca memperbarui percakapan. Ini berlaku untuk ketiga gaya pesan dan pilihan yang melintasi pesan bersebelahan. Jika teks yang dipilih berubah atau dihapus, aturan pilihan bawaan berlaku; klien tidak memulihkan teks lama.

Muat Pesan Sebelumnya mempertahankan pesan yang sudah dimuat saat pembaruan langsung tiba. Pesan antrean lokal tidak dihitung dalam jumlah halaman server atau kursor halaman. Halaman berulang tidak menggandakan baris. Tampilan yang digulir ke atas mempertahankan acuannya, sedangkan tampilan dekat bagian bawah mengikuti konten baru. Pergantian ruang, akun, kunci, gaya, atau pemasangan ulang membuat tampilan terpisah.

Reaksi yang diakui pada pesan lama yang terlihat langsung memperbarui status aktifnya, termasuk setelah masuk antrean luring secara permanen. Kontrak daftar pesan yang ada kemudian memperbarui halaman pesan tersebut untuk metadata reaksi tanpa mengganti isi pesan yang tidak berubah. Kegagalan penyegaran menampilkan kesalahan pembaruan saat ini sambil mempertahankan status yang diakui dan teks terpilih, baik untuk pesan baru maupun lama; mutasi tidak dicoba ulang.

Uji regresi DOM nyata menggunakan dependensi pengembangan jsdom dengan versi pasti khusus pengujian yang sesuai dengan versi Node yang didukung repositori. Pengujian mencakup perender yang diekspor, simpul DOM, Range/Selection, data interaksi, dan proyeksi luring sebenarnya. Geometri yang diberikan menguji kebijakan gulir; pengujian ini tidak mengukur tata letak browser, pilihan sentuh, atau perilaku papan klip.

Proyeksi antrean memiliki urutan permintaannya sendiri, terpisah dari penggabungan riwayat server. Respons terlambat tidak dapat menghapus pesan antrean yang lebih baru, memunculkan kembali pekerjaan tertunda yang telah dibersihkan, atau mengganti baris yang diakui dengan salinan antreannya. Permintaan tanpa perubahan juga memajukan urutan tersebut. Jika proyeksi antrean suatu respons diabaikan, tanda tangannya dibatalkan agar permintaan berikutnya dapat menyelaraskan data terbaru.

Permintaan halaman terbaru juga mempertahankan urutan publikasinya. Respons langsung yang terlambat tidak dapat menghapus pesan baru yang sudah diakui atau mengganti metadata yang lebih baru. Snapshot halaman terbaru yang sudah usang diabaikan; permintaan riwayat eksplisit tetap digabungkan. Kegagalan lama tidak mengubah konten terbaru yang telah ditampilkan.

Pembacaan dan reaksi yang diakui memakai urutan tampilan saat ini. Pembacaan riwayat yang tumpang tindih mempertahankan metadata pesan yang lebih baru, dan halaman langsung yang lengkap mencegah pembacaan lama memunculkan kembali baris yang tidak ada. Halaman penuh dengan batas jumlah tidak menyimpulkan ketiadaan pada cap waktu tertua yang sama; `before` tetap eksklusif. Rentang cakupan hanya disimpan selama pembacaan lama masih aktif: rentang tumpang tindih dengan prioritas sama terhadap pembacaan tersebut digabung lalu dihapus setelah selesai. Pembacaan yang tertahan tidak menambah satu rentang per jajak. Kesalahan pembacaan lanjutan yang telah digantikan tidak ditampilkan; kesalahan pembacaan saat ini dan mutasi yang gagal tetap terlihat.

Header klien terlingkup `x-cognis-read-source` membedakan transport baru (`live`), pemakai transport yang sudah dimulai (`shared`), dan snapshot tersimpan atau dipulihkan (`cached`). Baris server bersama atau tersimpan tidak menimpa metadata yang ditampilkan atau menghapus baris yang dimuat. Baris tersebut dapat mengisi bagian awal yang lebih lama dan belum dimuat kecuali hasil langsung telah memastikan batas akhirnya. Bagian awal cache yang kosong hanya mengakhiri riwayat yang saat ini dapat dibaca; hasil langsung berikutnya dapat membukanya kembali. Proyeksi antrean tetap diselaraskan secara terpisah. Tanda tangan yang menyertakan sumber memungkinkan respons yang benar-benar baru memperbarui metadata meskipun muatannya sama dengan snapshot lama.

Perender mengembalikan hasil usang secara eksplisit ketika kepemilikan ruang, akun, kunci, gaya, atau kontainer berubah. Pemanggil tindakan, pembukaan ruang, dan pembaruan latar belakang berhenti tanpa pemberitahuan kesalahan, penulisan status baca, atau pembacaan status mengetik lanjutan; kegagalan pembacaan saat ini tetap dibedakan.

## Bukti penghapusan akun

Pada `deprovision-user` → `cleanup-dependencies`, komponen memperoleh `auth:deprovisionOutcome` versi 1 melalui `system:contracts` dan memanggil `deletedAccount(input, stageResults)` dengan objek asli dari pemanggilan tersebut. Hanya bukti milik Auth yang mengonfirmasi penghapusan tersimpan yang mengizinkan penghapusan keanggotaan ruang dan aktivitas pesan akun. Hasil salinan, hasil penonaktifan/pengarsipan, serta bukti yang hilang atau tidak tersedia tidak mengizinkan pembersihan ini.

Pasang bersama penyedia Auth 2.2.12 bawaan atau alternatif yang menerapkan kontrak berversi ini; hasil alur publik yang dapat diubah bukan pengganti. Pembersihan menggunakan bukti penghapusan yang sudah tersimpan, bukan melakukan otorisasi ulang setelah penghapusan. Mutasi eksternal yang sudah dimulai dapat selesai sebagian sebelum kegagalan berikutnya; pembatalan lintas komponen tidak dijamin. Kontrol antarmuka dan tutorial biasa tidak berubah.

Migrasi ini melindungi konsumen pembersihan bawaan. Sebelum mengaktifkan penghapusan akun dalam penerapan, perbarui atau nonaktifkan hook pembersihan eksternal yang masih memercayai hasil alur publik yang dapat diubah.

## Tampilan Hanya Baca

Penyedia peramban menyediakan `social:messagePresentation` versi 1 melalui ctx dengan cakupan siklus hidup. `render({ style, records, currentAccountId })` menjalankan `messages:presentConversation` melalui tahap `validate` dan `render`, lalu mengembalikan markup noninteraktif. Setiap catatan menyediakan string `id`, `senderId`, `senderDisplayName`, `senderHandle`, `text`, dan waktu ISO `createdAt`. Hanya bidang tampilan tersebut yang disalin untuk digambarkan. Penyedia mengumumkan stylesheet bersama dan sinyal pembatalan; konsumen mendengarkan `cognis:message-presentation-changed` dan berhenti memakai penyedia yang dicabut. Percakapan nyata dan tampilan hanya baca memakai penggambar baris dan isi yang sama. Jalur hanya baca tidak mengambil ruang, memuat gambar avatar, mendaftarkan pencarian, menghasilkan tanda baca pesan, atau menyimpan konten. Konsumen sintetis menyediakan catatan dan label terlokalisasinya sendiri.
