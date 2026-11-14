# Catatan Perubahan

**Cabang Fitur:** N/A

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
- Struktur wajib di setiap berkas:
    - `# ...` — judul changelog
    - `## ...` — satu poin perubahan per heading (ditampilkan sebagai poin ringkasan)
    - isi di bawah setiap `##` — detail lengkap untuk halaman changelog

## Entri

- [create-changelog-ingestion-system](/changelogs/create-changelog-ingestion-system)
- [cleanup-strings-and-codebase](/changelogs/cleanup-strings-and-codebase)

## Komit
