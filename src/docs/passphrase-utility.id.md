# Utilitas Frasa Sandi

Runtime API menyediakan `reuse:generatePassphrase` melalui `ctx` agar modul seperti Jitsi Meet dapat menghasilkan rahasia yang mudah dibaca tanpa mengimpor internal API.

## Contoh penggunaan

Ambil kapabilitas dari konteks bootstrap modul dan minta jumlah kata serta tampilan yang diperlukan:

```js
const generatePassphrase = ctx.capabilities.require("reuse:generatePassphrase");
const passphrase = generatePassphrase({
    words: 6,
    separator: "-",
    capitalization: "titlecase",
});
```

## Spesifikasi teknis

Kapabilitas ini menerima jumlah kata positif melalui `words` serta kontrol opsional `separator` dan `capitalization`. Kapitalisasi dapat berupa `lowercase`, `uppercase`, atau `titlecase`; nilai bawaannya adalah kata berhuruf kecil yang dipisahkan tanda hubung.

Generator memilih setiap kata dengan keacakan kriptografis Node.js. Pemanggil sebaiknya meminta kata yang cukup untuk kebutuhan keamanannya dan tidak boleh mencatat frasa sandi yang dihasilkan.
