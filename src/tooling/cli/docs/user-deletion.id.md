# Penghapusan Akun lewat CLI

Perintah `user:delete` membedakan penghapusan terkonfirmasi, penolakan, dan hasil tidak pasti. Penghapusan yang telah dikirim tidak pernah diulangi secara otomatis.

## Contoh penggunaan

Jalankan `cognisctl user:delete <username>`. Prompt nama pengguna interaktif tetap tersedia. Pemeriksaan awal yang gagal berhenti sebelum DELETE dikirim. Keberhasilan normal yang terkonfirmasi menampilkan ringkasan penghapusan yang sudah ada dan keluar dengan kode 0.

Jika akun dihapus tetapi pembersihan gagal, perintah melaporkan bahwa penghapusan telah terjadi dan pembersihan belum selesai. Jangan mengulangi penghapusan untuk memperbaiki sumber daya terkait; periksa kegagalan server dan prosedur pemulihan komponen. Penghapusan yang ditolak atau tidak pasti juga keluar dengan kode 1. Teks kegagalan ditulis ke stderr; tidak ada ringkasan keberhasilan di stdout.

## Spesifikasi teknis

Penghapusan memerlukan HTTP 200 serta pengakuan yang tepat. Status HTTP sukses lainnya, termasuk 201, 202, dan 207, tetap tidak diketahui dan menghasilkan kode keluar bukan nol. Opsi publik `expectedStatus` pada `apiRequest` membatasi status sukses yang diterima bagi pemanggil yang memintanya; tanpa opsi ini, perilaku multi-2xx dan progres tetap sama, dan opsi tersebut tidak meniadakan penanganan kesalahan HTTP.

### Bukti respons

Hanya respons normal API yang tepat `{data:{deleted:true}}` diterima sebagai keberhasilan. Respons HTTP 500 `user_deletion_cleanup_incomplete` yang konsisten dengan `data.deleted: true`, `data.outcome: committed`, dan `data.cleanup: incomplete` dilaporkan sebagai penghapusan yang telah dilakukan dengan pembersihan belum selesai, bukan keberhasilan biasa.

Penolakan pemilik yang konsisten mempertahankan kombinasi kode/status 400, 403, atau 404 yang sudah ada dan menambahkan `data.deleted: false` serta `data.outcome: rejected`. Bukti yang hilang, kedaluwarsa, atau tidak tersedia, respons rusak atau bertentangan, pengakuan yang tidak ada, JSON tidak terbaca, dan kegagalan transportasi dianggap tidak diketahui. Status atau satu bidang `deleted` tidak membuktikan hasil. Kegagalan pemeriksaan awal mempertahankan diagnostik normal karena penghapusan belum dikirim.

Alur yang selesai secara valid dengan bukti tidak tersedia mempertahankan HTTP 503 `account_policy_unavailable` dan menambahkan `data.deleted: null`, `data.outcome: unknown`. Ketidakpastian akibat kesalahan yang dilempar atau hasil penyelesaian tidak valid menggunakan HTTP 500 `user_deletion_outcome_unknown`. Kedua bentuk tetap tidak diketahui bagi CLI, keluar dengan kode bukan nol, dan tidak memicu pengulangan otomatis; respons 503 tidak membuktikan bahwa akun masih ada.

Hasil tidak diketahui memerlukan pemeriksaan status akun dan catatan server sebelum memutuskan untuk mencoba lagi. Hilangnya permintaan sebelum pengiriman dan hilangnya respons setelah penghapusan tidak dapat dibedakan oleh CLI. Pemeriksaan berikutnya yang tidak menemukan akun saja tidak membuktikan operasi mana yang menghapusnya. Mengulangi perintah merupakan operasi manual baru, bukan langkah pemulihan otomatis.

### Lokalisasi dan diagnostik

Teks hasil memakai katalog XML CLI bahasa Jerman, Inggris, Indonesia, dan Jepang serta pemilihan bahasa normal. Teks pilihan yang tidak ada memakai bahasa Inggris; teks Inggris yang tidak ada menghasilkan kegagalan eksplisit. Detail internal kesalahan dan transportasi tidak dicetak sebagai penjelasan hasil. Aturan ini juga berlaku pada keluaran terperinci; mode terperinci tidak menjadikan hasil parsial atau tidak diketahui sebagai keberhasilan.
