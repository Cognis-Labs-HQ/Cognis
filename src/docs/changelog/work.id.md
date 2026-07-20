# Perbaikan token

## Pengarsipan admin mencabut token login

Saat administrator menonaktifkan pengguna, profil diarsipkan dan semua token login aktif untuk akun tersebut kini dicabut melalui kapabilitas gateway auth yang dipakai oleh flow pembersihan siklus hidup akun. Sebelumnya, flow tersebut mencari kapabilitas ini tetapi gateway auth tidak menerbitkannya, sehingga pengguna terarsip yang sudah masuk masih dapat bertindak sampai token mereka kedaluwarsa.
