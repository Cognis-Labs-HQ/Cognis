# Klien browser Berbagi

Adapter mendeklarasikan penyedia navbar sendiri yang mengikuti status aktifnya. Penemuan pengirim memakai `notify:listSenders` tanpa implementasi Gateway Notifikasi. Pemeliharaan Share berkala berhenti saat gateway nonaktif dan dilanjutkan saat aktif.

Klien browser Berbagi memungkinkan modul mengambil profil tamu berbagi yang sedang terautentikasi melalui kontrak browser publik gateway Share.

## Contoh penggunaan

Impor `uiCtx`, wajibkan `share:uiClient`, lalu panggil `getGuestProfile()`. Periksa `Response` yang dikembalikan sebelum membaca payload JSON `{ data }`.

## Spesifikasi teknis

Klien memiliki `/api/v1/share/guest-profile`, mengembalikan `Response` asli, dan mengandalkan klien API host untuk autentikasi serta penanganan koneksi. Penyedianya hanya aktif bersama gateway Share, sehingga rute dependen harus mendeklarasikan `share:uiClient` ketika membutuhkannya saat pemasangan.

Komponen browser yang merender tindakan Bagikan mewajibkan `share:uiGateway` dan memanggil `mountTrigger(container, options)`. Gateway memiliki markup ikon dan label yang dilokalkan, gaya konsekuensi, penyembunyian sesi tamu, serta pegangan pembersihan; konsumen hanya menyediakan kontainer dan callback aktivasi.

## Berbagi dan Pengujian Andal

Hook berbagi Calendar dan Flashcards menangani hasil kosong dari penyedia sumber daya lain, sehingga tautan dan pembagian akun dapat dibuat serta dibuka ketika semua penyedia aktif. Tampilan pemuatan, status pembagian akun, dan kalender tamu memakai ukuran minimum responsif tanpa mewajibkan delapan kolom kisi, sehingga tetap dapat digunakan pada layar sempit. Pemeliharaan berbagi berjalan berurutan, menggabungkan permintaan yang tumpang tindih, menghentikan putaran yang gagal, dan mencoba lagi pada interval lima belas menit berikutnya. Penonaktifan menghentikan pekerjaan berikutnya; pengaktifan kembali melanjutkan jadwal.

Latihan Flashcard tamu memakai pilihan mode sementara dan menonaktifkan fitur akun serta penyimpanan tata letak. Latihan ini tidak membaca atau menulis preferensi latihan akun.
