# Update Ringkasan Changelog

**Cabang Fitur:** copilot/create-changelog-ingestion-system

## Parsing Heading Changelog

Ingesti changelog rilis sekarang memakai heading `#` sebagai judul changelog
dan heading `##` sebagai poin ringkasan untuk popup rilis.

## Tampilkan Ringkasan Berpoin

Popup rilis sekarang menampilkan judul changelog dengan ringkasan berpoin dari
heading `##`. Isi detail tetap berada di halaman changelog.

## Tambah Pengaturan Positif

Pengaturan pengguna sekarang memakai kontrol positif “Tampilkan Log
Perubahan” dengan tooltip informasi:
“Tampilkan ringkasan log perubahan pada setiap rilis.”

## Dokumentasikan Aturan Changelog

Instruksi kontribusi sekarang menetapkan struktur changelog wajib, menegaskan
direktori tunggal `src/docs/changelog/`, dan mewajibkan file changelog baru
untuk setiap PR di semua bahasa yang didukung.

## Komit

- [db72267](https://github.com/Cognis-Labs-HQ/Cognis/commit/db722676f71a4fd6db477b42b735a7b0692da365)
