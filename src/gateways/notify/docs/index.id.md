# Gateway Notifikasi

Gateway menyalurkan notifikasi melalui adapter pengirim opsional tanpa mewajibkan transport email. Adapter mengekspor `createNotificationSender()` dan mengelola konfigurasi, koneksi, antrean, serta pengiriman uji sendiri. Notifikasi dalam aplikasi tetap tersedia tanpa penyedia email.

## Kontrak Pengiriman

Komponen memakai kapabilitas ctx, bukan menyimpan implementasi gateway:

- `notify:dispatch` menggunakan pengirim kategori pilihan penerima dan pengirim yang selalu aktif.
- `notify:dispatchToRole` menemukan ID akun dan mengirim berdasarkan peran.
- `notify:listSenders` mengembalikan metadata publik. `requiresVerifiedEmail` menyatakan kebutuhan email tanpa bergantung pada ID pengirim.
- `notify:registerCategory(id, label)` hanya tersedia saat bootstrap. Pengirim membuat kanal dan fungsi pengiriman terikat. Kanal bersama bertahan sampai pemilik terakhir dilepas.

Kontrak penyedia diekspor dari `@cognis/core`. Bootstrap adapter menerima kapabilitas ctx dan fungsi registrasi host terbatas, bukan gateway konkret. Pengujian menggunakan `testSender(senderId, recipient, config)`.

## Aksi Email

Penyedia email opsional menyediakan `notify:registerEmailPurpose(id, action)`, `notify:sendEmail`, `notify:emailAvailable`, dan `notify:emailCodeLength`. Pemanggil menyediakan konten sendiri dan mendaftarkan tujuan miliknya hanya saat bootstrap. Pengiriman memerlukan tujuan tersebut, penerima, dan variabel; pengiriman tidak pernah membuat antrean. Alamat tersimpan tetap dapat dibaca tanpa penyedia email.

Verifikasi berlaku untuk akun lokal dan SSO. Kode dan token mengikat ID akun lengkap beserta alamat. Panjang kode berasal dari penyedia email, terpisah dari adapter TFA. Gangguan pengiriman tidak membatalkan kewajiban verifikasi. Pengaturan keamanan memakai `userValidationMode: "email"` atau `"none"`.

## Siklus Hidup

Penonaktifan dan pelepasan mencabut registrasi serta pengiriman tertunda miliknya. Pengaktifan kembali membuat kanal baru tanpa mengulang pesan yang dibatalkan. Pemilik lain dari kategori bersama tetap aktif. Aksi asinkron tidak boleh mengantre setelah registrasinya dicabut atau diganti.

## Kapabilitas Browser

`notify:emailClient` menyediakan permintaan email akun sendiri, domain tepercaya, `listUserEmails` administratif, `resendUserEmail` khusus daring, dan `emailAvailable` yang terikat siklus hidup. Pengaturan, Pengguna, dan Administrasi mengambilnya melalui ctx. Penyedia menyimpan serta mengantre perubahan email; verifikasi tetap daring. `GET /api/v1/notify/email-delivery` memerlukan autentikasi dan hanya mengembalikan ketersediaan tanpa konfigurasi penyedia.

Mode Luring dan Broadcast berbagi tumpukan banner di atas header. Mode Luring memiliki prioritas, tidak dapat ditutup, serta menyediakan pemeriksaan koneksi dan muat ulang setelah pulih. Kebijakan konfirmasi, penerima, dan jadwal Broadcast tetap terpisah. Latar dan kemampuan menciut diatur melalui kapabilitas banner bersama.

## Kontrak Milik Penyedia

Notify memiliki tipe pengirim dan bukti pengiriman yang netral terhadap transportasi dalam `contracts/`. Deklarasi runtime khusus penyedia dan tipe aksi opsional dimiliki adapter penyumbang. Penyedia menyediakan skema konfigurasi, terjemahan, bidang bersyarat, metadata rahasia tersimpan, dan bidang pengujian; gateway meneruskannya tanpa mengasumsikan transportasi. Notify menyumbangkan kebijakan validasi surel ke Auth. Kemampuan pengiriman dan pabrik templat surel hanya tersedia jika disediakan adapter.

Registrasi kontrak adapter mengikuti [kontrak bootstrap gateway bersama](/docs/gateways).

## Berbagi dan Pengujian Andal

Administrator dapat menguji konfigurasi sebelum pengirim diaktifkan. Pengujian tidak mengaktifkan pengiriman biasa; setiap penyedia mengelola transportasi diagnostik dan pembersihannya.

## Kontrak Pengiriman Bertipe

Pemeriksaan antrean pengirim bersifat opsional dan memiliki tipe dalam kontrak Notify. Bootstrap memuat penyimpanan milik gateway secara langsung serta menyediakan operasi email dan preferensinya tanpa penegasan tipe konstruktor yang tidak lengkap. Validasi siaran menghasilkan peran dan jadwal yang valid sebelum penyimpanan.

## Email Saat Onboarding

Notify mendaftarkan notify:email:add dan notify:email:verify melalui auth:onboarding. Masukan hanya {email} dan {email, code}; identitas akun berasal dari konteks terverifikasi. Operasi memakai aturan penambahan dan verifikasi email biasa, termasuk konflik alamat, ketersediaan pengiriman, masa berlaku kode, dan jeda pengiriman. Daftar email, penghapusan, perubahan alamat utama, akses akun lain, dan administrasi tidak diizinkan.

Otoritas diperiksa kembali sebelum efek setelah pembacaan asinkron. Menonaktifkan atau menghapus Notify menghapus operasi. Operasi opsional yang tidak ada hanya boleh dilewati jika kebijakan tidak mewajibkan email; kegagalan pengiriman terdaftar tetap menjadi kesalahan. Kode dan tautan email memiliki masa berlaku sendiri dan tidak membuat sesi login. Tutorial pengaturan email pengguna yang sudah masuk tidak berubah.

Alamat mungkin sudah tersimpan saat pengiriman atau pencabutan gagal; kode yang valid dapat terpakai sebelum pemeriksaan otoritas atau kegagalan basis data berikutnya. Periksa keadaan terkini sebelum mencoba kembali.
