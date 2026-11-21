# Pembatalan pratinjau gambar

**Cabang Fitur:** feature-image-cancellation644

## Batalkan pratinjau tertunda

Pembatalan pemanggil atau penghapusan penyedia menghentikan pratinjau gambar yang tertunda tanpa menunggu persiapan bahasa atau stylesheet popup. Hasil persiapan yang terlambat tidak membuka kembali penampil yang dibatalkan atau menampilkan pesan kegagalannya. Pemanggil lain tetap berbagi persiapan secara normal.

## Pertahankan kepemilikan

Tindakan open publik ditolak dengan AbortError saat dibatalkan; penutupan yang disengaja tetap selesai secara normal. Mengganti thumbnail dengan sinyal pemanggil yang masih aktif mempertahankan tampilan gambar aslinya. Tanpa sinyal pemanggil, penampil tetap dimiliki penyedia; perubahan rute yang tidak terkait tidak menutupnya. URL gambar tetap dimiliki pemanggil. Target dan tindakan tutorial Library yang ada tidak berubah; pembatalan tidak menambah langkah pengguna.

## Komit

- [f09d6675a74b6e4f0de7f204c8ad5351f60fc918](https://github.com/Cognis-Labs-HQ/Cognis/commit/f09d6675a74b6e4f0de7f204c8ad5351f60fc918)
