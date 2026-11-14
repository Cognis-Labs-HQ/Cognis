# Tutorial Terpandu

Panduan ini menjelaskan tindakan yang tersedia dalam komponen ini.

## Gunakan Panduan

Kunjungi halaman di bawah untuk memulai panduan yang belum selesai. Gunakan ? di samping judul halaman untuk mengulang panduan yang selesai; Lewati mengakhiri pengulangan.

## Spesifikasi Teknis

| Halaman / bagian    | Panduan              | Akses          |
| ------------------- | -------------------- | -------------- |
| `^/profile(?:/\|$)` | Profil dan Postingan | Pengguna masuk |

Panduan didaftarkan melalui kapabilitas publik `ui:tutorials` dengan definisi, katalog, target, dan sinyal masa hidup milik komponen. Halaman, bagian yang terlihat, dan persyaratan akses menentukan ketersediaan. Pelepasan komponen melepas panduannya. Penyajian dan penyelesaian bersama dijelaskan dalam [kontrak tutorial host](/docs/tutorials).

Identitas, postingan, dan tindakan akun menargetkan bagian profil hasil render, termasuk bagian postingan kosong. Sinyal halaman memiliki masa hidup panduan.

Posting memakai target daftar tersendiri meski editor terlihat. Sorotan aksi sosial mengikuti ukuran tombol; pratinjau editor dihilangkan pada profil lain.

Identitas dan aksi sosial muncul sebelum langkah posting dan pratinjau yang berurutan.

Pada profil Anda sendiri, Edit Profil membuka detail Anda. Jika penyimpanan gagal, perubahan tetap tersedia untuk diperbaiki dan dicoba kembali.

Foto profil tetap terlihat saat jumlah dan detail diperbarui. Buka kembali profil untuk mencoba ulang pembaruan gambar yang gagal; penghapusan yang dikonfirmasi hanya menghapus gambar terpilih. Langkah identitas mempertahankan target, urutan, dan identitas penyelesaiannya.

Inisial pada navigasi, pratinjau, dan profil memakai aturan nama dan warna yang sama. Avatar pratinjau membuka profil tersebut. Perubahan nama juga memperbarui inisial setelah kesalahan gambar. Kontrol identitas dan avatar mempertahankan target tutorial, urutan langkah, dan ID penyelesaiannya.

Pratinjau interaktif adalah dialog nonmodal bernama. Mengarahkan penunjuk tidak memindahkan fokus keyboard; kartu yang sedang fokus tetap terbuka saat penunjuk menjauh. Escape menutupnya dan mengembalikan fokus ke pemicu hanya jika fokus sebelumnya berada di dalam kartu.
