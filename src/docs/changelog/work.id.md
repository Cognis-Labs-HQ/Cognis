# Wajibkan host publik

## Compose kini mewajibkan URL penerapan

Image aplikasi tidak lagi menetapkan localhost sebagai host publik. Kedua profil basis data Compose mewajibkan `EXTERNAL_HOST`, sehingga tautan autentikasi, undangan, dan pemberitahuan tidak mengarah ke komputer lokal setiap penerima.
