# Draf Notifikasi Andal

**Cabang Fitur:** feature-notify-admin-lifecycle

## Pertahankan draf hingga diputuskan

Draf notifikasi dan siaran bertahan saat halaman yang sama dirender ulang. Tetap di Sini mempertahankan pekerjaan yang belum disimpan, sedangkan Batalkan memulihkan nilai awal. Hanya Kirim Notifikasi atau Buat Siaran yang menerbitkan; Simpan pada pengaturan umum tidak. Pengiriman yang berhasil mengatur ulang draf yang tidak berubah, sementara suntingan baru dan pengiriman yang ditolak tetap tersedia.

## Pisahkan publikasi dan pemuatan ulang

Pengiriman dan perubahan status yang sedang berlangsung tidak dapat diulang. Kegagalan pemuatan ulang siaran dilaporkan terpisah dari perubahan yang berhasil dan mempertahankan daftar sebelumnya. Detail konfirmasi yang terlambat tidak dapat membuka kembali tampilan yang sudah ditutup atau diganti. Label Aktif dan Nonaktif serta panduan yang diperbarui diterjemahkan ke empat bahasa yang didukung.

Tindakan Segarkan yang terpisah hanya mencoba kembali pemuatan daftar, mempertahankan draf, dan tidak pernah mengulangi pembuatan atau perubahan status yang berhasil.

## Komit

- [d3cd50083ed212817eda70f02dbaf59d0adb60a6](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3cd50083ed212817eda70f02dbaf59d0adb60a6)
- [e9aca7eea535a572cdf46c3c5c7a385edd76bef6](https://github.com/Cognis-Labs-HQ/Cognis/commit/e9aca7eea535a572cdf46c3c5c7a385edd76bef6)
