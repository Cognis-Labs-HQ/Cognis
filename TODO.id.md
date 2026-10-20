# Item Umpan Balik Ditunda

## Referensi Commit Study Historis

GitHub tidak dapat menyelesaikan hash implementasi singkat berikut yang sebelumnya tercantum dalam changelog PR #226. Kueri objek repositori menghasilkan null; API commit mengonfirmasi referensi yang tidak tersedia. Hash dipertahankan untuk pemulihan dari checkout asli atau arsip tinjauan. Changelog saat ini menggunakan ID commit lengkap yang dapat diselesaikan; jangan mengarang pengganti objek yang tidak tersedia.

`004b39e5`, `0287eb84`, `039dc5c1`, `05838355`, `109f583e`, `11bec51d`, `125495f3`, `17702138`, `20a83b7e`, `21e3d8ae`, `23587bd7`, `2802b0c7`, `344ccb5b`, `365d5444`, `3d525fb3`, `3e48b191`, `3f72cfb6`, `40da0c7a`, `47821a9b`, `501b4459`, `54242971`, `5c5cb3d4`, `5cd8e7ff`, `5f8b129c`, `617a2161`, `641d87a`, `64d1ac04`, `64d53397`, `65340e2d`, `698a4624`, `6d0dd4d8`, `6d6e4e53`, `71c842e2`, `7841f27`, `79e872ea`, `7b93c7dc`, `82df83ce`, `84bedc67`, `85eee85f`, `87f30e20`, `8b08718f`, `8d4c4129`, `8f63ef4a`, `9aedc46`, `9c374e3f`, `a0016fcd`, `a0af7d1a`, `a6b16d13`, `aef137a4`, `b00c41df`, `b17ebe21`, `b6dfb282`, `b996336d`, `bbed779`, `bcb4e781`, `bdd1961e`, `c8893689`, `c8c8deb9`, `d16a50d5`, `d3ba08ef`, `e397588c`, `e4f2d16d`, `e60aee76`, `e894f166`, `ea24056d`, `efd006d2`, `f2afaa13`, `f405a3e`, `fb046ce2`, `fd2d93e`.

## Study: Keandalan dan Isolasi

Penghambat penyimpanan yang tersisa: JSON dek Flashcard dan kemajuan per dek masih memakai sel TEXT tanpa batas. Impor yang valid dengan dua catatan panjang atau antrean tinjauan yang cukup besar melampaui anggaran teks. Tanda terima percobaan menggambar dan cache hasil kamus juga memerlukan pertumbuhan terbatas. Fake yang longgar tidak membuktikan keamanan penyedia. Pertahankan identitas percobaan, penjadwalan atomik, dan akses Library terkini saat mengganti penyimpanan ini; verifikasi pendaftaran awal, mulai ulang, penilaian bersamaan, serta pembatalan transaksi pada basis data nyata yang didukung sebelum penggabungan. Kesenjangan cakupan TypeScript tetap dilacak di #520. Patch ini tidak mengubah kode runtime adaptor basis data.

Orkestrasi browser belum lengkap: pembuatan dan penyuntingan Library memanggil helper HTTP gateway secara langsung (create-entry/index.js dan admin-interactions/index.js). Alur Library di server tetap ditegakkan, tetapi tindakan browser ini belum menyediakan hook before/execute/after yang dimiliki komponennya atau pengujian veto ekstensi dan pelepasan sumber daya. Lengkapi integrasi melalui komponen pemilik dan kontrak ctx publik; jangan memindahkan orkestrasi Library ke router, shell, atau host API.

Penulisan dek juga menyimpan snapshot kartu/skema lengkap meskipun kartu yang ditampilkan dan ekspor menyelesaikan ID Library terkini. Hilangkan representasi tersimpan yang berulang ini saat merancang ulang penyimpanan secara aman, sambil mempertahankan respons ekspor/berbagi dinamis dan identitas dek tersimpan.
