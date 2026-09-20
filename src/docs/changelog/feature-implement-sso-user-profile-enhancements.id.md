# Peningkatan Profil Eksternal

**Cabang Fitur:** feature-implement-sso-user-profile-enhancements

## Akun Eksternal Stabil

Identitas eksternal dipetakan ke satu akun lokal kanonis berlingkup penyedia sebelum pendaftaran, penyimpanan, penerbitan token, dan pembuatan profil. Handle yang dihasilkan menjaga akun seperti `x:firehawksystems`, `line:firehawksystems`, dan akun lokal `firehawksystems` tetap berbeda.

## Siklus Identitas Aman

Penghapusan akun eksternal menyimpan sidik jari identitas satu arah sebelum data akun dihapus. Autentikasi penyedia yang berhasil kemudian dapat menghapus catatan tersebut secara transaksional ketika akun berlingkup penyedia dibuat ulang, sedangkan autentikasi dan komit pendaftaran yang gagal tidak mengubah status penghapusan.

## Pengalaman Profil Penyedia

Administrasi menampilkan handle yang dihasilkan dan ikon penyedia untuk akun eksternal. Pengguna dapat meminta penyegaran profil penyedia dari banner profil, dan Cognis menyimpan media profil yang dikembalikan agar tidak berulang kali memuat gambar jarak jauh.

## Visibilitas Profil Penyedia

Sesi autentikasi eksternal dan profil yang dihasilkan dapat mengembalikan `profileVisibility`. Cognis memvalidasi nilai yang didukung dan menyimpan visibilitas yang diminta setelah pembuatan atau sinkronisasi profil.

## Penyiapan Modul yang Jelas

Modul dapat mendeklarasikan panduan aktivasi yang dilokalkan beserta target adapter. Setelah aktivasi, Cognis menampilkan langkah berikutnya yang netral terhadap penyedia dan dapat membawa administrator langsung ke area Administrasi terkait.

## Kontrol Pendaftaran Lebih Baik

Administrasi menampilkan kebijakan pendaftaran dan undangan sebagai grup radio Ya atau Tidak yang ringkas. Penyusun formulir bersama dan pelacak perubahan mengelola penyimpanan serta pembatalan secara konsisten; grup radio wajib tetap tidak valid hingga dipilih.

## Isolasi Sinkronisasi Profil

Sinkronisasi profil eksternal didaftarkan per penyedia sehingga Cognis hanya menawarkan dan menjalankannya untuk penyedia yang mengautentikasi akun saat ini. URL objek avatar dan banner yang diganti dicabut agar media lama tidak tertahan dalam memori peramban.

## Kepatuhan dan Keamanan

Ruang nama akun divalidasi sebelum pencarian, pembatalan pembuatan akun yang gagal tidak membuat catatan penghapusan, sinkronisasi profil memakai gaya tindakan destruktif, serta versi komponen dan batas dependensi tetap selaras.

## Commit

- [e852d7df7c3eef240000095422fafdad6d716042](https://github.com/Cognis-Labs-HQ/Cognis/commit/e852d7df7c3eef240000095422fafdad6d716042)
- [69ba80376c9eee932299c8ae9f49f86819f77a0d](https://github.com/Cognis-Labs-HQ/Cognis/commit/69ba80376c9eee932299c8ae9f49f86819f77a0d)
- [dac7a3c55115a645ca04a63d7a336e88c69c7673](https://github.com/Cognis-Labs-HQ/Cognis/commit/dac7a3c55115a645ca04a63d7a336e88c69c7673)
- [3691212d5088e503900b8a9f3aab8c6c1f375840](https://github.com/Cognis-Labs-HQ/Cognis/commit/3691212d5088e503900b8a9f3aab8c6c1f375840)
- [72389da57f5713401c14521893e8f0f1c540cfc7](https://github.com/Cognis-Labs-HQ/Cognis/commit/72389da57f5713401c14521893e8f0f1c540cfc7)
- [bbc6a9937ec55eb7959d2f788976bee62c222a86](https://github.com/Cognis-Labs-HQ/Cognis/commit/bbc6a9937ec55eb7959d2f788976bee62c222a86)
- [5282575c57d00af6665f5c2d4ae3a9e265b870da](https://github.com/Cognis-Labs-HQ/Cognis/commit/5282575c57d00af6665f5c2d4ae3a9e265b870da)
- [d758074ac7dae7bfaaebf4dfd956096a6679e566](https://github.com/Cognis-Labs-HQ/Cognis/commit/d758074ac7dae7bfaaebf4dfd956096a6679e566)
- [6e3830656f89213880dbcb4429ff44239f2c2bbf](https://github.com/Cognis-Labs-HQ/Cognis/commit/6e3830656f89213880dbcb4429ff44239f2c2bbf)
- [b7423a46e20c3a4cc795eebc3ff4aa765ede7fa4](https://github.com/Cognis-Labs-HQ/Cognis/commit/b7423a46e20c3a4cc795eebc3ff4aa765ede7fa4)
- [fbbbfda628ce7aed65235b1b071b921c906dd79d](https://github.com/Cognis-Labs-HQ/Cognis/commit/fbbbfda628ce7aed65235b1b071b921c906dd79d)
- [c5a50d8d4728d861e69a72e840da64ec64850b82](https://github.com/Cognis-Labs-HQ/Cognis/commit/c5a50d8d4728d861e69a72e840da64ec64850b82)
