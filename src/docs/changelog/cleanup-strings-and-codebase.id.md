# Pembersihan Codebase

## Ringkasan

Kebijakan nama berkas changelog diperbarui agar menggunakan nama branch tanpa
prefiks `copilot/`, dan entri changelog ini diganti namanya sesuai aturan
tersebut.

Dokumentasi dan tautan changelog diselaraskan dengan konvensi nama berkas
berbasis nama branch.

Implementasi DB store yang bersifat spesifik fitur dipindahkan dari
`src/adapters/db/reuse/` ke gateway dan adapter yang memiliki fitur tersebut,
sesuai dengan prinsip bahwa adapter/gateway DB tidak boleh mengandung kode
milik gateway/adapter lain, dan bahwa direktori `reuse/` tidak diperbolehkan
di dalam direktori adapter.

File `.github/copilot-instructions.md` diperbarui untuk mencantumkan kedua
aturan tersebut. Kebijakan changelog juga diperbarui untuk mewajibkan entri
dalam semua bahasa aplikasi yang didukung (de, en, id, ja) pada setiap
pull request.

Diperbaiki bug kompatibilitas MariaDB pada `ensureTable()`: kolom teks yang
digunakan sebagai primary key atau unique key kini menggunakan `VARCHAR(255)`
alih-alih `TEXT`, karena MariaDB menolak kolom TEXT tanpa panjang dalam
batasan indeks atau kunci.

## Komponen dan Berkas yang Diubah

- Instruksi kontribusi AI:
    - `.github/copilot-instructions.md`
- Indeks dokumentasi/versi:
    - `src/docs/index.en.md`
    - `src/docs/versions.en.md`
    - `src/docs/versions.de.md`
    - `src/docs/versions.id.md`
    - `src/docs/versions.ja.md`
- Dokumen changelog baru:
    - `src/docs/changelog/index.en.md`
    - `src/docs/changelog/cleanup-strings-and-codebase.en.md`
- Changelog root yang dihapus:
    - `CHANGELOG.md`
- DB store yang dipindahkan (dihapus dari `src/adapters/db/reuse/`):
    - `src/api/reuse/account-store.ts`
    - `src/gateways/notify/notification-store.ts`
    - `src/gateways/db/reuse/executor-log.ts`
    - `src/adapters/notify/internal/db-store.ts`
    - `src/adapters/social/profile/store.ts`
    - `src/adapters/social/profile/preference-store.ts`
- Perbaikan adapter MariaDB:
    - `src/adapters/db/mariadb/adapter.ts`

## Commit

- [6ab293a](https://github.com/le-firehawk/Cognis/commit/6ab293a)
- [8299d2b](https://github.com/le-firehawk/Cognis/commit/8299d2b)
- [b93c948](https://github.com/le-firehawk/Cognis/commit/b93c948)
