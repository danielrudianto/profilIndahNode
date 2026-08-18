# Sandbox — uji versi baru tanpa menyentuh produksi

Tujuan: menjalankan backend + frontend versi baru di
`https://sandbox.profilindah.id` di atas SALINAN data produksi, supaya
semua orang bisa mencoba sepuasnya tanpa risiko. `environment.ts`
frontend sudah menunjuk ke domain ini, dan CORS backend sudah
mengizinkannya.

Tiga prinsip yang tidak boleh dilanggar:

1. **Basis data salinan, bukan produksi.** Sandbox membaca-menulis
   `profil_indah_sandbox` — hasil restore dump, bukan basis data hidup.
2. **Redis terpisah.** BullMQ hanya mengenal host/port (tanpa nomor DB),
   jadi kalau sandbox menumpang Redis produksi, worker keduanya saling
   memakan job. Jalankan instance kedua (contoh: port 6380).
3. **Meilisearch terpisah.** Instance sendiri dengan master key sendiri
   dan direktori data sendiri — jangan menunjuk `data.ms` produksi.

## 1. Salin basis data

```bash
mysql -u root -p -e "CREATE DATABASE profil_indah_sandbox"
```

```bash
mysql -u root -p profil_indah_sandbox < /path/ke/dump-produksi.sql
```

Dump berisi data bisnis nyata — biarkan di server, jangan pernah
diunggah ke mana pun.

## 2. Siapkan layanan pendamping

Redis kedua:

```bash
redis-server --port 6380 --daemonize yes --dir /var/lib/redis-sandbox
```

Meilisearch kedua (master key BARU, bukan milik produksi):

```bash
meilisearch --http-addr 127.0.0.1:7710 --master-key "ISI-KUNCI-BARU" --db-path /var/lib/meili-sandbox
```

## 3. Backend

Checkout branch `beres-migrasi-dan-bersih-bersih`, lalu:

```bash
npm install
```

Buat `.env` di direktori sandbox (JANGAN menimpa `.env` produksi):

```
DATABASE_URL="mysql://user:sandi@localhost:3306/profil_indah_sandbox"
PORT="5001"
TOKEN_KEY="kunci-baru-khusus-sandbox"
REFRESH_TOKEN_KEY="kunci-baru-khusus-sandbox-juga"
EXPIRATION="1h"
REFRESH_EXPIRATION="7d"
MEILISEARCH_HOST="http://127.0.0.1:7710"
MEILISEARCH_MASTER_KEY="ISI-KUNCI-BARU"
REDIS_URL="redis://localhost:6380"
REDIS_HOST="localhost"
REDIS_PORT="6380"
LIMIT="10"
```

Migrasi + klien Prisma:

```bash
npx prisma migrate deploy && npx prisma generate
```

Indeks tuning (BAGIAN 1–6, semuanya `ALGORITHM=INPLACE, LOCK=NONE`) —
jalankan bagian demi bagian dari `docs/index-tuning.sql` pada
`profil_indah_sandbox`.

Indeks pencarian + data turunan:

```bash
npm run start:setup
```

```bash
npm run start:sync-product
```

```bash
npm run start:sync-package
```

```bash
npm run start:settle-receivables
```

Opsional tapi disarankan — supaya sandbox memperlihatkan HPP #4
(alokasi diskon faktur) pada sejarah, jalankan saat tidak ada yang
memakai sandbox:

```bash
npm run start:rebuild-stock-in
```

Nyalakan aplikasi + worker (pm2, systemd, atau apa pun yang biasa):

```bash
npm run build && node dist/app.js
```

```bash
node dist/worker.js
```

## 4. Frontend

Checkout branch `upgrade-angular-20`, lalu:

```bash
npm install && npx ng build
```

`environment.ts` sudah menunjuk `https://sandbox.profilindah.id/` —
tidak ada yang perlu diubah. Sajikan `dist/profil-indah-16/browser`
lewat web server, dan reverse-proxy permintaan API ke port 5001 pada
domain yang sama (contoh blok nginx):

```
server {
  server_name sandbox.profilindah.id;
  root /path/ke/dist/profil-indah-16/browser;
  location / { try_files $uri $uri/ /index.html; }
  location ~ ^/(auth|product|report|sales-invoice|good-receipt|customer|supplier|receivable|overpayment|expense|dashboard|deposit|sales-return|adjustment-case|promotion|salesman|company|payment-method|expense-type|user|user-avatar|product-brand|product-type|product-stock|product-package|product-price-sales|product-price-purchase|cashier|audit-logs|changelog|os|warehouse|sales-deposit) {
    proxy_pass http://127.0.0.1:5001;
  }
}
```

## 5. Uji cepat setelah nyala

- Masuk dengan akun dari data salinan; ganti bahasa dan mode gelap.
- Buka laporan penjualan, pembelian, keuangan, persediaan, uang masuk —
  grafik bertooltip dan sorotan harus tampil.
- Buat faktur penjualan percobaan (bebas — ini sandbox), lihat
  peringatan stok minus, lalu hapus fakturnya.
- Cek daftar barang & stok (memastikan Meilisearch sandbox tersinkron).

Rusak? Ulangi langkah 1 (restore ulang dump) — itulah gunanya sandbox.
