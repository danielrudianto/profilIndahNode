# Menerapkan migrasi ke basis data produksi

Basis data produksi **sudah punya seluruh tabelnya**, tetapi tabel
`_prisma_migrations` di sana **kosong** — tidak ada satu pun migrasi yang
tercatat pernah diterapkan. Skemanya dibangun di luar Prisma.

Akibatnya `prisma migrate deploy` berhenti di migrasi pertama:

```
Error: P3018
Database error code: 1050
Database error: Table 'payment_method' already exists
```

Prisma menganggap ketujuh migrasi belum berjalan, lalu mencoba membuat tabel
yang sudah ada. Kegagalannya juga meninggalkan catatan gagal yang memblokir
migrasi berikutnya sampai dibereskan.

Prosedur di bawah sudah **diuji lebih dulu** pada salinan struktur produksi,
bukan disusun dari teori.

## Langkah

Seluruh perintah memakai `DATABASE_URL` produksi di depan perintah, karena
`prisma db pull` dan kerabatnya pada Prisma 4 **tidak punya opsi `--url`**.

**1. Lihat keadaannya dulu — hanya membaca, tidak mengubah apa pun.**

```bash
DATABASE_URL="mysql://user:sandi@host:3306/nama_db" npx prisma migrate status
```

Bila hasilnya menyebut ketujuh migrasi belum diterapkan, lanjutkan.
Bila ada catatan gagal dari percobaan sebelumnya, bereskan dengan
`--rolled-back` seperti pada langkah 2.

**2. Tandai tiga migrasi lama sebagai sudah diterapkan.**

Ketiganya membangun skema yang di produksi memang sudah ada. Menandainya
hanya menulis riwayat; struktur basis datanya tidak disentuh.

```bash
export DATABASE_URL="mysql://user:sandi@host:3306/nama_db"

# hanya bila ada percobaan deploy yang gagal sebelumnya
npx prisma migrate resolve --rolled-back 20250610081411_x

npx prisma migrate resolve --applied 20250610081411_x
npx prisma migrate resolve --applied 20250617034513_
npx prisma migrate resolve --applied 20250617081529_
```

**3. Terapkan empat migrasi berikutnya.**

```bash
npx prisma migrate deploy
```

Yang benar-benar mengubah struktur hanya dua:

| Migrasi | Akibat di produksi |
| --- | --- |
| `20260814000000_expense_type_updated_trail` | menambah `expense_type.updated_by` dan `updated_at` |
| `20260814005000_rename_deposit_tables` | **tidak melakukan apa pun** — nama tabelnya sudah baru |
| `20260814006000_create_overpayment` | **tidak melakukan apa pun** — tabelnya sudah ada |
| `20260814010000_sales_deposit_invoice_link` | menambah `sales_deposit_code.sales_invoice_code_id` |

Dua yang tidak melakukan apa pun memang dirancang begitu: yang satu memeriksa
keberadaan tabel lamanya lewat `information_schema`, yang lain memakai
`CREATE TABLE IF NOT EXISTS`. Berkas yang sama karenanya aman dijalankan pada
salinan pengembangan yang masih memakai nama lama maupun pada produksi yang
sudah baru.

**4. Pastikan hasilnya.**

```bash
npx prisma migrate status
```

Harus berbunyi `Database schema is up to date!`.

## Sesudahnya

Backend dan frontend **harus naik bersama**. Backend kini membalas galat dengan
kunci i18n, bukan kalimat, dan skema Zod-nya menolak angka yang dikirim sebagai
teks. Frontend pada commit yang sepadan sudah memuat kunci-kunci itu.

## Catatan tentang salinan pengembangan

Salinan pengembangan di mesin lokal sempat jauh tertinggal: nama kolom tabel
setoran masih `item_id` dan `deposit_code_id`, dan `stock_card` belum punya
`created_at`. Semua selisih itu **hanya ada di salinan lokal** — produksi sudah
benar. Bila perlu salinan yang sepadan, bangun dari dump struktur produksi,
lalu jalankan langkah 2 dan 3 di atas.
