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

- https://github.com/Cognis-Labs-HQ/Cognis/commit/d8e546ce544f6c9bd5bae4c680df2e19c8a44b69
