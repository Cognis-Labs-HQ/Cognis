# Perbaikan Simpan Whiteboard

## Penyimpanan snapshot diperbaiki

Snapshot elemen whiteboard kini memakai format konflik database terstruktur sehingga penyimpanan berulang memperbarui snapshot yang ada, bukan gagal karena kunci duplikat.

## Pembuatan tautan stabil

Registrasi flow berbagi tetap berada pada konteks sistem, sementara pengujian persistensi mencakup pemulihan sesi dan penyimpanan snapshot berulang.
