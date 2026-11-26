# Penyedia UI Modul

**Cabang Fitur:** feature-expose-registercapabilityprovider-in-cognis

## Modul eksternal dapat menerbitkan penyedia browser

Konteks bootstrap modul eksternal kini menyediakan `registerCapabilityProvider`, sehingga gateway browser milik modul dapat masuk ke katalog penyedia UI. Registrasi penyedia terikat pada siklus hidup modul dan dihapus saat modul dinonaktifkan, dimuat ulang, atau gagal melakukan bootstrap.

## Commit

- [1213125](https://github.com/Cognis-Labs-HQ/Cognis/commit/121312516048ee5d51bfa6f378cd363264d668bb)
