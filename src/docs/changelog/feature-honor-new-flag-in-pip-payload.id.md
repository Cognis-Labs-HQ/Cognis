# Mempertahankan rapat saat memasuki gambar-dalam-gambar

**Cabang Fitur:** work

## Menghormati permintaan untuk mempertahankan konteks penjelajahan

Jendela mengambang kini menghormati opsi penyedia `preserveBrowsingContext`. Saat peramban tidak dapat memindahkan komponen dengan API DOM yang mempertahankan status, Cognis membiarkannya di bawah induk yang ada dan menggunakan lapisan teratas di sana, alih-alih memasang ulang iframe aktifnya dan berisiko menyambungkan ulang rapat.

## Commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e75a1720
