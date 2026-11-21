# Penggunaan

Prosedur praktis untuk Utilitas Frasa Sandi.

## Prasyarat

Fitur harus menyediakan tindakan pembuatan; utilitas tidak memiliki halaman pengguna sendiri.

## Contoh

Buat frasa sandi, simpan melalui mekanisme terlindungi fitur, dan bagikan hanya kepada peserta tujuan.

```ts
const generatePassphrase = ctx.capabilities.require("reuse:generatePassphrase");
const passphrase = generatePassphrase({
    words: 6,
    separator: "-",
    capitalization: "titlecase",
});
```

Ambil kapabilitas dari konteks bootstrap modul dan minta jumlah kata serta tampilan yang diperlukan:

```js
const generatePassphrase = ctx.capabilities.require("reuse:generatePassphrase");
const passphrase = generatePassphrase({
    words: 6,
    separator: "-",
    capitalization: "titlecase",
});
```

## Hasil yang Diharapkan

Kata dipilih secara independen; pembuatan tidak menyimpan, mengirim, atau mengotorisasi rahasianya.

## Pemecahan Masalah

Nilai dibuat belum tentu tersimpan. Integrator perlu memeriksa kontrak sebelum memilih jumlah kata atau pemisah.
