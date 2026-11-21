# Penggunaan

Prosedur praktis untuk Pengiriman Email.

## Prasyarat

Administrator memerlukan akses SMTP dan alamat pengirim yang disetujui.

## Contoh

Masukkan host, port, enkripsi, dan pengirim; kirim email uji sebelum mengaktifkan pengiriman rutin.

```sh
cognisctl email:list --help
cognisctl email:add --help
cognisctl email:remove --help
cognisctl email:primary --help
cognisctl email:verify:send --help
```

## Hasil yang Diharapkan

Uji berhasil mengonfirmasi pengiriman ke alamat tersebut; email akun tetap mengikuti kebijakan verifikasi dan kategori.

## Pemecahan Masalah

Periksa galat pengujian, mode TLS, kredensial, dan kotak masuk. Koneksi berhasil tidak menjamin penempatan di kotak masuk.
