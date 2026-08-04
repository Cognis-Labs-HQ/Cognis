# Perbaikan lanjutan penerapan dan pool basis data

## Pertahankan versi aset rilis

Image Docker kini mempertahankan versi aset yang diberikan saat build agar penerapan yang ditingkatkan membatalkan sumber daya statis dalam cache.

## Susun URL basis data dengan aman

Entrypoint kontainer melakukan pengodean persen pada kredensial PostgreSQL dan MariaDB sebelum menempatkannya dalam URL koneksi.

## Jaga isolasi dan versi komponen basis data

Validasi pengaturan pool kini dimiliki masing-masing adapter basis data, sedangkan versi workspace adapter dan gateway serta batas atas dependensinya telah diselaraskan.
