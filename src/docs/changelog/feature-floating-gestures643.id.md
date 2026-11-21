# Gestur Jendela Mengambang

**Cabang Fitur:** feature-floating-gestures643

## Satu pemilik gestur

Jendela mengambang menerima satu gestur pemindahan atau perubahan ukuran pada satu waktu. Sentuhan tambahan tidak menggantikannya. Melepas atau membatalkan penunjuk pemilik, atau kehilangan tangkapannya, hanya mengakhiri gestur tersebut dan mempertahankan posisi serta ukuran saat ini. Gestur berikutnya dapat dimulai seperti biasa.

## Pertahankan masa hidup jendela

Fungsi `release()` yang dikembalikan dan sinyal pembatalan opsional milik pemanggil menghapus perilaku mengambang serta melepaskan tangkapan penunjuk; keduanya tidak menghapus konten pemanggil atau memanggil callback penutupan. Hanya kontrol Tutup yang eksplisit memanggil callback tersebut. Pilih sinyal sesuai masa hidup jendela: PiP Panggilan yang persisten sengaja tidak memakai sinyal halaman, dan pemberitahuan rute saja tidak menutupnya.

Target, langkah, dan tindakan tutorial Fokus dan Menggambar yang ada tetap sama; gestur yang terputus tidak memerlukan cabang tutorial baru.

## Komit

- [542505b0130b6c0399b0977f114be7e777671b8d](https://github.com/Cognis-Labs-HQ/Cognis/commit/542505b0130b6c0399b0977f114be7e777671b8d)
- [a69ef179c0ecb4727736cba606aabfa666d38cb8](https://github.com/Cognis-Labs-HQ/Cognis/commit/a69ef179c0ecb4727736cba606aabfa666d38cb8)
- [f1f303e2f57447d6524ea0605a6d20a7f3937554](https://github.com/Cognis-Labs-HQ/Cognis/commit/f1f303e2f57447d6524ea0605a6d20a7f3937554)
