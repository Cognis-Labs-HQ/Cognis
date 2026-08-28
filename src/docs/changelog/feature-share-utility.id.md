# Share Utility

**Feature Branch:** copilot/feature-share-utility

## Tambah Gateway Share

Cognis sekarang memiliki gateway Share khusus yang menangani pembuatan, daftar, pencabutan, dan resolusi token share publik. Gateway ini mendaftarkan flow share kanonis, menyimpan token share di DB, dan menyediakan halaman publik `/share/:token` yang dibangun dengan page composer standar dalam shell minimal.

## Bagikan Meeting

Modul Jitsi Meet sekarang menambahkan hook flow share untuk sumber daya meeting, menyediakan route pengelolaan share meeting, dan menampilkan tombol share di area meeting. Pemilik meeting dapat membuat tautan share yang kedaluwarsa, menyalinnya dari popup, lalu mencabutnya nanti.

## Popup Tautan Berbagi Generik

Popup tautan berbagi telah diekstrak dari modul Jitsi Meet menjadi utilitas generik `openShareLinksPopup` di `src/ui/reuse/share-links-popup.js`. Utilitas ini menerima fungsi callback API dan string label sebagai parameter sehingga dapat digunakan kembali oleh fitur apa pun. Impor kini menggunakan jalur absolut, sehingga memperbaiki kegagalan pengambilan impor dinamis di halaman Meetings.

## Perbaikan Kegagalan Muat Halaman Meetings Akibat 401 pada share-adapter.js

Impor statis tingkat atas dari `share-adapter.js` di `app.js` halaman Meetings memicu respons
401 saat modul di-parse, sebelum sesi pengguna dapat memenuhi pemeriksaan autentikasi apa pun.
Hal ini membatalkan impor dan mencegah seluruh rute SPA `/meetings` dimuat.
`share-adapter.js` kini diambil sebagai impor dinamis lazim yang diletakkan berdampingan dengan
`share-links-popup.js` di dalam handler klik tombol share, sehingga file tersebut tidak pernah
diminta sampai pengguna berada dalam sesi yang terautentikasi dan dengan sengaja membuka
popup share.

## Hapus File Jitsi Meet yang Usang

File-file `ui/app/index.js` dan `ui/pages/meetings.html` pada modul Jitsi Meet menjadi kode mati
akibat refaktor sebelumnya dan tidak pernah dikirimkan ke browser. `index.js` mengandung impor
yang rusak (`/static/reuse/page-composer.js` alih-alih `/static/reuse/page-composer/index.js`),
yang akan menyebabkan kegagalan muat jika file tersebut pernah diakses. Kedua file telah dihapus.

## Perbaiki Tautan Share Publik yang Diblokir oleh Pemeriksaan Autentikasi

Handler rute gateway kalender menggunakan pemeriksaan `pathname.includes("/share")`
yang terlalu luas, yang secara tidak sengaja menangkap URL tautan share publik
(`/share/shr_...`) dan mengembalikan kesalahan unauthorized sebelum gateway share
dapat menyajikan halaman tersebut. Pemeriksaan kini dipersempit hanya untuk rute
API share kalender di bawah `/api/v1/calendar/calendars/:id/share`.

## Perbaiki Fokus Input Label Popup Share

Saat popup tautan share dibuka, kolom input label kini secara otomatis menerima
fokus. Sebelumnya, tombol tutup (tombol pertama dalam DOM popup) secara keliru
difokuskan, sehingga mencegah pengetikan langsung menggunakan keyboard pada kolom
label.

## Tambah Sesi Share Tamu Berbasis Flow

## Arsitektur Flow Sisi Klien

Singleton `uiCtx` browser flow engine kini mengelola semua kepentingan lintas komponen di browser. Auth, pemuatan halaman, dan navigasi SPA dinyatakan sebagai flow bernama dan bertahap yang dapat diperluas oleh gateway atau modul mana pun tanpa harus memiliki flow tersebut. Validasi sesi berada di auth gateway, penukaran token tamu berada di share gateway, dan `page-entry.js` mendelegasikan ke flow `load-page` sehingga halaman individual tidak perlu memanggil helper auth secara langsung. Wrapper `share-mount.js` Jitsi Meet dihapus; halaman share langsung memuat `app.js` dan menemukan konteks share melalui sistem flow.

## Perbaiki Loop Pengalihan Login

Hook autentikasi `load-page` kini melewati pemeriksaan auth pada halaman publik (`/login` dan `/register`), mencegah loop pengalihan tak terbatas yang terjadi karena mengimpor `createPageComposer` pada halaman tersebut secara transitif mendaftarkan hook auth, yang kemudian langsung mengalihkan pengunjung yang belum terautentikasi kembali ke `/login`.

## Perbaiki Error Halaman Meeting via Share Link

Beberapa bug yang saling terkait menyebabkan error dan halaman kosong saat bergabung ke meeting (atau memuat konten yang dibagikan) melalui share link.

- **Token tamu sekarang lolos autentikasi server**: `getAuthClaims` kini juga menerima token dengan `purpose: "share"` sehingga JWT tamu dapat mengautentikasi panggilan API Jitsi Meet.
- **Mencegah double-mount saat import dinamis**: Halaman share sekarang menyetel flag `__spaRouter` sebelum import dinamis untuk mencegah eksekusi `load-page` kedua yang tidak perlu.
- **Pertahankan token tamu saat pemeriksaan auth berulang**: `validate-stored-token` kini hanya membersihkan sesi jika tidak ada token sama sekali; token tanpa akun (skenario tamu) dibiarkan agar ditangani oleh `apply-alternate-auth`.
- **Hapus assignment `guestController` yang tidak digunakan**: Baris kode mati telah dihapus dari share session-flow-hooks.
- **Gaya halaman untuk konten yang dibagikan**: Jitsi share hook sekarang menyertakan `stylesheetUrls`; halaman share memuat CSS yang diperlukan sebelum memasang resource.

## Tombol Share Otomatis Tersembunyi untuk Tamu

Setiap komponen yang menampilkan tombol share sekarang menanyakan ke Share gateway apakah sesi saat ini adalah sesi tamu, dan menyembunyikan tombol tersebut sepenuhnya untuk tamu alih-alih hanya menonaktifkan penangan kliknya. Pembuatan tombol share kini sepenuhnya menjadi tanggung jawab modul klien milik Share gateway sendiri, sehingga menonaktifkan gateway berarti tombol share tidak akan pernah dibuat.

## Jendela Share Kini Menggunakan Tata Letak Halaman Lengkap Pengguna Masuk

Membuka share link kini menampilkan topbar standar, footer, dan grid konten penuh yang digunakan oleh halaman pengguna masuk, alih-alih bingkai bermerek yang disederhanakan. Aksi login/registrasi tetap tersedia bagi tamu dari topbar.

## Tamu Mendapatkan Profil Sementara per Sesi

Setiap sesi tamu kini mendapatkan profil tampilan sementara (nama/avatar), yang dibersihkan secara otomatis setelah kedaluwarsa. Jitsi Meet menggunakan profil sementara ini saat memberi tahu Jitsi Meet tentang identitas tamu dan saat tamu mengirim pesan di chatroom.

## Tamu Dicegah Bernavigasi Keluar dari Share Link

Jika seorang tamu mencoba menavigasi ke halaman lain, sebuah popup menjelaskan bahwa tamu tidak dapat melihat halaman tersebut dan mengembalikannya ke share link.

## Tamu Hanya Melihat Peserta yang Mengizinkannya

Meeting yang dibagikan kini menyembunyikan peserta yang preferensi visibilitasnya tidak mengizinkan penonton anonim/tamu, baik dalam payload share awal maupun dalam status meeting langsung.

## Membuat Share Link Kini Memerlukan Persetujuan dari Peserta Lain

Ketika share link diminta untuk entitas dengan pengguna lain yang terkait (misalnya rapat), pengguna tersebut akan diminta melalui popup dengan opsi setuju/tolak. Jika ada yang menolak, share link tidak akan dibuat. Popup akan otomatis menyetujui setelah 60 detik jika tidak ada yang merespons.

## Popup Share Memperbarui Daftar Tanpa Merebut Fokus

Popup tautan share sekarang merender formulir pembuatan dan daftar tautan sebagai area DOM yang terpisah. Input label dan masa berlaku tetap terpasang saat daftar diperbarui setelah aksi buat/cabut dan selama polling latar belakang setiap 10 detik, sehingga pengguna dapat terus mengetik tanpa kehilangan posisi kursor. Tautan yang sudah ada juga kini menampilkan URL share itu sendiri sebagai tombol salin di samping judul agar popup lebih ringkas.

## Tautan Share Menawarkan Aksi Cepat Email

Catatan share sekarang dapat memuat aksi cepat yang diselesaikan oleh gateway dari sender notifikasi yang aktif. Adapter SMTP menambahkan kemampuan quick-share berbasis `mailto:`, dan Share gateway otomatis menambahkan aksi email untuk setiap sender SMTP aktif ke setiap catatan share yang dikirim ke klien.

## Perbaikan Error Profil Tak Tertangani yang Merusak Panggilan API Meeting

Beberapa rute Jitsi Meet (`meetings/active`, dan setiap rute yang dibangun di atas `resolveMeetingPayloadOrReject`, termasuk `get`, `preflight`, `probe`, `join`, `reclaim`, `presence`, rute `auth-*`, `state`, dan `chat-room-summary`) memanggil `resolveRequesterUsername` tanpa menangani error yang dilemparkannya ketika pemanggil tidak memiliki handle profil yang terlihat. Exception yang tak tertangani ini ditangkap oleh error handler umum server dan muncul sebagai `400 Bad Request` yang tidak informatif pada setiap permintaan, alih-alih respons `409 profile_required` yang sudah digunakan oleh `meetings/create`. Titik pemanggilan ini sekarang menangani error secara konsisten dan mengembalikan `409 profile_required`.

## Tautan Berbagi Membuka Klien Surel di Tab Baru

Aksi berbagi cepat email sekarang membuka tautan `mailto:` dengan `target="_blank"`, sehingga menulis pesan tidak lagi menggantikan tab saat ini dengan navigasi kosong.

## Perbaikan Ikon Email yang Hilang di Popup Berbagi

Aset ikon surat sekarang berada di direktori `ui/reuse` milik Share gateway sendiri (mandiri bersama bagian lain gateway) alih-alih di jalur aset publik generik, dan dirender sebagai ikon mask bertema yang selalu menyesuaikan warna tombol sekitarnya, bukan `<img>` yang `currentColor` internalnya tidak pernah mewarisi tema halaman.

## Tamu Melihat Layar Berbagi Kedaluwarsa/Dihapus, Bukan Pengalihan ke Login

Mengakses tautan berbagi yang kedaluwarsa, dicabut, atau tidak dapat diselesaikan lainnya tidak lagi memaksa pengalihan tamu ke `/login`. Alur `authenticate-session` sekarang mengenali kegagalan resolusi token berbagi dan membiarkan halaman berbagi merender layar fallback kedaluwarsa/dihapusnya sendiri.

## Label Tautan Berbagi Dikosongkan Setelah Dibuat

Kolom label kustom di popup tautan berbagi sekarang dikosongkan segera setelah tautan berhasil dibuat, sehingga membuat tautan berikutnya dimulai dengan label kosong, bukan menggunakan kembali label sebelumnya.

## Tautan Berbagi Kini Menampilkan Status Aktif/Kedaluwarsa dan Waktu Kedaluwarsa

Setiap tautan berbagi di popup kini menampilkan lencana status "Aktif" atau "Kedaluwarsa" beserta tanggal dan waktu lokal (zona waktu pengguna) tautan tersebut akan atau telah kedaluwarsa. Token berbagi yang kedaluwarsa kini disimpan untuk masa tenggang singkat alih-alih langsung dihapus saat kedaluwarsa, sehingga pemilik tetap dapat melihatnya berstatus "Kedaluwarsa" sebelum pembersihan otomatis menghapusnya.

## Perbaikan Kontras Mode Terang pada Popup Tautan Berbagi

Baris tautan berbagi menggunakan warna latar belakang gelap dan warna teks yang dikodekan secara tetap sehingga mengabaikan tema aktif, membuatnya tampil dengan latar belakang terlalu gelap bahkan dalam mode terang. Popup sekarang menggunakan variabel tema bersama sehingga menyesuaikan dengan benar pada mode terang maupun gelap.

## Perbaikan Roda Muat Tanpa Henti pada Halaman Berbagi yang Kedaluwarsa

Mengunjungi tautan berbagi yang kedaluwarsa atau tidak valid menyebabkan halaman berputar tanpa henti alih-alih menampilkan layar tautan kedaluwarsa. `renderDashboardLayout` selalu berasumsi bahwa pemeriksaan sesi yang gagal berarti pengalihan akan segera terjadi, sehingga sengaja berhenti untuk menghindari kedipan konten. Halaman berbagi memanggil pemeriksaan sesi yang sama, tetapi saat resolusi berbagi gagal, halaman tersebut sengaja tidak menerima pengalihan agar dapat menampilkan tampilan cadangannya sendiri. Opsi composer baru `requireAccountSession` (defaultnya sesuai perilaku sebelumnya di tempat lain) memungkinkan halaman berbagi keluar dari penghentian ini agar layar kedaluwarsa/dihapusnya sendiri dapat ditampilkan.

## Perbaikan CSS Dasar yang Hilang pada Halaman Meeting yang Dibagikan

Halaman meeting yang dimuat di dalam tautan berbagi tertekan menjadi kartu berukuran kecil default alih-alih tata letak halaman penuh. Ukuran grid aplikasi yang dimuat pada halaman berbagi menggunakan `max: ["full", "full"]`, yang bukan token yang dikenali di page composer (hanya nilai skalar `max: "full"` yang mengaktifkan tata letak lebar penuh) dan secara diam-diam kembali ke kartu kecil default. Ukuran grid elemen berbagi kini menjadi `max: "full"` untuk aplikasi yang dimuat, dan composer internal halaman Jitsi Meet sendiri kini juga menerima `frameless: true` saat dirender di dalam tampilan berbagi, agar sesuai dengan composer halaman berbagi luarnya alih-alih mempertahankan padding bergaya kartu normalnya.

## Perbaikan Akses Chat Meeting untuk Tamu

Tamu yang bergabung ke meeting melalui tautan berbagi diblokir dari chat meeting. Dua penyebab utama telah diperbaiki:

- **Meeting yang dibuat tanpa peserta lain tidak pernah mendapatkan ruang chat.** Meeting sering dibuat sendirian dan dibagikan setelahnya, tetapi pembuatan ruang chat memerlukan setidaknya dua akun nyata. Kapabilitas resolusi ruang chat kini menerima opsi `allowSingleMember`, dan pembuatan meeting menggunakannya sehingga meeting yang dihosting sendirian tetap mendapatkan ruang chat yang dapat diakses tamu.
- **Tautan berbagi yang dibuat sebelum instance pertama meeting selalu gagal sebagai "kedaluwarsa".** Pemeriksaan akses berbagi mengharuskan id instance meeting yang tercatat pada tautan sama persis dengan id instance meeting saat ini, tetapi tautan yang dibagikan lebih awal belum memiliki id instance. Pemeriksaan kini hanya menolak tautan saat tautan dan meeting sama-sama memiliki id instance konkret yang berbeda (yaitu meeting telah dimulai ulang sejak tautan dibuat).

## Ikon Salin Tautan Menggunakan Fungsi Bantuan Papan Klip Bersama

Fungsi bantuan salin papan klip yang sebelumnya diduplikasi di dalam popup kesalahan runtime kini dipromosikan menjadi utilitas generik `copyTextToClipboard` di `src/ui/reuse/clipboard.js`. Ikon salin tautan pada popup tautan berbagi serta tindakan salin otomatis saat pembuatan tautan kini keduanya menggunakan fungsi ini alih-alih memanggil `navigator.clipboard.writeText` secara langsung, sehingga API papan klip yang hilang/diblokir menghasilkan notifikasi kesalahan alih-alih gagal secara diam-diam.

## Tampilan Tamu Tidak Lagi Menampilkan Panel Pencarian Peserta

Panel pencarian peserta / rapat aktif pada halaman Jitsi Meet sebelumnya selalu disertakan dalam tata letak halaman, bahkan untuk tamu yang bergabung melalui tautan berbagi, yang tidak memiliki akun dan tidak dapat menggunakannya. Panel tersebut kini sepenuhnya dihilangkan saat halaman dirender dalam tampilan berbagi/tamu, bukan hanya disembunyikan di balik rendering yang dijaga.

## Daftar Tautan Berbagi Kini Mencerminkan Kedaluwarsa Setelah Rapat Dimulai Ulang

Popup tautan berbagi menampilkan tautan dari instans rapat sebelumnya sebagai "Aktif" meskipun tamu yang menggunakannya sudah ditolak sebagai kedaluwarsa oleh pemeriksaan akses, karena titik akhir daftar hanya melihat waktu kedaluwarsa setiap token dan tidak pernah membandingkan ID instans rapat yang tersimpan dengan instans rapat saat ini. Gateway berbagi kini menampilkan metadata tersimpan setiap token, dan daftar berbagi rapat kini menandai tautan mana pun yang ID instansnya tidak lagi cocok dengan instans rapat saat ini sebagai "Kedaluwarsa", sehingga host dan peserta melihat status yang akurat alih-alih tautan mati yang tampak aktif.

## Poles Aksi Halaman Share

Baris tautan share kini menyalin URL melalui tombol eksplisit, bukan berperilaku seperti tautan navigasi. Aksi pada popup akses terbatas memakai gaya tombol netral, dan halaman share yang dimuat dapat meminta penempatan page composer dengan lebar dan tinggi penuh. Tautan share yang kedaluwarsa atau tidak tersedia kini juga menampilkan statusnya di deskripsi halaman, bukan mengulang subtitle konten bersama yang generik.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/22b2896eaf8f13d17c1161bfc12085036f2539c8
