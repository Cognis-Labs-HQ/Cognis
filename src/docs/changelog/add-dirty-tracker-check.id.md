# Cek Kotor Popup

**Cabang Fitur:** copilot/add-dirty-tracker-check

## Prompt tutup hanya setelah edit

Popup formulir yang dilindungi sekarang memeriksa pelacak perubahan bersama sebelum membuka konfirmasi buang. Membuka formulir lalu langsung menutupnya tidak lagi menampilkan peringatan selama tidak ada perubahan.

## Pelacakan senyap untuk popup

Utilitas perubahan belum disimpan bersama sekarang dapat melacak kolom formulir popup dalam mode senyap yang tetap menyembunyikan kontrol simpan/buang mengambang. Dengan begitu, perlindungan penutupan popup memakai logika status kotor yang sama tanpa UI tambahan.

## Komit

- [88648cc](https://github.com/Cognis-Labs-HQ/Cognis/commit/88648cc411c93eaad6bba45e142bede90dbe5b0c)
