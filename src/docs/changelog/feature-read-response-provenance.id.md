# Asal Hasil Pembacaan

**Cabang Fitur:** feature-read-response-provenance

## Kenali Asal Bacaan Klien

Respons GET sesi yang dideklarasikan komponen dan ditangani cache menyediakan `x-cognis-read-source`: `live` untuk pemanggil yang memulai pembacaan transport, `shared` untuk pemanggil yang bergabung dengan pembacaan yang sedang berlangsung, dan `cached` untuk hasil tersimpan atau dipulihkan. Pembacaan baru berikutnya tetap `live` meskipun muatannya sama. Pengguna cache dapat mengamati hasil pembacaan berhasil yang sama melalui callback `onSource` opsional tanpa mengubah nilai kembalian.

## Pertahankan Batas Pembacaan

Nilai ini menjelaskan hasil pembacaan pada klien, bukan revisi server, jaminan bahwa data terkini, atau keputusan otorisasi. Pemeriksaan kepemilikan, akun/sesi, dan akses yang sudah ada tetap berlaku. Muatan respons, penjadwalan cache, serta perilaku pembacaan langsung dan kesalahan tidak berubah selain penanda tambahan. Pembatalan pemilik melepaskan cuplikannya dan mencegah pembacaan tertunda menerbitkan hasil.

Permintaan yang tidak dideklarasikan, kredensial tamu, header Authorization eksplisit, dan pembacaan dengan `bufferOffline: false` mengembalikan Response asli tanpa perubahan. Response kesalahan berstatus nol atau buram juga diteruskan tanpa perubahan dan tanpa penanda tambahan. Penerima kesalahan HTTP yang dikelola memperoleh aliran isi yang dapat dibaca secara independen.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/d73e35d0f6f9cba9694995ec89682ce5ad12a0cb
- https://github.com/Cognis-Labs-HQ/Cognis/commit/16dc2c8905a60d58027478ee05145cd4763a68d8
- https://github.com/Cognis-Labs-HQ/Cognis/commit/c80591356ddf8445791f6eaf7edc686c24032d11
