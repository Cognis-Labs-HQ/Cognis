# Catatan Perubahan PR — Rapikan Struktur Direktori

## Ringkasan

Adapter Study Jepang lama di `src/adapters/study/japanese/` dihapus untuk
mengurangi struktur ganda dan membingungkan, karena konten belajar bahasa
Jepang sekarang disediakan oleh modul bahasa.

Gateway Study diperbarui agar tidak lagi memakai pengecualian legacy yang
di-hardcode saat discovery/bootstrap adapter.

Pada halaman profil, teks hint inline untuk visibilitas postingan diganti
dengan info tooltip.

## Berkas/Komponen yang Diubah

- Gateway Study:
    - `src/gateways/study/gateway.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/gateways/study/manifest.json`
- Adapter legacy yang dihapus:
    - `src/adapters/study/japanese/` (dihapus)
- UI profil:
    - `src/ui/app/profile/index.js`
    - `src/ui/styles/profile.css`

## Commit

- [e349311](https://github.com/le-firehawk/Cognis/commit/e349311)
