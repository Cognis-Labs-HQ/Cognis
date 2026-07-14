# Perbaikan Berbagi Whiteboard

## Adapter berbagi dimuat

Tombol berbagi whiteboard kini mengimpor adapternya dari root modul statis sehingga popup dapat terbuka tanpa 404.

## Cakupan regresi

Pengujian sumber UI kini memastikan impor adapter berbagi memakai path statis yang disajikan, bukan subdirektori app yang tidak ada.
