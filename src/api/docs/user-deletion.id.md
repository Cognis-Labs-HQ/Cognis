# Hasil Penghapusan Akun

Penghapusan akun dan penyelesaian pembersihan dependensi merupakan hasil yang berbeda. Respons gagal saja tidak membuktikan bahwa akun masih ada.

## Contoh penggunaan

Kirim `DELETE /api/v1/users/:username` dengan kredensial permintaan berwenang yang biasa digunakan. Respons normal tetap HTTP 200 dengan `{"data":{"deleted":true}}`.

Jika penghapusan telah dikonfirmasi tetapi hook alur berikutnya gagal, responsnya HTTP 500 dengan `{"error":{"code":"user_deletion_cleanup_incomplete"},"data":{"deleted":true,"outcome":"committed","cleanup":"incomplete"}}`. Jangan mengulangi penghapusan untuk memperbaiki pembersihan. Periksa kegagalan yang tercatat di server dan prosedur pemulihan komponen terkait.

## Spesifikasi teknis

Nilai alur yang kembali secara normal harus memuat ID alur yang diharapkan, objek data, dan identitas peta hasil yang sama persis dengan yang ditangkap. Hasil penyelesaian yang hilang atau rusak tetap tidak diketahui meskipun bukti pemilik tersedia. Validasi penyelesaian dipisahkan dari promise alur yang ditolak; kegagalan pemrosesan hasil lokal tidak menyiratkan kegagalan pembersihan.

### Dikonfirmasi, ditolak, tidak diketahui

Penolakan yang dikonfirmasi pemilik operasi mengembalikan status 400, 403, atau 404 dengan `error.code` dan `error.message` aman yang sudah ada, `data.outcome: rejected`, dan `data.deleted: false`. Ini membedakan penolakan dari operasi parsial. Pemeriksaan yang menolak permintaan sebelum alur penghapusan dimulai mempertahankan kontrak respons sebelumnya.

Alur yang selesai dengan struktur valid tetapi pembaca bukti terikatnya melaporkan bukti tidak tersedia mempertahankan HTTP 503 dengan bidang aman `error.code` dan `error.message` yang sudah ada, keduanya bernilai `account_policy_unavailable`, serta menambahkan `data.deleted: null` dan `data.outcome: unknown`. Ini mencakup kebijakan atau bukti otorisasi yang tidak tersedia serta bukti hasil yang hilang, tidak valid, atau kedaluwarsa. Kasus yang tidak dapat dibedakan ini dapat terjadi sebelum atau sesudah penghapusan akun, sehingga 503 tidak pernah membuktikan penolakan atau `deleted: false`.

Alur yang melempar kesalahan tanpa bukti terkonfirmasi, hasil penyelesaian yang hilang atau rusak, atau akun/tindakan persistensi yang tidak cocok menghasilkan HTTP 500 dengan `error.code: user_deletion_outcome_unknown` dan data null/unknown yang sama. Alur yang selesai sekalipun tidak membuktikan keberhasilan tanpa bukti otoritatif yang sesuai.

Respons yang hilang atau tidak terbaca membuat hasil bagi pemanggil tetap tidak diketahui meskipun server telah menghapus akun. Verifikasi akun dan catatan operasional sebelum menentukan langkah berikutnya. Tidak ditemukannya akun pada pemeriksaan berikutnya saja tidak membuktikan permintaan mana yang menghapusnya. Tidak ada pengulangan otomatis atau pemutaran ulang pembersihan.

### Batas bukti dan pemulihan

API menangkap identitas peta hasil pemanggilan nyata melalui handler per pemanggilan sebelum hook otorisasi terdaftar. Hook yang ada mempertahankan urutannya dan tetap berjalan. Hanya pembaca `auth:deprovisionOutcome` yang telah diikat sebelumnya dan masih berlaku yang dapat mengonfirmasi hasil untuk input asli dan identitas pemanggilan yang tepat. Nilai tahap publik, salinan hasil, dan bukti permintaan lain tidak membuktikan penghapusan.

Respons normal 200 mengonfirmasi penghapusan setelah alur kembali; respons tersebut tidak membuat klaim baru tentang penyelesaian seluruh pekerjaan komponen terkait. Alur yang melempar kesalahan dengan bukti persistensi yang sesuai mengonfirmasi penghapusan sambil melaporkan pembersihan yang belum selesai. API mencatat kategori kegagalan yang aman, menulis satu respons terstruktur, lalu melempar ulang kesalahan asli agar batas pemulihan komponen tetap mempertahankan atribusi dan pencatatannya. Detail internal kesalahan tidak pernah dikembalikan.

### Kompatibilitas

Payload keberhasilan normal dan bentuk penolakan sebelum alur tetap sama. Penolakan alur 400/403/404 yang dikonfirmasi pemilik mempertahankan bidang kesalahan aman dan menambahkan `data.outcome: rejected`. Alur yang selesai secara valid dengan bukti tidak tersedia mempertahankan bidang kesalahan 503 yang sudah ada dan menambahkan hasil tidak diketahui. Kegagalan yang dilempar dengan hasil parsial/tidak diketahui serta hasil penyelesaian tidak valid menggunakan HTTP 500. Konsumen harus memeriksa hasil eksplisit, bukan menyimpulkan penghapusan hanya dari status.
