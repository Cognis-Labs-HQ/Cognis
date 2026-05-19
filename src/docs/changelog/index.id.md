# Catatan Perubahan

## Ringkasan

Direktori ini menyimpan entri changelog sebagai satu berkas Markdown untuk
setiap pull request. Setiap berkas mencakup satu PR agar riwayat perubahan
tetap modular dan mudah diaudit.

## Format Entri

- Nama berkas: `<branch-name-without-copilot-prefix>.<bahasa>.md` untuk setiap
  bahasa yang didukung (de, en, id, ja). Contoh: branch `copilot/fix-auth-bug`
  menghasilkan `fix-auth-bug.en.md`, `fix-auth-bug.de.md`, `fix-auth-bug.id.md`,
  dan `fix-auth-bug.ja.md`
- Satu set berkas per PR (satu berkas per bahasa)
- Berisi:
    - Judul PR
    - Ringkasan
    - Komponen/berkas yang diubah
    - Tautan commit

## Entri

- [cleanup-strings-and-codebase](/changelogs/cleanup-strings-and-codebase)
