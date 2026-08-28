# Utilitas Frasa Sandi

Runtime API menyediakan `reuse:generatePassphrase` melalui `ctx` untuk modul seperti Jitsi Meet. Kapabilitas ini menerima jumlah kata positif melalui `words` serta kontrol opsional `separator` dan `capitalization`. Kapitalisasi dapat berupa `lowercase`, `uppercase`, atau `titlecase`; nilai bawaannya adalah kata berhuruf kecil yang dipisahkan tanda hubung.

Generator memilih setiap kata dengan keacakan kriptografis Node.js. Pemanggil sebaiknya meminta kata yang cukup untuk kebutuhan keamanannya dan tidak boleh mencatat frasa sandi yang dihasilkan.
