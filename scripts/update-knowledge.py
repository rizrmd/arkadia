import json,subprocess,pathlib
root=pathlib.Path('/home/dev/arkadia')
current=json.loads((root/'knowledge-current.json').read_text())
append='''

## Demo runtime PixiJS — 20 Oktober 2026

Demo live: [Buka Arkadia — Perbatasan Abu](https://arkadia-whachat.fural.space/).

Implementasi memakai **PixiJS 8 dan WebGL**, bukan gambar arena preview sebagai background. Kit asli yang diperiksa adalah attachment `DA0679ae3e0624f52236ea60ea`; `DA3593cef66dddda720f68862b` adalah preview AI dan tidak dimuat oleh aplikasi. Sumber kit utuh dapat dilihat melalui tombol **View original kit + extracted assets** dan [file sumber publik](https://arkadia-whachat.fural.space/assets/source-kit.png). [Manifest ekstraksi](https://arkadia-whachat.fural.space/assets/manifest.json) menyimpan crop, ukuran, pivot dan jumlah piksel alpha yang dibersihkan.

Dua belas sprite dipotong dari sheet 1448 × 1086. Alpha asli dipertahankan; alpha di bawah 24/255 dibuat nol. Tiga tile lantai dinormalisasi ke 128 × 64; prop memakai skala individual dan perkiraan pivot kaki (0.5, 0.91). Arena awal berisi 100 sprite lantai dan 31 prop. Sprite crack ikut diekstrak dan dapat diperiksa di galeri; belum ditempatkan di arena awal.

### Screenshot hasil runtime terbaru

![Arena PixiJS dengan grid di bawah prop; garis tertutup oleh dinding dan pohon](/api/rooms/DR4a0437307e7bf49a55f65442/attachments/DAca7888240c223eeb3e5f472a)

![Arena PixiJS tanpa grid untuk memeriksa sambungan tile dan pengulangan tekstur](/api/rooms/DR4a0437307e7bf49a55f65442/attachments/DA91565708296b4f56c3f506d9)

![Dialog sumber kit asli di demo runtime](/api/rooms/DR4a0437307e7bf49a55f65442/attachments/DAb3c2f368b94e0b911e062665)

### Cara memeriksa

- Seed awal `perbatasan-abu-01` menghasilkan hash layout `3bae31cd`. Tombol ↻ menyusun ulang seed yang sama; **Explore another seed** menghasilkan variasi tata letak.
- Drag untuk pan, scroll untuk zoom di sekitar cursor, **Reset camera** untuk kembali ke tampilan arena.
- **Tile grid** menampilkan footprint 128 × 64; **Show props** dapat dimatikan untuk memeriksa seluruh sambungan lantai.
- **Inspect sprites & pivots** menampilkan pivot kaki dan informasi sprite saat hover. Titik pivot adalah overlay diagnostik yang sengaja berada di atas.
- **Y-sort props** dapat dimatikan untuk membandingkan occlusion berdasarkan urutan pemasangan. Tombol panah menggerakkan probe amber melewati kedalaman prop; probe ini bentuk diagnostik, bukan karakter.
- **Transparency checker** mengganti bidang latar dengan checker untuk memeriksa edge alpha.

Urutan layer setelah koreksi masukan manusia: **lantai → grid → prop + probe yang diurutkan berdasarkan ground-Y → titik pivot diagnostik**. Grid sebelumnya berada di atas semua prop sehingga garis melintasi sprite; ini telah diperbaiki. Bug kedua juga diperbaiki: perubahan `zIndex` di Pixi dapat mengaktifkan sorting kembali, sehingga status toggle kini diterapkan setelah semua sprite selesai dipasang.

### Validasi yang benar-benar dilakukan

- TypeScript `tsc --noEmit` dan Vite production build berhasil; audit npm terakhir: 0 vulnerability.
- Semua 12 PNG hasil crop berisi piksel nontransparan sekaligus piksel alpha nol; HTML, manifest dan semua sprite berhasil disajikan.
- Browser Chromium dengan WebGL di URL publik: 13 pemeriksaan lulus, 0 assertion gagal. Cakupan: urutan grid di bawah prop, jumlah sprite dan sumber kit, seed yang sama stabil, seed berbeda berubah, seed dipulihkan identik, grid geometry, sorting dapat dimatikan, urutan ground-Y menaik, probe keyboard, handler pan/zoom, floor-only dan transparency checker. Pemeriksaan kamera akhir memakai event sintetis; tidak mengklaim uji sentuhan perangkat nyata.
- Screenshot di atas diambil dari halaman publik yang benar-benar merender arena, bukan hasil generasi AI. Browser terkelola awal hanya menampilkan loading; itu tidak dipakai sebagai bukti runtime. Verifikasi akhir memakai Chromium langsung dengan library yang dipasang di HOME. Konfigurasi organization runtime diperkuat agar dependensi browser dapat direproduksi.
- Custom sandbox **arkadia**, port **3000**, boot foreground **node app.mjs**, proses diawasi platform dan tetap berjalan setelah panggilan deploy. URL publik memberikan **HTTP 200**. Paket deploy satu file memuat hasil build dan aset agar proses penyalinan banyak file tidak terkena gateway timeout. Beberapa panggilan publish mengembalikan 504 walau boot akhirnya berjalan; hasilnya diverifikasi dari proses aktual, versi bundle publik dan browser. Satu respons 521 sementara juga teramati; permintaan berikutnya kembali 200, tanpa resource incident atau boot crash.

### Keterbatasan kualitas yang terlihat

- Tile masih memiliki sisi tebal/bayangan bawaan, kontur diamond tidak seragam dan sambungan gelap. Normalisasi ke 2:1 tidak menjadikannya seamless. Motif batu besar berulang jelas pada bidang luas.
- Kedua dinding menghadap arah yang hampir sama. Penempatan di dua sisi arena memperlihatkan ketidakcocokan arah; belum ada pasangan dinding modular yang menyambung dengan benar.
- Alpha awal sudah transparan, tetapi threshold bukan perbaikan tepi manual. Fringe warna, bayangan yang terpotong dan celah kecil masih mungkin terlihat saat zoom/checker.
- Pivot dan skala prop adalah perkiraan visual, bukan footprint fisik tersertifikasi. Ground-Y sort berlaku per sprite; prop besar/dinding yang berpotongan masih dapat memerlukan pemisahan sprite atau aturan occlusion tambahan.
- Belum ada collision, gameplay, karakter, NixieFX, animasi, benchmark draw call/memori, performa perangkat bergerak, atau jaminan horde. Demo membuktikan jalur **kit asli → crop transparan + manifest → sprite runtime → komposisi seeded → deploy publik**.

### Arsip sebelum koreksi layer grid

Screenshot berikut pernah ditunjukkan saat validasi awal. Garis grid masih melintasi prop; gunakan screenshot terbaru di atas untuk keadaan live sekarang.

![Arsip: grid masih berada di atas sprite sebelum koreksi](/api/rooms/DR4a0437307e7bf49a55f65442/attachments/DAbd84c714d20e30bdf547b2d1)

![Arsip dialog sumber dari validasi awal](/api/rooms/DR4a0437307e7bf49a55f65442/attachments/DA768d119343469b1f9447572a)
'''
markdown=current['markdown']+append
(root/'knowledge-published.md').write_text(markdown)
p=subprocess.run(['fural-agent','knowledge','update',current['id'],'--markdown',markdown],capture_output=True,text=True)
if p.returncode:print(p.stdout,p.stderr);raise SystemExit(p.returncode)
result=json.loads(p.stdout);print(json.dumps({'id':result.get('id'),'updated_at':result.get('updated_at'),'markdown_length':len(result.get('markdown',''))}))
