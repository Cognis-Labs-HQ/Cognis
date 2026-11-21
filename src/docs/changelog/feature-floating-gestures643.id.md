# Gestur Jendela Mengambang

**Cabang Fitur:** feature-floating-gestures643

## Satu pemilik gestur

Jendela mengambang menerima satu gestur pemindahan atau perubahan ukuran pada satu waktu. Sentuhan tambahan tidak menggantikannya. Melepas atau membatalkan penunjuk pemilik, atau kehilangan tangkapannya, hanya mengakhiri gestur tersebut dan mempertahankan posisi serta ukuran saat ini. Gestur berikutnya dapat dimulai seperti biasa.

## Pertahankan masa hidup jendela

Fungsi `release()` yang dikembalikan dan sinyal pembatalan opsional milik pemanggil menghapus perilaku mengambang serta melepaskan tangkapan penunjuk; keduanya tidak menghapus konten pemanggil atau memanggil callback penutupan. Hanya kontrol Tutup yang eksplisit memanggil callback tersebut. Pilih sinyal sesuai masa hidup jendela: PiP Panggilan yang persisten sengaja tidak memakai sinyal halaman, dan pemberitahuan rute saja tidak menutupnya.

Target, langkah, dan tindakan tutorial Fokus dan Menggambar yang ada tetap sama; gestur yang terputus tidak memerlukan cabang tutorial baru.

## Komit

- [2556751cee7a0648108d29335293fd912b679dae](https://github.com/Cognis-Labs-HQ/Cognis/commit/2556751cee7a0648108d29335293fd912b679dae)
- [00c10eda22a8235a1176afd7cf44b350463dc469](https://github.com/Cognis-Labs-HQ/Cognis/commit/00c10eda22a8235a1176afd7cf44b350463dc469)
- [c8f92d823295f0279a4fa94e82364214ca8b9d17](https://github.com/Cognis-Labs-HQ/Cognis/commit/c8f92d823295f0279a4fa94e82364214ca8b9d17)
