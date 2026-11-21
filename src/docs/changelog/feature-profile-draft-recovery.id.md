# Pemulihan Draf Profil

**Cabang Fitur:** feature-profile-draft-recovery

## Pertahankan Draf Gagal

Edit Profil mempertahankan isian persis seperti yang dimasukkan hingga server mengonfirmasi penyimpanan atau penyangga offline terikat akun menerimanya secara tahan lama. Permintaan yang ditolak, respons yang tidak terbaca, atau kegagalan penulisan penyangga menampilkan kesalahan dan mengaktifkan Simpan kembali tanpa membuang draf. Klik Simpan dan Enter berulang hanya mengirim satu permintaan tertunda; kolom dinonaktifkan sementara selama proses berlangsung. Kegagalan pembaruan kartu, bilah navigasi, atau cache nama tampilan tidak mengubah penyimpanan yang telah diterima menjadi kegagalan.

## Hormati Masa Aktif Editor

Buang, Tutup, Escape, dan latar dialog menggunakan konfirmasi perubahan belum tersimpan yang sama. Batal dalam konfirmasi mempertahankan formulir. Konfirmasi Buang menutupnya dan mengabaikan hasil terlambat; menutup tidak membatalkan permintaan yang sudah dikirim, sebagaimana dijelaskan notifikasi informasi. Hasil penyimpanan menunggu keputusan pembuangan yang terbuka sebelum memperbarui halaman. Navigasi, pemuatan halaman baru, pergantian akun atau sesi, dan penutupan dialog membatalkan kewenangan hasil editor lama. Pembukaan ulang memakai profil terakhir yang diterima, dengan pengenal kolom dan label unik bahkan selama animasi penutupan dialog lama. Draf yang belum dikirim tidak disimpan melewati navigasi atau muat ulang.

Editor milik Profil menggunakan alur ctx `social:profile:request` yang ada serta mempertahankan gerbang validasi kolom, kepemilikan fokus dialog bersama, dan kebijakan pengiriman offline. Uji DOM sintetis menjalankan pemuatan halaman, dialog, pembuat formulir, dan alur permintaan terdaftar yang sebenarnya dengan transportasi serta penyimpanan terkendali. Uji ini tidak membuktikan tata letak peramban nyata atau perilaku server dan basis data.

Pemeriksaan publikasi UI menelusuri pembuat formulir kiriman yang benar-benar dipasang melalui nilai kembalian fungsi pembuat milik komponen. Kasus uji statis positif dan negatif menolak fungsi pembuat yang hilang, tidak digunakan, tertutupi atau ditetapkan ulang, nilai kembalian yang melewati pembuat bersama, serta penangan pengiriman tanpa pasangan. Pemeriksaan formulir langsung dan cakupan pemindaian tetap sama.

## Komit

- [32c9d98c20195e3dafa77f544ff01eca85dc3c9d](https://github.com/Cognis-Labs-HQ/Cognis/commit/32c9d98c20195e3dafa77f544ff01eca85dc3c9d)
- [52584bd588518e3ae7c2527df85466c10c7cf47a](https://github.com/Cognis-Labs-HQ/Cognis/commit/52584bd588518e3ae7c2527df85466c10c7cf47a)
- [c24abd04d518430c69b3e6cae8d5a60aef48121a](https://github.com/Cognis-Labs-HQ/Cognis/commit/c24abd04d518430c69b3e6cae8d5a60aef48121a)
- [bc8caea0fe96ea2133554b84f1b96dd91ea50e92](https://github.com/Cognis-Labs-HQ/Cognis/commit/bc8caea0fe96ea2133554b84f1b96dd91ea50e92)
- [97fa839346ae3592c93a2d07144688d250d7f4bc](https://github.com/Cognis-Labs-HQ/Cognis/commit/97fa839346ae3592c93a2d07144688d250d7f4bc)
