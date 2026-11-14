# Target Tutorial Pengaturan Modul Publik

**Cabang Fitur:** feature-module-config-tutorial-targets

## Target Tutorial Pengaturan Modul Publik

Kapabilitas publik ui:moduleTutorialTargets menyediakan settings(id), field(id,key), action(id,key), dan preview(id) selain card(id), semuanya terikat pada sinyal pemanggil. Handle pengaturan menyediakan pemilih popup untuk otorisasi modal tutorial. bindSettings(id,{signal}) mengikat persiapan dan editor ke cabang; settingsSignal(id) digunakan editor pemilik. Entri adaptor memakai adapterSettings(gateway,id) dan revealAdapter(gateway,id). Hanya pemilik yang menyelesaikan target host; popup yang ditutup atau milik modul lain tidak menyediakan target.

## Gunakan Kontrak Popup Yang Dipublikasikan

Pembatalan pengaturan memakai callback penutupan terlindungi dari onOpen; requestClose hanya tersedia pada onAction. Pengujian memodelkan perbedaan ini. Editor adaptor generik maupun khusus menerbitkan identitas gateway dan adaptor melalui pembungkus popup yang disuntikkan, sesuai pemilih dari adapterSettings(). Dialog konfirmasi bersarang mempertahankan identitasnya sendiri.

## Ikat Editor Adaptor Sebelum Target Terpasang

Pembungkus popup adaptor yang disuntikkan memiliki sinyal tutorial sejak pembukaan dimulai. Saat dibatalkan, pembungkus meminta penutupan terlindungi meskipun target tutorial berikutnya belum terpasang, termasuk editor khusus yang tidak memakai sinyal sendiri. Pembatalan selama persiapan diperiksa lagi pada onOpen, dan listener dihapus setelah editor selesai.

## Pertahankan Ikatan Pengaturan Saat Aktivasi

Pengaturan modul menangkap cabang tutorial sebelum mengaktifkan sementara modul yang dinonaktifkan dan meneruskan sinyal yang sama selama persiapan konfigurasi. Pembatalan saat aktivasi mencegah editor terbuka terlambat dan mengembalikan status nonaktif. Jika pengguna menolak penutupan terlindungi pada editor adaptor khusus, perpindahan halaman berikutnya tetap diinisialisasi secara normal tanpa mengulangi permintaan pembatalan.

## Komit

- [ad94587](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad945875c919d504058437aab92449d254d79aa8)
- [40d61ed](https://github.com/Cognis-Labs-HQ/Cognis/commit/40d61eded176b472f7040dbfcdb34d7d0067107d)
- [f9fc6e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9fc6e2b8ac572bd04bd68a3d9e1fc7fc0e34fd7)
