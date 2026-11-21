# Referensi Teknis

Antarmuka publik dan aturan operasional Kalender.

## Antarmuka

/api/v1/calendar/calendars menyediakan GET dan POST; calendars/:id PATCH dan DELETE. calendars/:id/events GET dan POST; /api/v1/calendar/calendars/:calendarId/events/:eventId GET, PATCH, dan DELETE.

## Konfigurasi

Kalender menetapkan nama, visibilitas, dan acara. Pengingat serta status memakai kontrol Kalender; ICS dan CalDAV mendaftarkan ekspornya sendiri.

## Perilaku

### Pengiriman berbagi

Calendar berkontribusi ke gateway Share melalui hook alur dan kapabilitas `ctx`. Pengiriman kepada pengguna membuat kalender bersama milik penerima dan mengembalikan URL navigasi generik beserta umpan balik berhasil terlokalisasi satu kali. Kata sandi tetap dimiliki Share dan diambil dari keyring dengan pengenal berbagi kanonis.

### Perender berbagi publik

Calendar menyediakan `/static/gateways/calendar/ui/share-renderer.js` sebagai `mountScriptUrl` untuk tautan kalender. Share meneruskan payload kalender yang telah diselesaikan, kapabilitas yang diberikan, token tamu terbatas, terjemahan, dan sinyal pembatalan kepada `mount(root, options)`. Perender adapter memasang satu kartu kalender dengan pilihan tampilan hari, minggu, bulan, dan tahun serta tabel slot waktu standar; kalender lain dan kontrol dasbor penerima tidak pernah dimuat. Kalender menyesuaikan area tampilan sambil mempertahankan tinggi minimum yang dapat digunakan, sesuai dengan halaman Kalender pengguna. Berbagi baca menampilkan acara. Berbagi `calendar:write` dapat membuat, mengedit, dan menghapus acara melalui `/api/v1/calendar/shared/:calendarId/events` dengan token tamu terbatas.

### Batas interaksi Kalender

Halaman Kalender pengguna mendelegasikan tindakan tampilan, periode, dan slot waktu dari akar halaman yang persisten sehingga render ulang composer tidak melepaskan kontrol. Pembuatan acara lebih dahulu memfilter semua kalender dengan aturan kalender tulis standar; bila tidak ada tujuan, toast terlokalisasi tentang ketiadaan kalender tulis ditampilkan sebagai pengganti formulir. Berbagi publik yang dapat ditulis mengautentikasi mutasi acara dengan token tamu terbatas.

### Integrasi shell Share

Calendar mengikuti siklus hidup berbagi rapat yang sudah terbukti: Share menghapus composer pemuatan lalu meneruskan akar halaman, konteks terselesaikan, terjemahan, dan sinyal pembatalan ke Calendar. Calendar kemudian memiliki halaman `createPageComposer` lengkap dengan header standar, kontrol tema, dan footer tanpa navigasi akun. Elemen kalender tunggal mengimpor dependensi formulir, popup, stempel waktu, dan tampilan secara langsung, sedangkan mutasi acara diautentikasi dengan token tamu terbatas yang diberikan.

### Status ketersediaan

Acara kalender memperbarui ketersediaan pengguna saat dimulai atau saat acara dibuat pada rentang waktu saat ini. Status manual yang dipilih setelah aktivasi tersebut berlaku hingga acara lain dimulai. Pengguna dapat menonaktifkan pembaruan status dari kalender melalui Pengaturan Pengguna → Umum.

### Batalkan Muatan Kalender Lama

Meninggalkan Kalender menghentikan inisialisasi yang sudah tidak berlaku sebelum mengubah halaman atau URL. Sinyal rute diteruskan ke penyusun halaman; respons kalender, acara, dan undangan yang terlambat tidak dapat membangun kembali tujuan yang telah diganti. Inisialisasi yang dibatalkan tidak menampilkan pemberitahuan kegagalan terlambat atau memulai ulang pengatur waktu ketersediaan.

### Kalender Lebih Cepat

Kalender mulai mengambil undangan bersamaan dengan daftar kalender dan memuat acara segera setelah daftar tersedia. Penyusunan halaman tetap menunggu pembacaan yang diperlukan. Kegagalan undangan mempertahankan perilaku daftar undangan kosong, dan setiap navigasi meminta data terbaru. Pemeriksaan pembatalan mencegah hasil terlambat menyusun halaman yang sudah tidak berlaku.

### Pilihan Pengingat

Pilih beberapa pengingat melalui kotak centang standar yang terlihat dan simpan semuanya sekaligus. Menghapus seluruh pilihan menonaktifkan pengingat, termasuk ketika kalender memiliki nilai bawaan. Jarak waktu pengingat khusus yang sudah ada tetap tersedia saat mengedit.

Saat membuat acara, `reminderOffsetsMinutes` yang tidak disertakan memakai nilai bawaan kalender; larik kosong menonaktifkan pengingat. Pembaruan tanpa bidang ini mempertahankan pilihan yang ada.

### Aset luring dan Kalender

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/features/technical).

### Hasil Antrean Tersimpan

Pembuatan acara dalam antrean dan suntingan berikutnya muncul di daftar serta popup detail tersimpan. Pengiriman bersamaan berbagi satu permintaan. Kegagalan aktivitas opsional, ketersediaan, atau penyegaran tampilan tidak menjadikan acara tersimpan sebagai pembuatan gagal. Pengiriman ulang memakai UUID acara yang sama dan otorisasi server terkini.

### Gaya Status Luring

Penyedia Calendar menyiapkan lembar gaya status acara yang dimuat tertunda untuk penggunaan luring pertama. Host menyiapkan gaya popup, toast, dan visibilitas rahasia bersama sehingga membuka acara tersimpan tidak bergantung pada pembukaan detailnya secara daring sebelumnya.

### Berbagi dan Pengujian Andal

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/gateways/share/technical).

### Peninjauan dan Siklus Hidup

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/gateways/share/technical).

### Aksi Milik Penyedia

Pembacaan dan perubahan Calendar tamu memakai kapabilitas `calendar:sharedClient` yang terikat siklus hidup serta alur bernama `calendar:shared:*`. Permintaan mempertahankan wewenang tamu secara eksplisit, menggabungkan pembatalan halaman dan penyedia, serta tidak pernah masuk antrean akun. Konsumen tidak menyusun endpoint berbagi sendiri.

Calendar menemukan `meetings:createMeeting` dari penyedia browser yang aktif. Penyedia memiliki permintaan pembuatan dan tujuannya; Calendar menentukan URL HTTP(S) yang valid untuk acara tanpa mengetahui ID atau rute modul. Penyedia yang tidak tersedia ditolak dan opsi rapat tetap dinonaktifkan saat offline.

### Ruang Kerja Responsif

Panel Kalender sempit menampilkan agenda berisi setiap acara dan tanggal terpilih, dengan pemilih tampilan serta tanggal yang ringkas. Panel lebar mempertahankan kisi kalender. Kolom tanggal mencapai tanggal kosong tanpa menggulir satu bulan. Kalender bersama memakai presentasi yang sama dan menegakkan akses baca saja.

Lompatan tanggal dan pemilihan tampilan bawaan memakai satu pengikatan kontrol milik Kalender untuk halaman akun maupun berbagi. Masukan tidak valid tidak mengubah tampilan, dan pendengar dilepas saat masa hidup halaman berakhir.

### Konten Seluler yang Terbaca

Kalender mempertahankan ruang yang cukup untuk agenda dan kisi waktu pada layar pendek dengan pengguliran acara secara internal. Ikon Tambah Acara di samping setiap tanggal memiliki sasaran sentuh 44px dan label yang aksesibel.

Baris Kalender pada panel samping tetap berupa entri menu. Kontrol Kalender Baru mempertahankan area sentuh 44px dan sorotan sesuai tema.

Judul periode kalender bersama mengikuti tanggal dan tampilan saat ini saat tata letak responsif dirender ulang.

Tombol tampilan memperbarui pilihan visual dan status ditekan secara bersamaan untuk setiap penyajian tanggal. Tombol tampilan menjaga pilihan visual dan status ditekan tetap selaras.

## Keamanan

Mutasi kalender memerlukan kepemilikan atau izin edit terdelegasi. Berbagi memeriksa cakupan, kedaluwarsa, dan perlindungan; pengingat memakai kategori notifikasi terdaftar saat bootstrap.

## Referensi

### Spesifikasi Teknis

| Halaman / bagian | Panduan          | Akses          |
| ---------------- | ---------------- | -------------- |
| `/calendar`      | Panduan Kalender | Pengguna masuk |

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/social/messages/technical).

Navigasi tanggal menyorot kontrol tanggal yang terlihat meski tanpa acara. Perencanaan acara menyorot satu tempat pembuatan nyata, bukan mengulangi seluruh kalender.

Langkah tanggal dan pembuatan acara memakai kontrol pada tampilan Kalender yang aktif. Perilaku agenda dan kisi dijelaskan dalam [Kalender](/docs/gateways/calendar).
