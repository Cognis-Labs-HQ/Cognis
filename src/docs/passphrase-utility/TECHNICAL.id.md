# Referensi Teknis

Kapabilitas frasa sandi sinkron memilih kata independen dengan keacakan kriptografis serta memvalidasi jumlah kata dan format.

## Antarmuka

reuse:generatePassphrase adalah kapabilitas ctx sinkron yang memberi string. Jumlah atau panjang invalid memicu RangeError; tipe atau kapitalisasi invalid memicu TypeError.

## Konfigurasi

words harus bilangan bulat aman 1 sampai 128. separator baku berupa tanda hubung, maksimum enam belas karakter. capitalization menerima lowercase, uppercase, atau titlecase.

## Perilaku

### Utilitas Frasa Sandi

Runtime API menyediakan `reuse:generatePassphrase` melalui `ctx` agar modul seperti Jitsi Meet dapat menghasilkan rahasia yang mudah dibaca tanpa mengimpor internal API.

### Spesifikasi teknis

Kapabilitas ini menerima jumlah kata positif melalui `words` serta kontrol opsional `separator` dan `capitalization`. Kapitalisasi dapat berupa `lowercase`, `uppercase`, atau `titlecase`; nilai bawaannya adalah kata berhuruf kecil yang dipisahkan tanda hubung.

Generator memilih setiap kata dengan keacakan kriptografis Node.js. Pemanggil sebaiknya meminta kata yang cukup untuk kebutuhan keamanannya dan tidak boleh mencatat frasa sandi yang dihasilkan.

## Keamanan

Setiap kata dipilih dengan Node crypto.randomInt. Pembuatan tidak menyimpan atau mengotorisasi rahasia; pemanggil melindunginya dan tidak mencatat hasil.

## Referensi

- [src/api/reuse/passphrase.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/reuse/passphrase.ts)
