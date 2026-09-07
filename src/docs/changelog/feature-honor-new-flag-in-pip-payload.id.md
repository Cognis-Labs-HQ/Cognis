# Mempertahankan rapat saat memasuki gambar-dalam-gambar

**Cabang Fitur:** feature-honor-new-flag-in-pip-payload

## Menghormati permintaan untuk mempertahankan konteks penjelajahan

Jendela mengambang kini menghormati opsi penyedia `preserveBrowsingContext`. Saat peramban tidak dapat memindahkan komponen dengan API DOM yang mempertahankan status, Cognis membiarkannya di bawah induk yang ada dan menggunakan lapisan teratas di sana, alih-alih memasang ulang iframe aktifnya dan berisiko menyambungkan ulang rapat.

## Komit

- [bae46cbe](https://github.com/Cognis-Labs-HQ/Cognis/commit/bae46cbe55f7352a4fe023e859a2b0502c2fa9db)
