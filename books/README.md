# Folder buku PDF

Letakkan file PDF di folder ini, lalu daftarkan di `data/books.json`.

## Cara menambah buku
1. Unggah file PDF ke folder `books/` (contoh: `books/nahwu-wadhih-1.pdf`).
   Gunakan nama file tanpa spasi (pakai tanda `-`).
2. Buka `data/books.json`, lalu tambahkan satu blok ke dalam daftar `"books"`:

```json
{
  "title": "Nahwu Wadhih Jilid 1",
  "description": "Ringkasan singkat isi buku.",
  "category": "Buku Pelajaran",
  "marhalah": "Mubtadi 1",
  "subject": "Nahwu",
  "file": "books/nahwu-wadhih-1.pdf",
  "featured": false,
  "order": 1
}
```
Antar-blok dipisah koma. Hanya `title` dan `file` yang wajib.

## Tanpa mendaftarkan
Jika situs berjalan di `*.github.io`, PDF yang baru diunggah ke folder ini akan tetap muncul
otomatis (kategori "Umum", judul dari nama file). Bila situs memakai domain sendiri, isi
`"githubRepo": "namaakun/namarepo"` pada bagian `settings` di `data/books.json`.

Batas ukuran file lewat tampilan web GitHub: 25 MB per file (lewat Git/GitHub Desktop: 100 MB).
