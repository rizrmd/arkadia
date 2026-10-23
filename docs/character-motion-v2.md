## Hasil dan preview

Live: https://ark-whachat.fural.space/ — sandbox persisten `arkodia`, foreground `node app.mjs`. Perubahan menggantikan konfigurasi satu arah pada integrasi v1.

- Hero: jubah/tabard biru kobalt, zirah perak dan helm gading, detail emas.
- Revenant: kain merah karat, tulang oker kusam dan kapak. Bukan lagi kain plum yang menyerupai hero.
- W/atas memakai gambar punggung, S/bawah gambar depan. A/D memakai cermin horizontal; diagonal atas tetap punggung. Arah terakhir dipertahankan saat idle. Aturan yang sama berlaku untuk AI revenant.
- Pose gerak diganti dari lunge berulang ke langkah tegak dengan fase kaki rapat dan terbuka. Posisi vertikal kepala distabilkan; kaki yang terangkat tidak dipaksa selalu menempel tanah. Fase langkah mengikuti jarak tempuh, bukan timer yang tetap berjalan saat karakter tertahan batas arena. Kecepatan proyeksi sama untuk arah vertikal/horizontal.

## Gambar yang dipakai dan bukti tampilan

![Sumber hero v2 — idle, combat, dan punggung](/api/rooms/DR301ca66e2d62a33fd39f4c7c/attachments/DAc5c79b95ae840ae54efcce48)

![Sumber revenant v2 — merah karat](/api/rooms/DR301ca66e2d62a33fd39f4c7c/attachments/DAd2aef75d2ec43598e30568da)

![Locomotion v2 — pose gerak depan dan punggung](/api/rooms/DR301ca66e2d62a33fd39f4c7c/attachments/DA75ac3ca470382ae74ea1d2b5)

![Atlas hero runtime, pivot tetap](/api/rooms/DR301ca66e2d62a33fd39f4c7c/attachments/DAec2766b410438d83b1bb4356)

![Atlas revenant runtime, pivot tetap](/api/rooms/DR301ca66e2d62a33fd39f4c7c/attachments/DAd7b8ee10556b4138d859e86c)

![Hero bergerak ke atas — punggung terlihat](/api/rooms/DR301ca66e2d62a33fd39f4c7c/attachments/DAef9f03901452473c3b6b7306)

![Hero bergerak ke bawah — tampak depan](/api/rooms/DR301ca66e2d62a33fd39f4c7c/attachments/DAd224a9400f9f210577324324)

![Kontras hero biru dan musuh merah di kerumunan](/api/rooms/DR301ca66e2d62a33fd39f4c7c/attachments/DA34aa8824189bb1e99d823fc4)

## Pipeline

Dihasilkan menggunakan **imagegen bawaan**, transparansi alpha nyata. Sumber hero/enemy 1254 × 1254 (6 × 6), locomotion 1536 × 1024 (6 × 4). Sumber disimpan tanpa ditimpa di `assets-src/characters/{hero,enemy,locomotion}-v2.png`; sumber v1 tetap ada.

Atlas runtime berisi 36 frame per karakter. Klip idle/move/idleBack/moveBack/attack masing-masing 6 frame, hit 2 dan die 4. Baris move dan moveBack berasal dari sheet locomotion, sedangkan idle dan combat berasal dari sheet identitas masing-masing. Ukuran locomotion dinormalisasi terhadap tinggi idle dengan satu rasio per karakter; bukan menyesuaikan ukuran setiap pose.

Slicing tetap berbasis komponen alpha. Satu komponen gabungan pedang serangan hero f4 dan jubah f5 dipisah dengan jarak geodesik dari dua seed torso yang ditinjau; semua piksel tetap menjadi milik salah satu frame. Atlas memakai pivot bersama, gutter transparan, dan pemeriksaan tepi. Registrasi horizontal memakai IoU mask alpha. Vertical ground offset untuk move dipakai bersama satu klip agar tidak memompa badan mengikuti boot terendah.

Kecepatan layar hero 140,8 px/detik dan revenant 51,2 px/detik, siklus langkah masing-masing 88/76 px. Timer tetap dipakai untuk idle, hit, serangan dan kematian; frame impact damage tidak berubah.

## Validasi

- `npm run build`: TypeScript + Vite lulus.
- Browser lokal: 12/12 sebelum penambahan cek arah musuh; browser **URL live**: 13/13 termasuk cek arah musuh.
- Regresi asset lab: 13 cek lulus; ekspedisi: 4/4 lulus.
- Uji arah: W/S, empat diagonal, arah idle setelah berhenti, dan revenant mengejar atas/bawah benar-benar memakai rect texture yang berbeda.
- Kecepatan layar vertikal/horizontal sama; fase langkah mengikuti jarak, tidak bertambah saat tertahan batas.
- Semua state pertarungan terjadi; arena 36/72 musuh dirender tanpa page error, urutan Y-sort benar.
- Maksimum perubahan centroid torso antarframe gerak hero 2,2 px atlas depan / 1,2 belakang (v1 depan 5,4). Rentang tinggi kepala gerak maksimal 1 px atlas. Ini metrik stabilitas, bukan bukti anatomi langkah sempurna.
- Audit piksel: biru mencakup sekitar 21–50% piksel opak hero (bergantung klip); musuh tidak memiliki piksel biru sesuai ambang audit dan didominasi merah/cokelat hangat. Keterbacaan juga diperiksa pada screenshot arena.

## Batas kualitas yang masih ada

Tampak belakang tersedia untuk **idle dan gerak**; serangan, hit, dan mati masih memakai art depan. Ini empat kuadran dengan cermin, bukan delapan arah unik. Sheet AI tetap memiliki variasi proporsi, pose kaki yang mirip, serta foot sliding; siklus belum setara animasi skeletal yang dirapikan animator. Tidak ada klaim siklus anatomi kiri–kanan sempurna. Perubahan ini mengurangi hopping dengan pose baru, registrasi kepala dan cadence berdasarkan jarak.

Ikon inventori masih atlas lama (termasuk ikon jubah plum); warna sprite hero aktual sudah biru. Belum ada attachment perlengkapan atau collision prop.

## Iterasi yang tidak dipakai

Dua hasil di bawah disimpan sebagai catatan proses; **bukan** sumber runtime. Strip lari masih terlalu menyerupai lunge lama. Gait percobaan menambahkan pedang pada skeleton; versi final menghapus pedang musuh.

![Ditolak — strip lari hero masih menyerupai lunge](/api/rooms/DR301ca66e2d62a33fd39f4c7c/attachments/DA12ec96c0a22b47b3b62c59a9)

![Ditolak — gait awal musuh memiliki pedang tambahan](/api/rooms/DR301ca66e2d62a33fd39f4c7c/attachments/DAbee24d7a5bb564a406d1384a)

## Reproduksi

```
npm ci
node scripts/extract-characters.mjs
node scripts/inspect-characters.mjs
npm run build
node scripts/verify-characters.mjs
DEMO_URL=https://ark-whachat.fural.space/ node scripts/verify-characters.mjs
node scripts/test-expedition.mjs
node scripts/package-site.mjs
fural-agent sandboxes serve --name arkodia --dir /home/dev/arkodia/publish --cmd "node app.mjs" --port 3000 --project PJ8758f22f61165f3d3215e454
```
