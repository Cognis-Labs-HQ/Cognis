# Penggunaan

Prosedur praktis untuk Pesan.

## Prasyarat

Masuk; ruang terenkripsi juga memerlukan akses keyring akun.

## Contoh

Buat ruang, pilih penerima, tulis draf, periksa Pratinjau, lalu kirim. Simpan kata-kata berulang sebagai templat bila berguna.

Impor `uiCtx`, wajibkan `social:messagesUiClient`, lalu panggil `listRoomMessages(roomId, options)`, `openPrivateRoom(payload, options)`, atau `sendRoomMessage(roomId, payload)` dari kode browser.

## Hasil yang Diharapkan

Pesan yang diakui muncul dalam riwayat. Draf bertahan saat ukuran berubah; draf terenkripsi dihapus setelah pengakuan atau antrean persisten.

## Pemecahan Masalah

Periksa keanggotaan dan keyring. Pembukaan luring memerlukan aset siap dan ruang tersimpan; riwayat belum tersimpan memerlukan koneksi.
