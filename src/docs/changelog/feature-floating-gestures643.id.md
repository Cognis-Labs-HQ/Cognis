# Gestur Jendela Mengambang

**Cabang Fitur:** feature-floating-gestures643

## Satu pemilik gestur

Jendela mengambang menerima satu gestur pemindahan atau perubahan ukuran pada satu waktu. Sentuhan tambahan tidak menggantikannya. Melepas atau membatalkan penunjuk pemilik, atau kehilangan tangkapannya, hanya mengakhiri gestur tersebut dan mempertahankan posisi serta ukuran saat ini. Gestur berikutnya dapat dimulai seperti biasa.

## Pertahankan masa hidup jendela

Fungsi `release()` yang dikembalikan dan sinyal pembatalan opsional milik pemanggil menghapus perilaku mengambang serta melepaskan tangkapan penunjuk; keduanya tidak menghapus konten pemanggil atau memanggil callback penutupan. Hanya kontrol Tutup yang eksplisit memanggil callback tersebut. Pilih sinyal sesuai masa hidup jendela: PiP Panggilan yang persisten sengaja tidak memakai sinyal halaman, dan pemberitahuan rute saja tidak menutupnya.

Target, langkah, dan tindakan tutorial Fokus dan Menggambar yang ada tetap sama; gestur yang terputus tidak memerlukan cabang tutorial baru.

## Komit

- [742678fa26b97f0838d7c4de96895da5ce9aeb56](https://github.com/Cognis-Labs-HQ/Cognis/commit/742678fa26b97f0838d7c4de96895da5ce9aeb56)
- [51570e6ec3e3af22aca23ec39c338cbc4452e0c4](https://github.com/Cognis-Labs-HQ/Cognis/commit/51570e6ec3e3af22aca23ec39c338cbc4452e0c4)
