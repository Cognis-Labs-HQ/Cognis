# Share Utility

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
