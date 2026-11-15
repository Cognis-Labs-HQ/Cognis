# Referensi Teknis

Antarmuka publik dan aturan operasional Autentikasi Dua Faktor.

## Antarmuka

### Arsitektur

`src/gateways/tfa/gateway.ts` mendefinisikan `CoreTfaGateway`. Kelas ini menyimpan registry adapter, mendelegasikan setup dan verifikasi khusus metode ke adapter, serta memusatkan kebijakan bersama seperti urutan metode pilihan, kode pemulihan, dan enforcement global.

Bootstrap di `src/gateways/tfa/bootstrap.ts` melakukan urutan berikut:

1. Membuat `DbTfaStore` dan memastikan schema tersedia.
2. Menemukan adapter di `src/adapters/tfa/`.
3. Memuat konfigurasi adapter yang tersimpan.
4. Mendaftarkan route API dan route admin adapter.
5. Mendaftarkan UI settings/admin milik TFA.
6. Menyumbangkan capability TFA untuk auth dan gateway lain.

### Capability

Gateway ini mendaftarkan capability berikut melalui `ctx.capabilities`:

- `tfa:getUserStatus(accountId)`
- `tfa:getLoginMethods(accountId, lifetime)`
- `tfa:verifyLogin(accountId, methodId, payload, lifetime)`
- `tfa:isSecondFactorEnabled(accountId)`
- `tfa:isSetupRequired(accountId)`
- `tfa:resetUser(accountId)`
- `tfa:getEnforceAllUsers()`
- `tfa:setEnforceAllUsers(required)`

Capability ini adalah permukaan integrasi yang didukung. Komponen lain tidak boleh mengimpor internal adapter TFA secara langsung.

`tfa:getLoginMethods(accountId)` menyiapkan tantangan hanya saat satu metode tersedia tanpa kode pemulihan yang belum digunakan. Jika tidak, UI login meminta tantangan melalui `POST /api/v1/tfa/login/resend` untuk metode awal dengan `challengeOnSelect` dan pilihan berikutnya yang belum memiliki tantangan. Tantangan dari server digunakan kembali. Kegagalan pengiriman ditampilkan dalam bahasa pengguna; log mencatat metode, akun, kesiapan, dan alasan kegagalan tanpa kode atau isi email.

### Route API

| Metode | Path                                   | Deskripsi                                  | Auth   |
| ------ | -------------------------------------- | ------------------------------------------ | ------ |
| `GET`  | `/api/v1/tfa/status`                   | Membaca status setup pengguna saat ini     | Bearer |
| `GET`  | `/api/v1/tfa/methods`                  | Membaca metode dan metadata kode pemulihan | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/setup/begin`  | Memulai setup metode                       | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/setup/verify` | Memverifikasi setup                        | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/setup/cancel` | Membatalkan setup                          | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/enable`       | Mengaktifkan kembali metode tersimpan      | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/disable`      | Menonaktifkan metode                       | Bearer |
| `PUT`  | `/api/v1/tfa/methods/preferences`      | Menyimpan urutan metode pilihan            | Bearer |
| `GET`  | `/api/v1/tfa/recovery-codes`           | Membaca status kode pemulihan              | Bearer |
| `POST` | `/api/v1/tfa/recovery-codes/rotate`    | Mengganti kode pemulihan                   | Bearer |
| `POST` | `/api/v1/tfa/admin/users/:id/reset`    | Mereset status TFA pengguna                | Admin  |
| `GET`  | `/api/v1/gateways/tfa/adapters`        | Menampilkan adapter terdaftar              | Admin  |

### Kontrak Adapter

Setiap adapter di `src/adapters/tfa/<adapter-id>/` mengimplementasikan setup dan verifikasi khusus metode. Alur bersama seperti kode pemulihan, urutan preferensi, dan enforcement global tetap berada di gateway agar metode baru dapat ditambahkan tanpa menduplikasi kebijakan.

### Konfirmasi TFA Berlapis

Setelah pembatalan pendaftaran dikonfirmasi server, navigasi ditawarkan kembali ke penjaga halaman lainnya. Membuang pendaftaran tidak membuang perubahan Pengaturan yang terpisah. Mempertahankan perubahan menghentikan navigasi; membuangnya secara eksplisit melanjutkan navigasi. Halaman yang sudah dilepas tidak dapat melanjutkan navigasi pendaftaran yang tersimpan.

## Konfigurasi

Adapter mendeklarasikan metadata dan skema. Akun mengelola metode terkonfirmasi; ketersediaan penyedia menentukan metode yang dapat ditambahkan atau diuji.

## Perilaku

### TFA Gateway

Sumber bahasa adapter ditemukan dari metode terpasang, bukan daftar penyedia tetap. Metode melaporkan `invalid_verification_code` melalui kontrak kesalahan bersama; konfigurasi penerbit menjadi milik adapter.

Penyiapan yang belum selesai langsung dilindungi, bahkan sebelum kode diketik. Klik latar, Escape, tutup, Batal dan navigasi SPA menggunakan konfirmasi pembuangan bersama; mempertahankan formulir mengembalikan fokus. Navigasi dilanjutkan hanya setelah pembatalan selesai. Muat ulang menggunakan peringatan keluar browser. Pembuangan bagian pemilik menghapus pendengar dan popup; kewajiban penyiapan autentikasi tetap ditegakkan server.

### Ikhtisar

Gateway TFA memiliki semua fungsi autentikasi dua faktor di Cognis. Ia menemukan adapter metode di `src/adapters/tfa/`, menyimpan status adapter dan kode pemulihan, menentukan apakah pengguna wajib menyiapkan TFA, lalu memverifikasi faktor kedua saat login.

Gateway auth tidak mengetahui detail TOTP atau metode lain di masa depan. Gateway auth hanya memvalidasi langkah kredensial utama lalu memakai capability yang diekspor gateway TFA.

### Tanggung Jawab

- Menemukan adapter TFA dari `src/adapters/tfa/*`.
- Menyimpan konfigurasi adapter dan status aktif/nonaktif.
- Memulihkan status adapter tanpa mengaktifkan ulang adapter yang dinonaktifkan admin.
- Menyediakan route setup, enable/disable, preferensi, dan kode pemulihan.
- Menegakkan setup wajib saat kebijakan global TFA aktif untuk semua pengguna.
- Memverifikasi challenge login dan mengonsumsi kode pemulihan secara atomik.
- Mendaftarkan UI settings/admin dan aset statis milik TFA.
- Menunda pemicuan challenge (misalnya pengiriman email SMTP) hingga pengguna memilih metode secara eksplisit saat beberapa metode tersedia.

Bukan tanggung jawab gateway ini: validasi kredensial utama, kebijakan kata sandi, atau pembuatan akun.

### Kepemilikan UI

Aset browser milik TFA berada di `src/gateways/tfa/ui/`. Gateway ini mendaftarkan section settings, section administration, dan direktori aset statisnya sendiri. String khusus TOTP tetap berada di adapter TOTP di `src/adapters/tfa/totp/languages/`.

### Tampilan Metode

Setiap metode menyediakan `stringsBaseUrl` dan metadata `loginUi`: `placeholderKey`, `supportsResend`, serta `challengeOnSelect`. UI masuk menemukan nilai tersebut tanpa percabangan ID penyedia. Label konfigurasi memakai kunci terjemahan milik penyedia.

Respons tantangan login dapat menyertakan `maxLength`, bilangan bulat positif yang menjelaskan panjang tantangan yang diterbitkan. Gateway meneruskan metadata ini ke UI login, termasuk respons pengiriman ulang; konsumen tidak boleh menggantinya dengan pengaturan penyedia yang lebih baru selama tantangan tersebut masih aktif. Tantangan pengganti menyediakan panjangnya sendiri. Metadata tampilan ini tidak membuat pengaturan panjang kode milik gateway.

UI login mempertahankan waktu absolut `resendAvailableAt` yang valid saat menampilkan atau melanjutkan tantangan yang telah diterbitkan, meskipun waktunya sudah berlalu. Durasi positif `retryAfterSeconds` dihitung dari waktu tampilan saat ini hanya jika waktu absolut tidak tersedia atau tidak valid. Sebelum pengiriman ulang diizinkan, kontrolnya tetap nonaktif dan tidak mengirim permintaan. Izin pengiriman ulang tidak mengirim kode secara otomatis atau mengganti tantangan yang diterbitkan; server tetap menentukan batas pengiriman ulang dan verifikasi kode.

Saat permintaan ulang dari metode aktif selesai, layar masuk menampilkan hasilnya. Konfirmasi antrean atau pengiriman menjelaskan status pengiriman yang dilaporkan; respons valid tanpa konfirmasi hanya menunjukkan bahwa metode telah merespons. Hasil yang ditolak, tidak valid, atau terputus tidak membuktikan apakah pengiriman terjadi. Periksa apakah kode sudah diterima sebelum mencoba lagi. Jika upaya masuk kedaluwarsa, batalkan dan masuk kembali. Waktu tunggu tetap ditentukan server, permintaan yang belum selesai tetap terkunci, dan percobaan ulang atau email tidak dikirim otomatis.

Tindakan pengiriman ulang dan umpan balik yang tertunda tetap terikat pada akun browser dan sesi saat layar verifikasi dibuka. Perubahan akun atau token mencegah permintaan lama memperbarui layar atau mengirim ulang lagi. Terjemahan bahasa Inggris wajib yang hilang tetap menjadi kesalahan tampilan yang jelas, bukan dianggap sebagai hasil jaringan yang tidak pasti.

Saat kembali ke suatu metode, setiap konfirmasi kirim ulang yang selesai ditampilkan sekali; berpindah lalu kembali lagi tidak mengulanginya.

Pemilik halaman login Auth memberikan sinyal pembatalan ke `createTfaLoginClient({ baseI18n, root, signal, lifecycleVersion })`. Meninggalkan halaman, mengganti formulir atau percobaan login, atau berhasil membatalkan langsung melepas pendengar peristiwa penyimpanan, penangan kirim ulang, dan penghitung waktu tunggu, meskipun permintaan belum selesai. Pembatalan yang gagal mempertahankan formulir aktif. Pembersihan UI tidak membatalkan efek permintaan yang sudah dikirim atau menjamin pengiriman berhenti.

Auth 2.2.14 dan TFA 1.3.14 memerlukan penerapan JavaScript dan aset secara bersama. Modul integrasi TFA wajib mengekspor `loginLifecycleVersion = 1`. Pembuat klien memerlukan `lifecycleVersion: 1` dan `AbortSignal` asli; klien harus menyediakan `lifecycle: { version: 1, signal }` dengan sinyal yang sama serta `refreshPrompt()`. Kontrak yang hilang atau tidak cocok ditolak sebelum formulir dapat mengirim permintaan, disertai kesalahan login dan diagnostik masa aktif terstruktur. Auth 2.2.13 dan TFA 1.3.13 belum memiliki kontrak ini. Perbarui kedua paket beserta aset yang disajikan dan dibundel, lalu muat ulang tab Login lama. Pengganti integrasi login TFA dari pihak ketiga harus menerapkan kontrak sebelum rilis ini diaktifkan; tidak ada jalur kompatibilitas tanpa pembersihan. Login tanpa TFA dan deskriptor penyedia metode tidak berubah.

Selama kirim ulang belum selesai, tindakan menampilkan “Meminta kode…” dan status sibuk. Tindakan tetap terkunci tanpa membuat tenggat baru atau mencoba ulang otomatis. Jika kirim ulang selesai saat pembatalan berlangsung lalu pembatalan gagal, formulir yang sama menyelaraskan hasil, kunci permintaan, dan tenggat yang diterbitkan. Waktu tunggu relatif dari server dihitung sejak respons diterima, sehingga menunggu pembatalan tidak memulainya lagi.

Registrasi kontrak adapter mengikuti [kontrak bootstrap gateway bersama](/docs/gateways).

### Kontrol Pengelolaan Adaptor

Katalog adaptor khusus administrator di `GET /api/v1/gateways/tfa/adapters` menyediakan endpoint `config`, `enable`, dan `disable` untuk setiap metode. Perintah siklus hidup komponen menggunakan kontrol yang dipublikasikan ini untuk operasi tunggal maupun massal, tanpa menebak rute. Gateway memeriksa hak administrator pada katalog dan setiap kontrol. Metode tidak menawarkan tindakan uji karena gateway ini tidak mengimplementasikannya.

### Kepastian Sesi Akhir

Kapabilitas versi 1 `tfa:assessSession` menjalankan tahap milik TFA `readPolicy` dan `resolveChallenge` sebelum Auth menerbitkan sesi. Pendaftaran aktif tetap diwajibkan saat penyedia bermasalah dan kode pemulihan tetap tersedia. Hanya penonaktifan administrator yang tersimpan membebaskan kewajiban penyedia tersebut; metadata penerbit opsional yang hilang atau rusak tidak menonaktifkan adaptor yang valid. Kegagalan penyimpanan status atau penilaian yang tidak berfungsi pada gateway aktif yang diketahui akan menolak login. Gateway mencatat identitas kebijakannya sebelum inisialisasi agar kegagalan tidak dianggap sebagai ketidakhadiran yang disengaja. Verifikasi faktor dan penyelesaian penyiapan memanggil `auth:completeSession`; penyelesaian bersamaan hanya menghabiskan setiap percobaan sekali. Token biasa dan aktivasi profil tidak terjadi selama verifikasi tambahan masih tertunda. Auth memiliki pemeriksaan siklus hidup akhir, penerbitan token, dan pembersihan login tertunda. Lihat dokumentasi Auth untuk `auth:login` dan kontrak sesi akhir.

Host juga menyimpan bukti kegagalan yang tidak dapat dijalankan untuk gateway yang ditemukan dengan identitas manifest valid tetapi bootstrap tidak dapat diimpor. Hanya bootstrap berhasil menghapus bukti ini. Pembatalan menghapus rute dan kait penilaian yang dapat dijalankan; penonaktifan disengaja tetap diizinkan, sedangkan pengaktifan kembali tanpa inisialisasi berhasil menolak akses. Manifest hilang atau tidak valid tanpa identitas yang dapat digunakan tidak dapat diklasifikasikan oleh sinyal ini. Pemanggil Auth memakai kapabilitas versi 1 `auth:login`, bukan alur persiapan mentah.

### Batas Autentikasi Bertipe

Deklarasi Auth dan TFA kini menjelaskan peran akun, bidang identitas eksternal, perintah basis data, dan proyeksi sesi kuki yang sudah ada. Validasi batas waktu sesi tetap menerima nilai angka yang sama. Jaminan masuk dan percobaan faktor sekali pakai tidak berubah.

### Perubahan kebijakan TFA

Semua jalur penegakan TFA memakai alur kebijakan milik komponen. Menonaktifkan penegakan mencabut seluruh kredensial dengan penyiapan tertunda, termasuk kredensial lama administrator pelaksana, tanpa mengubah sesi normal. Pembersihan mendahului penulisan kebijakan dan aman diulang. Penyedia yang tidak tersedia atau kegagalan penulisan menghasilkan kegagalan; berkas token dan basis data bukan satu transaksi. Kegagalan penulisan kebijakan dapat mempertahankan kebijakan yang lebih ketat dengan kredensial tertunda yang sudah dicabut. Penggantian berkas atomik lokal tidak menjamin ketahanan terhadap kerusakan perangkat keras atau menyinkronkan beberapa proses server.

Selama penulisan kebijakan yang diserialkan, TFA menangguhkan penilaian sesi baru dan membatalkan jaminan penilaian sebelumnya. Pembacaan kebijakan yang masih berjalan tidak dapat menerbitkan token terbatas setelah pembersihan, dan penerbitan sesi normal membutuhkan jaminan terkini. Penyelesaian penyiapan memeriksa ulang kredensial asli sebelum komit akhir, sehingga token yang dicabut selama verifikasi faktor tidak dapat diperbarui menjadi sesi.

Alur kebijakan memerlukan operasi sekali pakai dan status eksekusi yang dipegang pemiliknya. Pemanggilan alur langsung dan pengulangan operasi yang ditangkap ditolak sebelum mutasi; integrasi harus memanggil kapabilitas kebijakan.

### Pengiriman tantangan berbatas waktu

Pada Email Code, “dalam antrean” berarti pengiriman belum selesai. Tunggu kode terbaru. Kirim ulang mengganti kode sebelumnya hanya setelah diterima; penolakan mempertahankannya. Setelah kegagalan pengiriman, kirim ulang secara eksplisit sebelum kedaluwarsa atau mulai login baru. Percobaan login berlaku lima menit dan penyiapan sepuluh menit. Pembatalan penyiapan hanya memengaruhi penyiapan tersebut. Melanjutkan login tidak mengirim email lagi atau memperpanjang tenggat.

### Otorisasi Target Akun

Pengelolaan lintas akun serta semua pembacaan TFA dengan pilihan target, operasi kode pemulihan, preferensi metode, pengaktifan/penonaktifan, dan pengaturan ulang administrator memerlukan kebijakan Auth `auth:authorizeAccountTarget` v1. Administrator tidak dapat mengelola administrator lain, pemilik, atau administrator pendiri. Operasi yang diizinkan bagi pemilik tetap tersedia. Kebijakan yang hilang atau metadata akun yang tidak dapat dibaca menyebabkan penolakan sebelum akses penyimpanan lanjutan. Pengelolaan pengguna tetap melarang pengelolaan diri; TFA menerima target pribadi yang tidak ditentukan atau ditentukan secara persis. Penyiapan dan detail metode tetap khusus akun sendiri. Parameter target kosong, ganda, atau tidak valid ditolak. Gunakan Pengaturan untuk keamanan akun sendiri dan administrasi Pengguna untuk akun lain yang memenuhi syarat.

### Umpan Balik Pengiriman Ulang

Saat permintaan ulang dari metode aktif selesai, layar masuk menampilkan hasilnya. Konfirmasi antrean atau pengiriman menjelaskan status pengiriman yang dilaporkan; respons valid tanpa konfirmasi hanya menunjukkan bahwa metode telah merespons. Hasil yang ditolak, tidak valid, atau terputus tidak membuktikan apakah pengiriman terjadi. Periksa apakah kode sudah diterima sebelum mencoba lagi. Jika upaya masuk kedaluwarsa, batalkan dan masuk kembali. Waktu tunggu tetap ditentukan server, permintaan yang belum selesai tetap terkunci, dan percobaan ulang atau email tidak dikirim otomatis.

Selama kirim ulang belum selesai, tindakan menampilkan “Meminta kode…” dan status sibuk. Tindakan tetap terkunci tanpa membuat tenggat baru atau mencoba ulang otomatis. Jika kirim ulang selesai saat pembatalan berlangsung lalu pembatalan gagal, formulir yang sama menyelaraskan hasil, kunci permintaan, dan tenggat yang diterbitkan. Waktu tunggu relatif dari server dihitung sejak respons diterima, sehingga menunggu pembatalan tidak memulainya lagi.

## Keamanan

Penyiapan, konfirmasi, penghapusan, dan verifikasi memakai alur terlindungi. Adapter memvalidasi tantangan; metode belum terkonfirmasi atau gagal tidak dianggap berhasil.

## Referensi

### Spesifikasi Teknis

| Halaman / bagian                       | Panduan              | Akses          |
| -------------------------------------- | -------------------- | -------------- |
| `/settings` · `#tfa-settings-panel`    | Keamanan Dua Faktor  | Pengguna masuk |
| `/administration` · `#tfa-enforcement` | Kewajiban Dua Faktor | Administrator  |

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/social/messages/technical).

Kode pemulihan dijelaskan untuk masuk saat faktor kedua tidak tersedia. Panduan penerapan menyorot sakelar, bukan seluruh panel.
