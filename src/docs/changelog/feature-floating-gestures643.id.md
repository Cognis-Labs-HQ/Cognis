# Gestur Jendela Mengambang

**Cabang Fitur:** feature-floating-gestures643

## Satu pemilik gestur

Jendela mengambang menerima satu gestur pemindahan atau perubahan ukuran pada satu waktu. Sentuhan tambahan tidak menggantikannya. Melepas atau membatalkan penunjuk pemilik, atau kehilangan tangkapannya, hanya mengakhiri gestur tersebut dan mempertahankan posisi serta ukuran saat ini. Gestur berikutnya dapat dimulai seperti biasa.

## Pertahankan masa hidup jendela

Fungsi `release()` yang dikembalikan dan sinyal pembatalan opsional milik pemanggil menghapus perilaku mengambang serta melepaskan tangkapan penunjuk; keduanya tidak menghapus konten pemanggil atau memanggil callback penutupan. Hanya kontrol Tutup yang eksplisit memanggil callback tersebut. Pilih sinyal sesuai masa hidup jendela: PiP Panggilan yang persisten sengaja tidak memakai sinyal halaman, dan pemberitahuan rute saja tidak menutupnya.

Target, langkah, dan tindakan tutorial Fokus dan Menggambar yang ada tetap sama; gestur yang terputus tidak memerlukan cabang tutorial baru.

## Komit

- [73040a8f0a1c14ddc0be243655e450d3a7db8598](https://github.com/Cognis-Labs-HQ/Cognis/commit/73040a8f0a1c14ddc0be243655e450d3a7db8598)
- [e8f4f04019d75da644ce3d37df4e2624f10f4e32](https://github.com/Cognis-Labs-HQ/Cognis/commit/e8f4f04019d75da644ce3d37df4e2624f10f4e32)
