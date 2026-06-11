# Pembaruan Layar Kelas

## Desain ulang papan tulis

Papan tulis kelas kini menggunakan tekstur arang gelap, bukan latar belakang hijau polos, dengan sudut membulat yang menyatu secara alami dengan halaman.

## Daftar anggota duplikat dihapus

Daftar anggota di bilah sisi tidak lagi digandakan di tampilan utama. Papan tulis kini hanya menampilkan daftar nama pengguna yang hadir dan tidak hadir secara ringkas.

## Jendela rapat: tombol tutup dihapus

Tombol tutup telah dihapus dari jendela rapat Jitsi. Ketika siswa meninggalkan rapat, mereka secara otomatis dikembalikan ke halaman yang sebelumnya mereka kunjungi.

## Overlay autentikasi Jitsi terblokir

Ketika rapat memerlukan autentikasi yang tidak dapat dilakukan siswa, widget rapat berhenti mencoba koneksi ulang dan menampilkan pesan bahwa kelas saat ini ditutup. Pengambilan data dilanjutkan secara otomatis setelah guru memasuki rapat.

## Obrolan sebagai ruang kerja default

Siswa kini melihat jendela obrolan secara default. Tampilan rapat atau papan tulis terbuka secara otomatis saat guru mengaktifkannya, lalu kembali ke obrolan saat ditutup.

## Pengambilan status guru

Siswa mengambil fokus papan guru yang aktif dan mengikutinya secara otomatis, bukan menerima status yang dikirimkan.

## Desain ulang buku catatan

Editor buku catatan kini mengisi seluruh area tampilan dengan bilah format yang mencakup gaya paragraf, ukuran font, dan warna teks. File dapat disimpan ke materi kelas, dibuka dari materi kelas, atau diunduh langsung.

## Unggah file materi

Guru kini dapat mengunggah file ke materi kelas melalui gateway file. File yang diunggah terdaftar dan dapat dihapus satu per satu.

## Kontrol tampilan obrolan/rapat siswa dihapus

Siswa tidak lagi memiliki tombol manual untuk menampilkan atau menyembunyikan jendela obrolan atau rapat. Visibilitas ruang kerja sepenuhnya dikendalikan oleh status guru.

## Loop penyegaran siswa dan penjagaan rapat diperbaiki

Siswa tidak lagi terjebak dalam loop memasuki rapat. Auto-join dijaga oleh catatan per sesi dan hanya berjalan saat guru telah memulai rapat.

## Tombol Pencarian diperbaiki untuk siswa dan guru

Menekan Pencarian sebagai siswa kini menavigasi ke halaman pencari kelas. Guru dalam tampilan guru tidak lagi melihat tombol tersebut. Kondisi rusak saat daftar kelas guru menghilang telah dihilangkan.

## Pengalihan tampilan guru/siswa diperbaiki

Beralih antara tampilan guru dan siswa tidak lagi memerlukan dua kali tekan atau menyebabkan daftar kelas menghilang.

## Agenda dan Buat Agenda digabungkan menjadi pengeditan langsung

Guru kini dapat menambahkan item agenda langsung di panel tanpa membuka popup. Item baru muncul bagi siswa pada pembaruan berikutnya. Setiap item memiliki tombol hapus untuk guru.

## Papan tulis dibuat otomatis saat pertama kali ditekan

Menekan tombol Papan Tulis sebagai guru kini secara otomatis membuat dan membuka papan tulis. Alur dua langkah telah dihapus.

## Tata letak kelas: 15% panel daftar hadir + 85% ruang kerja

Bilah sisi live rail digantikan oleh tata letak CSS grid: panel daftar hadir 15% dengan font kapur di sebelah kiri, dan ruang kerja utama di sebelah kanan. Bilah alat terlihat oleh semua pengguna tetapi hanya dapat digunakan oleh guru.

## Gaya papan tulis diterapkan pada elemen page-content

Latar belakang gelap papan tulis kini diterapkan langsung pada container page-content saat halaman dimuat.

## Pengelolaan file untuk buku catatan kelas

Menekan Simpan atau Buka di ruang kerja buku catatan membuka antarmuka pengelolaan file melalui gateway file. File disimpan per kelas dan dapat diubah nama atau dihapus dari dialog buka.

## Loop bergabung-keluar otomatis dihilangkan

Siswa mengalami siklus keluar/masuk berulang setelah pembaruan realtime kelas
mendeteksi konferensi aktif. Penjaga bergabung per-rapat kini dicatat sebelum
menunggu panggilan auto-join, sehingga peristiwa `videoConferenceLeft` yang
cepat dari Jitsi tidak lagi meninggalkan penjaga tidak terset dan memulai ulang
siklus. Nilai null sementara dari API rapat aktif tidak lagi mereset penjaga.

## Kepatuhan arsitektur CSS dipulihkan

`classes.css` melebihi batas 1000 baris. File kini menjadi agregator `@import`
dan gayanya dibagi menjadi empat file saudara di bawah
`src/adapters/study/classes/ui/classes/`: `list.css`, `room.css`,
`blackboard.css`, dan `editor.css`.

## Pengujian unit notepad kelas diperbaiki

Tes `classroom-notepad.test.js` gagal karena Node tidak dapat menyelesaikan
jalur impor `/static/` berbasis browser. Sebuah hook loader ESM kustom
(`src/tooling/test-helpers/browser-paths-hook.mjs`) kini memetakan jalur tersebut
ke lokasi sistem file yang sebenarnya.

## Kesalahan ekspor classroom-render diperbaiki

`classroom-render.js` mengekspor nama (`renderStudentRoster`) yang tidak pernah didefinisikan dalam modul, menyebabkan `SyntaxError` yang tidak tertangani dan membuat halaman kelas crash. Ekspor yang tidak terdefinisi telah dihapus.

## Z-index popup crash dinaikkan di atas overlay pemuatan

Popup crash error runtime ditampilkan di bawah overlay pemuatan halaman (z-index 9999), sehingga tidak terlihat saat halaman masih memuat. Kelas modifier baru `popup-overlay--critical` meningkatkan popup crash ke z-index 10000, memastikannya selalu terlihat saat terjadi kesalahan.

## Siswa di Classroom tidak lagi masuk ulang setelah keluar dari meeting

Logika auto-join siswa di Classroom terus meluncurkan ulang embed Jitsi setiap siklus refresh 3 detik setelah siswa meninggalkan meeting. Dua masalah panggilan bersamaan dan masuk ulang telah diperbaiki: (1) fase setup `openMeetingEmbed` kini menyimpan flag `openInProgress` agar panggilan `tryAutoJoin` baru selama inisialisasi Jitsi tidak dapat membuat embed kedua yang tumpang tindih, dan (2) guard `triedMeetingId` di dalam `classroom-meeting-embed.js` mencegah bergabung kembali ke ID meeting yang sudah dicoba. Metode baru `notifyActiveMeeting(meetingId)` memungkinkan adapter Classroom memberi sinyal meeting benar-benar baru, yang mereset guard dan menghapus status auth-block. Loop refresh Classroom telah disederhanakan; semua logika guard join kini berada di dalam modul jitsi-meet.

## Keluar dari Jitsi tetap di Cognis

Keluar dari meeting Jitsi Classroom yang disematkan sekarang langsung menutup
jendela meeting di dalam Cognis, bukan membiarkan iframe berpindah ke halaman
awal Jitsi. Setelah itu workspace classroom kembali ke tampilan agenda.

## Meeting yang sama tidak langsung di-auto-join lagi

Saat siswa sengaja keluar dari meeting classroom yang masih aktif, Cognis kini
mengingat penolakan itu untuk ID meeting saat ini. Loop refresh classroom tidak
akan auto-join meeting yang sama lagi sampai meeting yang lebih baru aktif.

## Classroom memakai pola overlay Meetings

Jendela meeting classroom sekarang menampilkan pola overlay status gabung dan
tertutup yang sama seperti halaman Meetings, sehingga status memuat dan
penutupan tetap muncul di dalam UI Cognis.

## Rute agenda dipisahkan dari rute file

Penangan penghapusan item agenda kelas kini dipindahkan ke modul rute
tersendiri, memisahkan tanggung jawab akses file dan kalender secara jelas.

## normalizeBoardFocus diekstrak ke modul tersendiri

Normalizer board-focus bersama kini berada di file tersendiri per lapisan
(`store/board-focus.ts` di server, `ui/board-focus.js` di browser) alih-alih
didefinisikan secara inline di dalam file kelas yang lebih besar.

## Keluar Jitsi tetap di Cognis

Keluar dari meeting Jitsi tersemat di halaman Meetings kini langsung menutup
jendela meeting di dalam Cognis. Embed Meetings mencegat aksi hangup pada
toolbar Jitsi sebelum iframe jatuh ke beranda Jitsi yang di-host, sambil tetap
mempertahankan alur overlay saat meninggalkan meeting.

## Overlay meeting tidak lagi menyebabkan kedipan halaman bagi siswa

Pada siklus pembaruan waktu nyata, penggantian DOM penuh kini dilewati saat
meeting sudah terbuka. Bagian dinamis (lantai meja, daftar anggota) diperbarui
di tempat tanpa mengganggu overlay meeting.

## Siswa dialihkan kembali ke kelas saat guru mengakhiri meeting

Ketika guru meninggalkan meeting aktif, siswa kini secara otomatis
dikeluarkan dari tampilan meeting dan mendapat notifikasi toast. Overlay
ditutup dengan bersih dan halaman kembali ke ruang kerja bawaan.

## Berpindah kelas kini menutup meeting terbuka dari kelas sebelumnya

Memilih kelas lain dari footer tidak lagi meninggalkan overlay meeting
kadaluarsa dari kelas sebelumnya. Meeting ditutup sebelum kelas baru dimuat.

## CSP connect-src kini mencakup instans Jitsi yang dikonfigurasi

Direktif `connect-src` pada Content Security Policy kini menyertakan
origin server Jitsi yang terdaftar bersama `script-src`, menyelesaikan
pelanggaran konsol ketika Jitsi external API membuat koneksi ke server meeting.

## Regresi cookie Jitsi diperbaiki

`allow-same-origin` ditambahkan ke sandbox iframe Jitsi agar domain Jitsi dapat membaca dan menulis cookie sesinya sendiri.

## Guard meeting mencegah tampilan beranda Jitsi

Saat autentikasi diblokir atau pengguna membatalkan alur autentikasi meeting, jendela meeting kini ditutup dengan benar daripada menampilkan beranda Jitsi melalui overlay.

## Tampilan guru selalu direset saat navigasi

Guru yang sebelumnya beralih ke tampilan siswa kini selalu dikembalikan ke tampilan guru saat refresh halaman atau navigasi SPA.

## Sub-navigasi terlihat untuk guru dalam tampilan siswa

Memperbaiki regresi di mana guru dalam tampilan siswa melihat daftar kelas kosong di bilah sub-navigasi.

## Tata letak kelas distrukturisasi ulang

Tab Kehadiran (roster) telah dipindahkan dari sidebar ke baris tab ruang kerja. Entri Agenda Kelas telah dihapus dari sidebar karena sudah ada di tab ruang kerja. Tombol meeting telah dihapus dari toolbar aksi papan tulis. Sidebar sekarang hanya menampilkan materi kelas.

## Papan tulis dimulai dalam keadaan terlipat

Saat memasuki kelas, papan tulis diminimalkan ke baris header hingga sebuah tab ruang kerja ditekan.

## Status aktif tab ruang kerja

Setiap tombol tab ruang kerja menerima kelas CSS `active` saat modusnya dipilih.

## Pembaruan dinamis dibatasi pada pembaruan bedah

Siklus pembaruan realtime untuk siswa tidak lagi memicu penggantian DOM penuh; lantai meja dan panel kehadiran diperbarui di tempat.

## Klik meja guru dinonaktifkan

Mengklik meja guru tidak lagi membuka popup pencarian pengguna.

## Font kapur dibatasi pada panel ruang kerja dan kehadiran

Font kapur kini diterapkan secara eksplisit ke `classes-workspace-main` dan `classes-roster-panel` dan diteruskan ke elemen formulir melalui `font-family: inherit`.

## Tinggi papan tulis menyesuaikan konten

Papan tulis tidak lagi memiliki tinggi minimum yang dipaksakan saat tidak ada meeting aktif, sehingga ukurannya menyesuaikan kontennya secara alami.
