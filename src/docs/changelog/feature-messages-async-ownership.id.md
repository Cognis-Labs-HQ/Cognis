# Pembaruan Percakapan Andal

**Cabang Fitur:** feature-messages-async-ownership

## Pertahankan Percakapan yang Dipilih

Pembaruan ruang yang terlambat tidak lagi menggantikan pilihan terbaru. Pembaruan judul, pesan, kunci, dan tindakan yang tertunda berhenti ketika tampilannya tidak lagi aktif.

## Pertahankan Draf dan Hasil Pengiriman

Pengiriman hanya menghapus versi draf yang dikirim setelah konfirmasi atau penyimpanan permanen dalam antrean. Suntingan baru dan draf ruang asal tetap tersimpan saat berpindah ruang. Pengiriman ganda tetap diblokir selama pengiriman berlangsung. Kegagalan pembaruan melaporkan bahwa pesan telah dikirim atau masuk antrean, bukan menyarankan pengiriman ulang.

## Jaga Ketepatan Jumlah Belum Dibaca

Kegagalan konfirmasi status baca tidak mengubah penanda belum dibaca dan menampilkan notifikasi terjemahan tanpa pengulangan selama kegagalan yang sama. Tutorial penulisan menjelaskan cara menulis draf berikutnya saat pesan dikirim.

Pengelola draf bersama menerima resolver jalur sumber daya opsional. Pesan menggunakan jalur ruang asal untuk membaca, menyimpan, dan menghapus draf. Halaman lain tetap memakai jalur halaman saat ini dan semua draf tetap terikat pada akun.

## Batasi Kegagalan Terlambat

Kegagalan pembaruan latar belakang menampilkan pemberitahuan terlokalisasi dan mempertahankan draf saat ini. Kegagalan berulang dicatat, tetapi pemberitahuan baru ditampilkan lagi setelah pemulihan atau pemilihan percakapan lain. Kegagalan terlambat dari ruang atau akun yang telah ditinggalkan tidak dapat menampilkan galat pengiriman lama, memulai pembacaan lanjutan, atau mengganggu percakapan saat ini. Keluar dan membuka kembali Pesan juga mengakhiri pembaruan tertunda milik tampilan lama.

Perubahan reaksi dan Muat Lebih Awal tetap terkait dengan percakapan tempat tindakan dimulai. Kegagalan pada percakapan aktif menampilkan pemberitahuan terjemahan dan dicatat tanpa isi pesan; kegagalan dari ruang, akun, atau halaman yang telah ditinggalkan diabaikan. Tindakan ini tidak dicoba ulang secara otomatis. Tutorial Pratinjau mencakup format, tautan, dan jeda baris, bukan lampiran.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/62da72d2f6e896ea7d52bf4c1ce7da15802a9966
- https://github.com/Cognis-Labs-HQ/Cognis/commit/0dd00af82a18452217745672bdc5babbf9e817a5
- https://github.com/Cognis-Labs-HQ/Cognis/commit/bf23786bfcdcc5d5f4badcdb205c9438f2401be2
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fe80f98b1ae4030a0dbbd030d7471234aafc0c5b
- https://github.com/Cognis-Labs-HQ/Cognis/commit/f434c53b4d1df2d09e57629266575411b0c51fb3
- https://github.com/Cognis-Labs-HQ/Cognis/commit/8cc2dd723c42a2552ea0653adf1e1ad8f8dd2da2
- https://github.com/Cognis-Labs-HQ/Cognis/commit/b9ee5c17977491ad6621c46fe96bc2a692004bb4
- https://github.com/Cognis-Labs-HQ/Cognis/commit/a2fc0fd084eec300b0f03b6e1a402c72c7918583
- https://github.com/Cognis-Labs-HQ/Cognis/commit/291480ff28497884e7d12a956a5b9dcbcf51a690
- https://github.com/Cognis-Labs-HQ/Cognis/commit/6c63b95a5ca6e1fc792c4e32a6a56f1e9df74b22
- https://github.com/Cognis-Labs-HQ/Cognis/commit/8369fb5aabb552af45f7c222e21c37f739bc2da1
- https://github.com/Cognis-Labs-HQ/Cognis/commit/9863f4d28c62b78bea67e0470a43b148fac6fb4c
