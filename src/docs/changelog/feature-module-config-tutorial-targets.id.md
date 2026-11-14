# Target Tutorial Pengaturan Modul Publik

**Cabang Fitur:** feature-module-config-tutorial-targets

## Target Tutorial Pengaturan Modul Publik

Kapabilitas publik ui:moduleTutorialTargets menyediakan settings(id), field(id,key), action(id,key), dan preview(id) selain card(id), semuanya terikat pada sinyal pemanggil. Handle pengaturan menyediakan pemilih popup untuk otorisasi modal tutorial. bindSettings(id,{signal}) mengikat persiapan dan editor ke cabang; settingsSignal(id) digunakan editor pemilik. Entri adaptor memakai adapterSettings(gateway,id) dan revealAdapter(gateway,id). Hanya pemilik yang menyelesaikan target host; popup yang ditutup atau milik modul lain tidak menyediakan target.

## Gunakan Kontrak Popup Yang Dipublikasikan

Pembatalan pengaturan memakai callback penutupan terlindungi dari onOpen; requestClose hanya tersedia pada onAction. Pengujian memodelkan perbedaan ini. Editor adaptor generik maupun khusus menerbitkan identitas gateway dan adaptor melalui pembungkus popup yang disuntikkan, sesuai pemilih dari adapterSettings(). Dialog konfirmasi bersarang mempertahankan identitasnya sendiri.

## Komit

- [ad94587](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad945875c919d504058437aab92449d254d79aa8)
- [40d61ed](https://github.com/Cognis-Labs-HQ/Cognis/commit/40d61eded176b472f7040dbfcdb34d7d0067107d)
