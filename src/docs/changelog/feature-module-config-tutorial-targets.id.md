# Target Tutorial Pengaturan Modul Publik

**Cabang Fitur:** feature-module-config-tutorial-targets

## Target Tutorial Pengaturan Modul Publik

Kapabilitas publik ui:moduleTutorialTargets menyediakan settings(id), field(id,key), action(id,key), dan preview(id) selain card(id), semuanya terikat pada sinyal pemanggil. Handle pengaturan menyediakan pemilih popup untuk otorisasi modal tutorial. bindSettings(id,{signal}) mengikat persiapan dan editor ke cabang; settingsSignal(id) digunakan editor pemilik. Entri adaptor memakai adapterSettings(gateway,id) dan revealAdapter(gateway,id). Hanya pemilik yang menyelesaikan target host; popup yang ditutup atau milik modul lain tidak menyediakan target.

## Komit

- [ad94587](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad945875c919d504058437aab92449d254d79aa8)
