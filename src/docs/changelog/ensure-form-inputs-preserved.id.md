# Pertahankan dan Kelola

## Ringkasan

- Nilai formulir kini tetap tersimpan bukan hanya saat render ulang responsif,
  tetapi juga saat halaman dimuat ulang penuh melalui persistensi draf per
  pengguna dan per halaman.
- Draf persisten diterapkan pada grid composer utama dan sub-composer
  bersarang.
- Jenis field dan identifier sensitif dikecualikan dari penyimpanan persisten.
- Formulir besar kini menampilkan aksi **Setel ulang draf** agar pengguna dapat
  cepat menghapus input tersimpan saat dianggap mengganggu.

## File/Komponen yang Diubah

- `src/ui/reuse/page-composer/init.js`
- `src/ui/tests/page-composer-refresh.test.js`
- `src/ui/styles/page-builder.css`
- `src/ui/languages/{en,de,id,ja}/strings.xml`
- `src/docs/page-composer.{en,de,id,ja}.md`

## Tautan Commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9888e39
- https://github.com/Cognis-Labs-HQ/Cognis/commit/b42d6d9c
- https://github.com/Cognis-Labs-HQ/Cognis/commit/1cabb35b
