# Perbaikan Alur Share

## Tautan share whiteboard diperbaiki

Pembuatan tautan share whiteboard kini mengabaikan hasil yang tidak cocok dari modul lain yang juga memakai Share flow dan memilih hasil whiteboard yang sesuai serta terotorisasi, sehingga kesalahan 403 palsu tidak lagi muncul.

## Share meeting tetap terpisah

Hook share meeting dan Share gateway kini memilih hasil tahap yang berhasil dan cocok, bukan menganggap hasil hook pertama selalu milik resource yang diminta. Dengan begitu share whiteboard dan meeting dapat berjalan berdampingan dengan aman.
