# Referensi Teknis

Antarmuka publik dan aturan operasional Berbagi.

## Antarmuka

### Kontrak Manifest Share

Komponen yang dapat dibagikan mendeklarasikan blok `share` di manifest dengan `shareable`, `mountScriptUrl`, `stringsBaseUrl`, dan `guestApiScopes`. Halaman share memprioritaskan `mountScriptUrl` agar sumber daya bersama dapat memuat komponen halaman asli, bukan kartu statis.

### Kontrak akses terdelegasi

`share:resolveDelegatedAccess` menerima klaim tamu beserta `resourceType`, `resourceId`, dan `requiredCapability` target. Share menyelesaikan sumber daya asal token lalu menjalankan `resolve-share-delegated-access` dengan `{ source, target }`. Hook pemilik sumber daya asal hanya dapat mengizinkan dengan mengembalikan pengenal asal dan target yang persis, `sourceCapability` yang tidak kosong, serta `allowedCapabilities`. Share memverifikasi secara mandiri bahwa token asal memberikan `sourceCapability`; pengenal atau kapabilitas yang tidak cocok ditolak secara aman. Komponen target tidak pernah mengimpor atau menyebut penyedia asal.

## Konfigurasi

Manifes berbagi menyatakan renderer dan cakupan API tamu. Setiap berbagi menyimpan izin, penerima, kedaluwarsa, dan perlindungan; adapter memiliki halaman masukan.

## Perilaku

### Klien browser Berbagi

Adapter mendeklarasikan penyedia navbar sendiri yang mengikuti status aktifnya. Penemuan pengirim memakai `notify:listSenders` tanpa implementasi Gateway Notifikasi. Pemeliharaan Share berkala berhenti saat gateway nonaktif dan dilanjutkan saat aktif.

Klien browser Berbagi memungkinkan modul mengambil profil tamu berbagi yang sedang terautentikasi melalui kontrak browser publik gateway Share.

### Spesifikasi teknis

Klien memiliki `/api/v1/share/guest-profile`, mengembalikan `Response` asli, dan mengandalkan klien API host untuk autentikasi serta penanganan koneksi. Penyedianya hanya aktif bersama gateway Share, sehingga rute dependen harus mendeklarasikan `share:uiClient` ketika membutuhkannya saat pemasangan.

Komponen browser yang merender tindakan Bagikan mewajibkan `share:uiGateway` dan memanggil `mountTrigger(container, options)`. Gateway memiliki markup ikon dan label yang dilokalkan, gaya konsekuensi, penyembunyian sesi tamu, serta pegangan pembersihan; konsumen hanya menyediakan kontainer dan callback aktivasi.

### Berbagi dan Pengujian Andal

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/study/flashcards/technical).

Latihan Flashcard tamu memakai pilihan mode sementara dan menonaktifkan fitur akun serta penyimpanan tata letak. Latihan ini tidak membaca atau menulis preferensi latihan akun.

### Peninjauan dan Siklus Hidup

Adapter Share dapat mengekspor `defineContracts(ctx)`. Share memanggilnya sebelum membentuk metode, memakai registri kontrak bersama dan lingkup bootstrap milik adapter. Metode yang tidak valid membatalkan definisinya dan mencatat metadata kegagalan yang aman. Definisi mengikuti penonaktifan dan pengaktifan kembali gateway.

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/study/flashcards/technical).

### Aksi Milik Penyedia

Sumber daya bersama menyediakan `page.mountScriptUrl` dengan ekspor `mount(root, options)`. Fungsi mount menerima konteks berbagi, teks terlokalisasi, dan sinyal pembatalan halaman. Entrypoint yang tidak tersedia menghasilkan kesalahan renderer yang terlokalisasi.

### Ikhtisar

Gateway Share memiliki token bagikan publik untuk sumber daya Cognis. Gateway ini membuat, menampilkan, mencabut, dan menyelesaikan tautan bagikan melalui flow `ctx` kanonis sehingga gateway dan modul pemilik sumber daya dapat ikut tanpa mengimpor internal share.

### Halaman Share

Sumber daya bersama dibuka di `/share/:token`. Halaman ini memakai page composer standar dengan shell minimal, header bermerek Cognis, dan renderer yang dipilih oleh komponen pemilik.

Selama rute konten bersama yang telah diselesaikan tetap aktif, peserta dengan akses langsung yang sudah masuk dan tamu dapat menerima jendela komponen tersinkron tanpa aktivasi browser baru. Permintaan tetap melewati validasi elemen host dan siklus hidup milik broker halaman komponen.

Setelah autentikasi berbagi berhasil, halaman membatalkan hasil penemuan rute SPA anonim sebelum memasang perender sumber daya. Penyelesaian jendela komponen kemudian memuat ulang katalog halaman komponen yang aktif dengan kredensial tamu atau akun yang aktif, bukan mempertahankan cache kosong dari sebelum autentikasi.

Jendela komponen tamu juga menerima konteks Share aktif sebagai opsi pemasangan penyedia. Komponen tersemat kemudian dapat mempertahankan sesi tamu dan menggunakan cakupan sumber daya yang didelegasikan, alih-alih memperlakukan pemasangan sebagai halaman biasa khusus akun.

### Sesi Tamu

Saat token share di-resolve, gateway Share sekarang menerbitkan token akses tamu berumur pendek (`purpose: share`) yang terikat ke record share tersebut (`sub: share:<shareId>`). Halaman share menukar token ini sementara ke `localStorage` agar panggilan API dari halaman bersama yang dipasang berjalan sebagai sesi tamu anonim, lalu memulihkan token sebelumnya saat halaman ditutup. Setelah token tamu terbatas aktif, halaman Bagikan memuat penyedia kapabilitas UI host sebelum mengimpor perender sumber daya sehingga komponen bersama dapat memakai kapabilitas yang dideklarasikan seperti perenderan avatar profil.

Tamu anonim tidak pernah membuka keyring akun. Share mengaktifkan keyring tamu yang dikirim menggunakan materi sesi dari server, menjaganya tetap terbuka tanpa kata sandi pengguna selama sesi tamu, lalu menghapus brankas terenkripsi khusus sesi saat sesi berakhir. Pencarian dan penyimpanan keyring akun hanya tersedia bagi pengunjung yang masuk dengan sesi akun non-tamu tervalidasi, termasuk setelah halaman tamu disegarkan.

### Kontrol berbagi

Catatan berbagi kini membawa kontrol akses milik gateway: izin baca/tulis, penerima bertipe untuk pengguna dalam aplikasi, grup/kelas, dan penerima email, perlindungan kata sandi opsional, serta penanda watermark untuk berbagi hanya-baca. Gateway Share menyediakan rute umum untuk membuat dan memperbarui token sehingga modul meminta berbagi melalui `ctx` atau `/api/v1/share/tokens` dan tidak memiliki pengiriman penerima atau pengeditan izin sendiri. Berbagi hanya-baca memakai watermark secara default, sementara berbagi dengan izin tulis menghapus default itu kecuali pemanggil secara eksplisit mempertahankannya. Perender tombol milik gateway selalu memasangkan ikon berbagi kanonis dengan label Bagikan yang dilokalkan.

`PATCH /api/v1/share/tokens/:id` mempertahankan `grantedCapabilities` jika dihilangkan dan menggantinya jika array diberikan; `[]` mencabut semua izin. Batasan penerima, kata sandi, dan adaptor tetap berlaku. Pemilik sumber daya merekonsiliasi akses yang dikirim setelah pembaruan dan mengotorisasi permintaan berdasarkan izin saat ini.

### Adapter metode berbagi

Popup menemukan metode berbagi dari adapter gateway Share dan menampilkannya dalam baris metode. Tautan dan Pengguna masing-masing memiliki penyiapan masukan serta halaman popup, sedangkan riwayat difilter berdasarkan metode terpilih.

### Kedaluwarsa dan perlindungan

Kedua metode bawaan menerima tanggal dan waktu kedaluwarsa yang opsional. Nilai kosong berarti tanpa batas; nilai tidak kosong yang tidak valid menolak akses. Otorisasi pengguna langsung memeriksa kedaluwarsa saat ini pada setiap akses, termasuk izin yang masih disimpan dan telah dibuka dengan kata sandi. Hashing dan verifikasi kata sandi tetap dimiliki gateway Share. Komponen sumber daya dapat menyediakan mode akses Tautan dengan izin dan kapabilitas khusus metode.

### Umpan balik pengiriman penerima dan alias kata sandi

Fasilitator berbagi dapat mengembalikan umpan balik pengiriman generik yang berisi kunci terjemahan dan URL dasar string komponen. Tindakan notifikasi terautentikasi menampilkan umpan balik tersebut sebelum menavigasi ke sumber daya yang dikirim. Setelah token terlindungi diselesaikan, Share menyimpan kata sandi terverifikasi di bawah token tautan buram dan pengenal berbagi kanonis agar komponen penerima dapat menggunakannya kembali tanpa meminta ulang.

### Pengalaman resolusi dan pencabutan

Peramban memeriksa resolusi token tanpa membuka keyring akun. Hanya tantangan `401 password_required` yang mengizinkan pemulihan keyring akun dan percobaan ulang dengan kata sandi tersimpan; respons `404` menampilkan status berbagi yang sudah tidak ada secara terlokalisasi. Setiap pencabutan berbagi memerlukan popup konfirmasi sebelum permintaan penghapusan dikirim.

### Batas jendela komponen

Halaman berbagi tautan yang terpasang dapat membuka halaman komponen yang valid secara terprogram. Otorisasi ini hanya mencakup operasi jendela peramban. Untuk akses API, gateway Share menyelesaikan delegasi secara generik melalui flow `resolve-share-delegated-access`: pemilik sumber daya asal membuktikan hubungannya dengan target yang diminta dan menyatakan kapabilitas target yang diizinkan, sementara Share memastikan token tamu memberikan kapabilitas asal yang diperlukan serta mengikat hasil ke kedua pengenal sumber daya. Share tidak pernah mengodekan pasangan sumber daya secara tetap atau memperlakukan satu berbagi sumber daya sebagai berbagi lainnya.

Halaman berbagi memeriksa sinyal setelah persiapan asinkron. Penutupan mencegah render terlambat; penonaktifan membatalkan pemeliharaan dan notifikasi kedaluwarsa berikutnya.

## Keamanan

### Batas Keamanan

Token tamu dibatasi ke satu record share, kedaluwarsa cepat (maksimal empat jam dan tidak pernah lebih lama dari token share), serta hanya membuka rute yang secara eksplisit memvalidasi cakupan share dan kapabilitasnya. Rute yang mengubah data tetap memakai pemeriksaan user/session yang ada dan menolak tamu share.

## Referensi

### Spesifikasi Teknis

| Halaman / bagian | Panduan         | Akses          |
| ---------------- | --------------- | -------------- |
| `/shares`        | Panduan Berbagi | Pengguna masuk |

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/social/messages/technical).

Daftar kosong tetap menjelaskan ikhtisar dan filter; langkah penerima dan pengelolaan tidak dihitung.
