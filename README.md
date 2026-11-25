# Markaz Lughoh Temboro (ARLIC) — versi modular

Situs statis (HTML/CSS/JS), cukup di-host di GitHub Pages.
**Jangan dibuka dengan klik dua kali dari penyimpanan HP/PC** — harus lewat alamat web (GitHub Pages).
Uji di komputer: jalankan `python -m http.server` di folder ini, buka `http://localhost:8000`.

## Struktur
| Folder / file | Isi | Kapan diganti |
|---|---|---|
| `index.html` | kerangka halaman (kecil) | jarang |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA / mode offline | jarang |
| `data/kalimat/*.json` | kalimat & ta'birot per marhalah (8 file) | koreksi materi |
| `data/nash/*.json` | hiwar & nash per marhalah (8 file) | koreksi materi |
| `data/manifest.json` | daftar file data di atas | menambah marhalah |
| `data/books.json` + `books/` | perpustakaan PDF | menambah buku |
| `games/miliarder/`, `games/sabiq/`, `games/bebek/`, `games/pacuan/` | satu folder = satu game (HTML + aset sendiri) | memperbarui game |
| `assets/js/app.js` | aplikasi utama (halaman, kuis, game bawaan) | perubahan fitur |
| `assets/js/games-hub.js` | katalog game & tombol layar penuh | game baru |
| `assets/js/library.js`, `login.js`, `config.js` | perpustakaan, login, pengaturan | sesuai kebutuhan |
| `assets/css/theme.css`, `assets/js/theme.js` | 4 tema + warna aksen + ukuran huruf + animasi (tombol "Tampilan" di header) | menambah/mengubah tema |
| `assets/css/glass.css`, `glass-motion.css`, `assets/js/glass-motion.js` | tema "Kaca" (berat) — hanya dimuat bila dipilih | jarang |
| `assets/css/*.css` lainnya | tampilan dasar | perubahan desain |

## Memperbarui sebagian
Ganti **hanya** berkas yang berubah di GitHub. Pengguna mengunduh ulang berkas itu saja
(sw.js memperbarui diam-diam dan menampilkan tombol "Muat ulang").
`sw.js` tidak perlu diubah, kecuali logikanya diubah (naikkan `VERSION`).

## Menambah buku PDF
Lihat `books/README.md`: unggah PDF ke `books/`, tambahkan 1 blok di `data/books.json`.

## Mengubah login
Buka `assets/js/login.js` (nama pengguna & password di bagian atas). Ini pembatas ringan, bukan keamanan sungguhan.

## Unggah ke GitHub lewat web
Web GitHub membatasi 100 berkas per sekali unggah. Unggah per folder
(`games/sabiq/assets/`, `games/bebek/assets/`, dst.), atau pakai GitHub Desktop agar sekaligus.
Aktifkan Pages: Settings → Pages → Branch `main` / folder `/ (root)`.

## Tampilan
Bawaan = tema **Ringan**. Pilihan pengguna disimpan di HP masing-masing. Untuk mengubah warna tema, edit blok `html[data-tema="..."]` di `assets/css/theme.css`.
