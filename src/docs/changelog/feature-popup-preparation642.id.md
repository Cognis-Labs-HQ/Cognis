# Persiapan Dialog

**Cabang Fitur:** feature-popup-preparation642

## Batalkan Pembukaan Tertunda

`openPopup` yang sudah dibatalkan mengembalikan `null` tanpa mengambil sumber daya. Pembatalan selama persiapan stylesheet atau bahasa juga segera mengembalikan `null`, tanpa membatalkan pembukaan lain atau inisialisasi bahasa bersama. Pembukaan yang gagal atau dibatalkan tidak mengambil dialog, fokus, atau kunci gulir. Kegagalan bahasa tetap dilaporkan secara eksplisit dan memungkinkan percobaan inisialisasi berikutnya.

## Coba Ulang Gaya yang Gagal

Gaya dialog berbagi `ui:popupPreparation` antara pemanggil bundel dan pemanggil yang dimuat langsung. Setiap pembukaan eksplisit berbagi satu percobaan dengan batas lima detik, termasuk hingga satu detik untuk stylesheet lengkap dalam cache atau pembaruan cache yang sedang berlangsung. Pembacaan cache yang tidak tersedia, tidak sehat, kosong, ditolak, atau macet beralih ke jaringan dalam percobaan tersebut. Tautan yang sudah dimuat digunakan kembali; tautan tertunda diamati. Kegagalan hanya menghapus tautan milik pemuat, mempertahankan tautan yang diadopsi, dan mengecualikan tautan gagal dari percobaan berikutnya. Batas waktu dan kegagalan pemuatan menolak `openPopup`, bukan melaporkan penutupan atau membuka dialog pemblokir tanpa gaya. Pemanggil aktif menerima satu toast kesalahan terlokalisasi per percobaan gagal. Pemanggil yang dibatalkan tidak menampilkan pemberitahuan terlambat. Pembukaan eksplisit berikutnya mencoba lagi; tidak ada pengulangan otomatis.

`primePopupStylesheet()` tetap memperbarui stylesheet lengkap untuk pemulihan luring, menggabungkan pembaruan bersamaan, dan mencatat kegagalan tanpa menolak. Pembaruan dibatasi lima detik. Operasi terlambat tidak dapat memasang atau mengganti gaya DOM setelah batas waktu; penulisan Cache Storage yang sudah diserahkan ke peramban tidak dapat ditarik kembali. Kegagalan persiapan cache tidak menonaktifkan pemulihan dialog berikutnya. Pratinjau berjangkar mempertahankan pengontrol sinkron, menangani kegagalan persiapan, menyembunyikan pratinjau gagal, dan mencoba lagi pada `show` berikutnya; `hide` dan `destroy` mencegah pemberitahuan terlambat. Penanganan kesalahan waktu jalan yang ada mengenali kegagalan stylesheet milik pemuat tanpa melaporkannya secara rekursif.

Target tutorial, ID penyelesaian, tindakan, Berikutnya, Kembali, Mulai Ulang, dan pemutaran ulang tidak berubah. Kontrak fokus dialog yang terlihat, dialog bertingkat, konfirmasi pembuangan, tindakan, batas waktu, dan pemulihan tetap sama. UI bersama tidak memiliki versi paket tersendiri.

Batas lima detik hanya berlaku untuk percobaan stylesheet, bukan seluruh persiapan `openPopup`. Inisialisasi bahasa yang ketat mempertahankan masa hidupnya tanpa batas waktu baru; proses ini dapat menunda pemberitahuan kegagalan terlokalisasi dan penolakan, tetapi sinyal pembukaan tetap segera membatalkan. Pratinjau berjangkar yang berhasil tidak menginisialisasi sumber daya bahasa dialog.

## Komit

- [33e8f9f12643e14ccf632fee5d992da52ce68dca](https://github.com/Cognis-Labs-HQ/Cognis/commit/33e8f9f12643e14ccf632fee5d992da52ce68dca)
- [fbe80a7378cf5f8bd256dd7a9a4360459595215a](https://github.com/Cognis-Labs-HQ/Cognis/commit/fbe80a7378cf5f8bd256dd7a9a4360459595215a)
- [a0a9bfede9e87c3df4a970548fb474fe2b373492](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0a9bfede9e87c3df4a970548fb474fe2b373492)
- [eb0d8aacccf0a89ca338795364d82e5f57700125](https://github.com/Cognis-Labs-HQ/Cognis/commit/eb0d8aacccf0a89ca338795364d82e5f57700125)
