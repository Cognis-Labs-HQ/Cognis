# Migrasi warisan

Direktori ini adalah satu-satunya tempat untuk transformasi peningkatan lintas komponen dari format tersimpan yang usang ke kontrak Cognis saat ini. Kompatibilitas runtime tidak boleh berada di sini maupun di bagian aplikasi lainnya.

Setiap migrasi harus satu arah, idempoten, hanya dipanggil oleh pelaksana migrasi saat startup, dan mendokumentasikan versi sumber terakhir yang memerlukannya serta kondisi penghapusannya. Penangan permintaan, gateway, adaptor, modul, dan kode browser hanya boleh menggunakan format saat ini dan tidak boleh mengimpor direktori ini.

Migrasi basis data milik komponen tetap berada di samping komponennya dalam `sql/migrate/`. Jangan pindahkan kepemilikan skema ke direktori ini.
