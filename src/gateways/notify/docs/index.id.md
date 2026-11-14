# Gateway Notifikasi

Gateway menyalurkan notifikasi melalui adapter pengirim opsional tanpa mewajibkan transport email. Adapter mengekspor `createNotificationSender()` dan mengelola konfigurasi, koneksi, antrean, serta pengiriman uji sendiri. Notifikasi dalam aplikasi tetap tersedia tanpa penyedia email.

## Contoh Penggunaan

Komponen memakai kapabilitas ctx, bukan menyimpan implementasi gateway:

- `notify:dispatch` menggunakan pengirim kategori pilihan penerima dan pengirim yang selalu aktif.
- `notify:dispatchToRole` menemukan ID akun dan mengirim berdasarkan peran.
- `notify:listSenders` mengembalikan metadata publik. `requiresVerifiedEmail` menyatakan kebutuhan email tanpa bergantung pada ID pengirim.
- `notify:registerCategory(id, label)` hanya tersedia saat bootstrap. Pengirim membuat kanal dan fungsi pengiriman terikat. Kanal bersama bertahan sampai pemilik terakhir dilepas.

Kontrak penyedia diekspor dari `@cognis/core`. Bootstrap adapter menerima kapabilitas ctx dan fungsi registrasi host terbatas, bukan gateway konkret. Pengujian menggunakan `testSender(senderId, recipient, config)`.

## Spesifikasi Teknis

### Aksi Email

Penyedia email opsional menyediakan `notify:registerEmailPurpose(id, action)`, `notify:sendEmail`, `notify:emailAvailable`, dan `notify:emailDeliveryPolicy`. Pemanggil menyediakan konten sendiri dan mendaftarkan tujuan miliknya hanya saat bootstrap. Pengiriman memerlukan tujuan tersebut, penerima, dan variabel; pengiriman tidak pernah membuat antrean. Alamat tersimpan tetap dapat dibaca tanpa penyedia email.

Verifikasi berlaku untuk akun lokal dan SSO. Kode dan token mengikat ID akun lengkap beserta alamat. Verifikasi email membaca `codeLength` dari kontrak `notify:emailDeliveryPolicy` versi 1 milik penyedia setiap kali kode diterbitkan. Dengan SMTP, pengaturan Panjang Kode pada adapter Notifikasi juga mengatur TFA Kode Email. Perubahan berlaku untuk kode berikutnya; kode yang ada mempertahankan panjang saat diterbitkan sampai digunakan, diganti, atau kedaluwarsa. Penerbitan kode gagal secara eksplisit jika pemilik kebijakan tidak tersedia, dinonaktifkan, atau belum dikonfigurasi. Gangguan pengiriman tidak membatalkan kewajiban verifikasi. Pengaturan keamanan memakai `userValidationMode: "email"` atau `"none"`.

### Siklus Hidup

Penonaktifan dan pelepasan mencabut registrasi serta pengiriman tertunda miliknya. Pengaktifan kembali membuat kanal baru tanpa mengulang pesan yang dibatalkan. Pemilik lain dari kategori bersama tetap aktif. Aksi asinkron tidak boleh mengantre setelah registrasinya dicabut atau diganti.

### Kapabilitas Browser

`notify:emailClient` menyediakan permintaan email akun sendiri, domain tepercaya, `listUserEmails` administratif, `resendUserEmail` khusus daring, dan `emailAvailable` yang terikat siklus hidup. Pengaturan, Pengguna, dan Administrasi mengambilnya melalui ctx. Penyedia menyimpan serta mengantre perubahan email; verifikasi tetap daring. `GET /api/v1/notify/email-delivery` memerlukan autentikasi dan hanya mengembalikan ketersediaan tanpa konfigurasi penyedia.

Mode Luring dan Broadcast berbagi tumpukan banner di atas header. Mode Luring memiliki prioritas, tidak dapat ditutup, serta menyediakan pemeriksaan koneksi dan muat ulang setelah pulih. Kebijakan konfirmasi, penerima, dan jadwal Broadcast tetap terpisah. Latar dan kemampuan menciut diatur melalui kapabilitas banner bersama.

### Kontrak Milik Penyedia

Notify memiliki tipe pengirim dan bukti pengiriman yang netral terhadap transportasi dalam `contracts/`. Deklarasi runtime khusus penyedia dan tipe aksi opsional dimiliki adapter penyumbang. Penyedia menyediakan skema konfigurasi, terjemahan, bidang bersyarat, metadata rahasia tersimpan, dan bidang pengujian; gateway meneruskannya tanpa mengasumsikan transportasi. Notify menyumbangkan kebijakan validasi surel ke Auth. Kemampuan pengiriman dan pabrik templat surel hanya tersedia jika disediakan adapter.

Bidang konfigurasi dapat menyediakan `infoKey` terlokalisasi yang opsional; editor bersama menampilkan bantuan tersebut dalam tooltip informasi di samping label. Bidang numerik kosong tidak disertakan dalam pembaruan konfigurasi, alih-alih dikonversi menjadi nol.

Penyedia dapat menerapkan hook murni opsional `normalizeConfig(patch)` untuk menormalisasi konfigurasi tanpa mengubah status runtime. Notify menggabungkan pembaruan yang dinormalisasi dengan konfigurasi tersimpan, mempertahankan bidang yang tidak disertakan, lalu menyimpan hasilnya sebelum menerapkannya pada pengirim. Jika penerapan runtime gagal, Notify menonaktifkan penyedia, memulihkan konfigurasi tersimpan sebelumnya dengan `enabled: false`, dan mengembalikan kesalahan eksplisit. Administrator harus memperbaiki konfigurasi dan memulihkan penyedia sebelum pengiriman biasa dilanjutkan.

Penyimpanan dan pembaruan konfigurasi, perubahan aktivasi, serta pemuatan ulang konfigurasi tersimpan dijalankan berurutan per pengirim, termasuk pemulihan setelah penyimpanan gagal. Pengirim yang berbeda tetap independen. Penggantian pengirim terdaftar saat pekerjaan konfigurasi masih berlangsung gagal secara eksplisit; penggantian dapat dilakukan setelah pekerjaan selesai. Listener konfigurasi berjalan setelah transaksi dilepas sehingga dapat menunggu pembaruan berikutnya. Muatan `notify:onSenderConfigChange` mengecualikan semua bidang yang dideklarasikan sebagai `password` dalam skema penyedia atau dicantumkan oleh `getConfiguredSecretFields()`, termasuk nilai yang baru dikirim. Bidang publik yang dinormalisasi dan status aktivasi tetap tersedia; listener tidak boleh bergantung pada kredensial mentah.

Registrasi kontrak adapter mengikuti [kontrak bootstrap gateway bersama](/docs/gateways).

### Berbagi dan Pengujian Andal

Administrator dapat menguji konfigurasi sebelum pengirim diaktifkan. Pengujian tidak mengaktifkan pengiriman biasa; setiap penyedia mengelola transportasi diagnostik dan pembersihannya.

### Kontrak Pengiriman Bertipe

Pemeriksaan antrean pengirim bersifat opsional dan memiliki tipe dalam kontrak Notify. Bootstrap memuat penyimpanan milik gateway secara langsung serta menyediakan operasi email dan preferensinya tanpa penegasan tipe konstruktor yang tidak lengkap. Validasi siaran menghasilkan peran dan jadwal yang valid sebelum penyimpanan.

### Email Saat Onboarding

Notify mendaftarkan notify:email:add dan notify:email:verify melalui auth:onboarding. Masukan hanya {email} dan {email, code}; identitas akun berasal dari konteks terverifikasi. Operasi memakai aturan penambahan dan verifikasi email biasa, termasuk konflik alamat, ketersediaan pengiriman, masa berlaku kode, dan jeda pengiriman. Daftar email, penghapusan, perubahan alamat utama, akses akun lain, dan administrasi tidak diizinkan.

Otoritas diperiksa kembali sebelum efek setelah pembacaan asinkron. Menonaktifkan atau menghapus Notify menghapus operasi. Operasi opsional yang tidak ada hanya boleh dilewati jika kebijakan tidak mewajibkan email; kegagalan pengiriman terdaftar tetap menjadi kesalahan. Kode dan tautan email memiliki masa berlaku sendiri dan tidak membuat sesi login. Tutorial pengaturan email pengguna yang sudah masuk tidak berubah.

Alamat mungkin sudah tersimpan saat pengiriman atau pencabutan gagal; kode yang valid dapat terpakai sebelum pemeriksaan otoritas atau kegagalan basis data berikutnya. Periksa keadaan terkini sebelum mencoba kembali.
