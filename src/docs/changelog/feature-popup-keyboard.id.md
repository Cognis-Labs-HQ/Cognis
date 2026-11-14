# Akses Papan Ketik Dialog

**Cabang Fitur:** feature-popup-keyboard

## Navigasi Papan Ketik Dialog

Setiap dialog memiliki judul aksesibel tersendiri, termasuk konfirmasi perubahan yang belum disimpan dan dialog beberapa halaman. Tab dan Shift+Tab tetap berada di dalam dialog aktif. Mempertahankan draf mengembalikan fokus ke editor; menutup dialog terakhir mengembalikan fokus ke kontrol pembukanya yang masih tersedia, atau ke halaman jika kontrol tersebut sudah hilang. Dialog kosong mempertahankan fokus hingga kontrol tersedia. Pembatalan saat navigasi melepaskan fokus dialog tanpa mengembalikannya ke halaman lama. Animasi penutupan tidak mempertahankan kendali papan ketik. Kontrol bersama ini juga berlaku untuk dialog yang dibuka dari tutorial terpandu.

## Fokus Tutorial Terbatas

Kapabilitas tambahan `ui:popupFocus` mengoordinasikan pemilik dialog melalui `register(overlay, handlers)`, `delegate(overlay, { signal, surfaces, contains, focus, onRevoke })`, dan `restore(overlay, preferred)`. Registrasi dilakukan oleh perender dialog. Tutorial hanya mendelegasikan dialog aktif yang diterima secara eksplisit oleh langkah saat ini. Delegasi menyediakan target dan kontrol yang diizinkan, permukaan yang masih terhubung pada dokumen yang sama, serta fungsi fokus. Sinyal pembatalan wajib, penghapusan permukaan, atau penutupan dialog mencabut delegasi. Dialog yang lebih baru tetap memiliki fokus eksklusif, termasuk sebelum animasi pembukaan. Menutup atau mengulang tutorial memulihkan kendali papan ketik biasa tanpa membuka kembali halaman yang telah ditutup. Opsi `openPopup` tidak berubah.

Fungsi `onRevoke` yang wajib menghapus penangan kejadian delegasi secara sinkron sebelum fokus dikembalikan.

Fungsi delegasi bersifat sinkron, dan `contains` harus mengembalikan nilai boolean. Galat, nilai predikat yang tidak valid, hasil asinkron, atau upaya fokus rekursif mencabut delegasi, mencatat metadata diagnostik yang aman, dan memulihkan penanganan fokus biasa. Kegagalan fungsi maupun pencatatan tidak boleh menghambat penutupan dialog atau membiarkan hasilnya tertunda.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/21ec6fd954055e9850d2883e2561caebf04ac2b4
