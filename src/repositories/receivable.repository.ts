import { Prisma, PrismaClient } from "@prisma/client";
import { RedisClientType } from "redis";
import { SalesInvoiceModel } from "../models/sales-invoice.model";
import { SalesInvoicePaymentModel } from "../models/sales-invoice-payment.model";
import { PAYMENT_ROUNDING_TOLERANCE } from "../constants/receivable.constant";

export class ReceivableRepository {
  redisClient: RedisClientType;
  prisma: PrismaClient;
  constructor(redisClient: RedisClientType, prisma: PrismaClient) {
    this.redisClient = redisClient;
    this.prisma = prisma;
  }
  async addReceivableValue(value: number): Promise<void> {
    // add to redisClient
    try {
      await this.redisClient.incrByFloat("receivable_value", value);
    } catch (error) {
      console.error(`[error]: Error on adding receivable value ${error}`);
      throw error;
    }
  }

  async getReceivableValue(): Promise<number> {
    const value = await this.redisClient.get("receivable_value");
    if (value === null) {
      return 0; // Return 0 if no value is set
    } else {
      return Number(value);
    }
  }

  async create(data: {
    sales_invoice_code_id: number;
    date: Date;
    amount: number;
    payment_method_id: number | null;
    is_paid: boolean;
  }) {
    const [result, _] = await this.prisma.$transaction([
      this.prisma.sales_invoice_payment.create({
        data: {
          date: data.date,
          payment_method_id: data.payment_method_id,
          value: data.amount,
          sales_invoice_code_id: data.sales_invoice_code_id,
        },
        include: {
          payment_method: true,
        },
      }),
      this.prisma.sales_invoice_code.update({
        where: {
          id: data.sales_invoice_code_id,
        },
        data: {
          is_paid: data.is_paid,
        },
      }),
    ]);

    return SalesInvoicePaymentModel.fromMap(result);
  }

  /*
    SATU lintasan. Bentuk lamanya dua fase: menarik ribuan id dokumen
    belum-lunas ke Node, lalu mengirimnya balik sebagai tiga daftar
    IN (...) raksasa — SQL berparameter puluhan ribu yang lambat
    diurai dan lambat dieksekusi. Saringan is_paid/is_delete sekarang
    tinggal di dalam query, termasuk pada kedua tabel turunannya.

    HAVING memakai toleransi pembulatan: sisa <= Rp 5 bukan piutang.
  */
  async fetch() {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
      SELECT
        sub.id, sub.name,
        SUM(sub.value) AS value,
        SUM(sub.payment) AS payment,
        -- Sisa yang tenggatnya SUDAH lewat, per pelanggan.
        --
        -- Dihitung per faktur lalu dijumlahkan, bukan ditandai per pelanggan:
        -- satu pelanggan lazim punya faktur yang sudah lewat tempo DAN yang
        -- belum sekaligus, dan menandai orangnya akan memaksa salah satu
        -- kelompok itu ikut terbaca keliru.
        SUM(CASE WHEN sub.lewat = 1 THEN sub.value - sub.payment ELSE 0 END) AS overdue
      FROM (
        SELECT
          (COALESCE(si.value, 0) + sales_invoice_code.delivery + sales_invoice_code.service + sales_invoice_code.admin_fee - sales_invoice_code.discount - COALESCE((SELECT SUM(src.receivable_value) FROM sales_return_code src WHERE src.sales_invoice_code_id = sales_invoice_code.id AND src.is_confirm = 1 AND src.is_delete = 0), 0)) AS value,
          COALESCE(sip.value, 0) AS payment,
          CASE
            WHEN sales_invoice_code.payment_term IS NOT NULL
             AND DATE_ADD(sales_invoice_code.date,
                          INTERVAL sales_invoice_code.payment_term DAY) < CURDATE()
            THEN 1 ELSE 0
          END AS lewat,
          customer.id,
          customer.name
        FROM sales_invoice_code
        /*
          LEFT, bukan INNER. Faktur jasa murni tidak punya satu pun baris di
          sales_invoice, sehingga INNER JOIN membuangnya dari hasil — bukan
          menilainya nol, melainkan MENGHILANGKANNYA. Tagihannya tidak pernah
          muncul di daftar piutang dan tidak ada yang menagihnya.
        */
        LEFT JOIN (
          SELECT
            SUM(sales_invoice.quantity * (sales_invoice.price - sales_invoice.discount)) AS value,
            sales_invoice.sales_invoice_code_id
          FROM sales_invoice
          JOIN sales_invoice_code AS kode ON kode.id = sales_invoice.sales_invoice_code_id
          WHERE kode.is_paid = false AND kode.is_delete = false
          GROUP BY sales_invoice.sales_invoice_code_id
        ) AS si
        ON sales_invoice_code.id = si.sales_invoice_code_id
        LEFT JOIN (
          SELECT
            SUM(sales_invoice_payment.value) AS value,
            sales_invoice_payment.sales_invoice_code_id
          FROM sales_invoice_payment
          JOIN sales_invoice_code AS kode ON kode.id = sales_invoice_payment.sales_invoice_code_id
          WHERE kode.is_paid = false AND kode.is_delete = false
          GROUP BY sales_invoice_payment.sales_invoice_code_id
        ) AS sip
        ON sales_invoice_code.id = sip.sales_invoice_code_id
        LEFT JOIN customer ON sales_invoice_code.customer_id = customer.id
        WHERE sales_invoice_code.is_paid = false AND sales_invoice_code.is_delete = false
      ) AS sub
      GROUP BY sub.id, sub.name
      HAVING (value - payment) > ${PAYMENT_ROUNDING_TOLERANCE}`;

      return result
        .map((x) => {
          return {
            id: x.id == null ? null : Number(x.id),
            name: x.id == null ? "Retail" : x.name,
            value: Number(x.value) - Number(x.payment),
            /* Bagian yang sudah lewat tenggat; layar mewarnainya lebih gelap.
               Dijepit ke sisa total supaya pembulatan tidak pernah membuat
               bagian gelapnya melebihi batangnya sendiri. */
            overdue: Math.min(
              Math.max(Number(x.overdue ?? 0), 0),
              Number(x.value) - Number(x.payment)
            ),
          };
        })
        .sort((a, b) => {
          return b.value - a.value;
        });
    } catch (error) {
      console.error(`[error]: Error on fetching receivable data ${error}`);
      throw error;
    }
  }

  /**
   * Penyapu satu kali: menandai LUNAS dokumen lama yang menggantung
   * dengan sisa <= toleransi pembulatan. Idempoten — dokumen yang
   * sudah lunas tidak tersentuh; dipanggil dari CLI perawatan.
   */
  async settleWithinTolerance(): Promise<number> {
    const hasil = await this.prisma.$executeRaw`
      UPDATE sales_invoice_code sic
      /* LEFT: faktur jasa murni tanpa baris tetap harus bisa dilunasi. */
      LEFT JOIN (
        SELECT sales_invoice.sales_invoice_code_id,
          SUM(sales_invoice.quantity * (sales_invoice.price - sales_invoice.discount)) AS value
        FROM sales_invoice
        JOIN sales_invoice_code AS kode ON kode.id = sales_invoice.sales_invoice_code_id
        WHERE kode.is_paid = false AND kode.is_delete = false
        GROUP BY sales_invoice.sales_invoice_code_id
      ) AS nilai ON nilai.sales_invoice_code_id = sic.id
      LEFT JOIN (
        SELECT sales_invoice_payment.sales_invoice_code_id,
          SUM(sales_invoice_payment.value) AS value
        FROM sales_invoice_payment
        JOIN sales_invoice_code AS kode ON kode.id = sales_invoice_payment.sales_invoice_code_id
        WHERE kode.is_paid = false AND kode.is_delete = false
        GROUP BY sales_invoice_payment.sales_invoice_code_id
      ) AS bayar ON bayar.sales_invoice_code_id = sic.id
      SET sic.is_paid = true
      WHERE sic.is_paid = false AND sic.is_delete = false
      AND (COALESCE(nilai.value, 0) + sic.delivery + sic.service + sic.admin_fee - sic.discount - COALESCE((SELECT SUM(src.receivable_value) FROM sales_return_code src WHERE src.sales_invoice_code_id = sic.id AND src.is_confirm = 1 AND src.is_delete = 0), 0) - COALESCE(bayar.value, 0))
        <= ${PAYMENT_ROUNDING_TOLERANCE}`;

    return hasil;
  }

  /**
   * Sisa tagihan SATU faktur, berikut bahan penyusunnya.
   *
   * Dipakai layar retur untuk memberi tahu petugas bahwa fakturnya masih
   * berutang — dan dipakai server untuk menghitung sendiri berapa dari nilai
   * retur yang boleh memotong tagihan. Angka itu TIDAK boleh datang dari
   * peramban: yang dikirim klien menentukan berapa utang seseorang berkurang.
   *
   * Retur yang sudah pernah memotong ikut dikurangkan, kalau tidak retur
   * kedua atas faktur yang sama akan memotong tagihan yang sudah tidak ada.
   */
  async fetchInvoiceOutstanding(invoiceID: number): Promise<{
    total: number;
    paid: number;
    returned: number;
    outstanding: number;
  }> {
    const hasil = await this.prisma.$queryRaw<any[]>`
      SELECT
        COALESCE((
          SELECT SUM(si.quantity * (si.price - si.discount))
          FROM sales_invoice si
          WHERE si.sales_invoice_code_id = sic.id
        ), 0)
          -- Nilai KOTOR dokumen. Retur dikurangkan terpisah di bawah pada
          -- kolom returned; menariknya ke sini membuatnya terhitung dua kali.
          + sic.delivery + sic.service + sic.admin_fee - sic.discount AS total,
        COALESCE((
          SELECT SUM(sip.value)
          FROM sales_invoice_payment sip
          WHERE sip.sales_invoice_code_id = sic.id
        ), 0) AS paid,
        COALESCE((
          SELECT SUM(src.receivable_value)
          FROM sales_return_code src
          WHERE src.sales_invoice_code_id = sic.id
            AND src.is_confirm = 1 AND src.is_delete = 0
        ), 0) AS returned
      FROM sales_invoice_code sic
      WHERE sic.id = ${invoiceID} AND sic.is_delete = 0
    `;

    const b = hasil[0];
    if (!b) {
      return { total: 0, paid: 0, returned: 0, outstanding: 0 };
    }

    const total = Number(b.total);
    const paid = Number(b.paid);
    const returned = Number(b.returned);

    return {
      total,
      paid,
      returned,
      /* Tidak pernah negatif: kelebihan bayar punya jalurnya sendiri, dan
         sisa tagihan minus di sini akan menular ke pembagian retur. */
      outstanding: Math.max(total - paid - returned, 0),
    };
  }

  /**
   * Ringkasan piutang untuk kartu dasbor.
   *
   * Yang penting bukan totalnya, melainkan berapa yang SUDAH LEWAT JATUH
   * TEMPO. Total piutang naik-turun sepanjang hari dan itu wajar; yang lewat
   * tempo adalah uang yang seharusnya sudah kembali, dan itulah yang mudah
   * terlewat kalau tidak ada yang menyebutkannya.
   *
   * Faktur tanpa payment_term TIDAK dihitung lewat tempo — bukan karena ia
   * pasti belum jatuh, melainkan karena tidak ada tanggal yang bisa
   * dilanggarnya. Menganggapnya lewat tempo akan membuat angkanya menakuti
   * orang atas kesepakatan yang memang tidak pernah bertenggat.
   */
  async fetchSummary(): Promise<{
    total: number;
    invoices: number;
    customers: number;
    overdueValue: number;
    overdueInvoices: number;
    oldestDays: number;
  }> {
    const hasil = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) AS invoices,
        COUNT(DISTINCT customer_id) AS customers,
        COALESCE(SUM(sisa), 0) AS total,
        COALESCE(SUM(CASE WHEN lewat = 1 THEN sisa ELSE 0 END), 0) AS overdueValue,
        COALESCE(SUM(lewat), 0) AS overdueInvoices,
        COALESCE(MAX(CASE WHEN lewat = 1 THEN umur ELSE 0 END), 0) AS oldestDays
      FROM (
        SELECT
          sic.customer_id,
          (
            COALESCE((SELECT SUM(si.quantity * (si.price - si.discount))
                      FROM sales_invoice si
                      WHERE si.sales_invoice_code_id = sic.id), 0)
            + sic.delivery + sic.service + sic.admin_fee - sic.discount
            - COALESCE((SELECT SUM(src.receivable_value)
                        FROM sales_return_code src
                        WHERE src.sales_invoice_code_id = sic.id
                          AND src.is_confirm = 1 AND src.is_delete = 0), 0)
            - COALESCE((SELECT SUM(sip.value)
                        FROM sales_invoice_payment sip
                        WHERE sip.sales_invoice_code_id = sic.id), 0)
          ) AS sisa,
          CASE
            WHEN sic.payment_term IS NOT NULL
             AND DATE_ADD(sic.date, INTERVAL sic.payment_term DAY) < CURDATE()
            THEN 1 ELSE 0
          END AS lewat,
          DATEDIFF(CURDATE(), DATE_ADD(sic.date, INTERVAL COALESCE(sic.payment_term, 0) DAY)) AS umur
        FROM sales_invoice_code sic
        WHERE sic.is_paid = 0 AND sic.is_delete = 0
      ) x
      WHERE sisa > ${PAYMENT_ROUNDING_TOLERANCE}`;

    const b = hasil[0] ?? {};
    return {
      total: Number(b.total ?? 0),
      invoices: Number(b.invoices ?? 0),
      customers: Number(b.customers ?? 0),
      overdueValue: Number(b.overdueValue ?? 0),
      overdueInvoices: Number(b.overdueInvoices ?? 0),
      oldestDays: Number(b.oldestDays ?? 0),
    };
  }

  async fetchByCustomerID(data: {
    customerID: number | null;
    page: number;
    pageSize: number;
  }) {
    // Kunci dokumen dikumpulkan dulu — idiom yang sama dengan fetch() —
    // supaya jumlah SELURUH sisa pelanggan ini bisa dihitung sekali di
    // server. Halaman yang dikirim cuma sepotong, dan menjumlahkannya
    // di peramban menghasilkan "total" yang berubah-ubah per halaman.
    const kunciDokumen = await this.prisma.sales_invoice_code.findMany({
      where: {
        is_paid: false,
        is_delete: false,
        customer_id: data.customerID,
      },
      select: {
        id: true,
      },
    });

    if (kunciDokumen.length === 0) {
      return { data: [], count: 0, total: 0 };
    }

    const idDokumen = kunciDokumen.map((x) => x.id);

    const totalBaris = await this.prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(
        COALESCE(nilai.value, 0) + sic.delivery + sic.service + sic.admin_fee - sic.discount - COALESCE((SELECT SUM(src.receivable_value) FROM sales_return_code src WHERE src.sales_invoice_code_id = sic.id AND src.is_confirm = 1 AND src.is_delete = 0), 0) - COALESCE(bayar.value, 0)
      ), 0) AS total
      FROM sales_invoice_code sic
      /* LEFT: lihat catatan pada fetchOutstanding. */
      LEFT JOIN (
        SELECT
          SUM(sales_invoice.quantity * (sales_invoice.price - sales_invoice.discount)) AS value,
          sales_invoice.sales_invoice_code_id
        FROM sales_invoice
        WHERE sales_invoice.sales_invoice_code_id IN (${Prisma.join(idDokumen)})
        GROUP BY sales_invoice.sales_invoice_code_id
      ) AS nilai ON nilai.sales_invoice_code_id = sic.id
      LEFT JOIN (
        SELECT
          SUM(sales_invoice_payment.value) AS value,
          sales_invoice_payment.sales_invoice_code_id
        FROM sales_invoice_payment
        WHERE sales_invoice_payment.sales_invoice_code_id IN (${Prisma.join(idDokumen)})
        GROUP BY sales_invoice_payment.sales_invoice_code_id
      ) AS bayar ON bayar.sales_invoice_code_id = sic.id
      WHERE sic.id IN (${Prisma.join(idDokumen)})`;

    const [result, count] = await this.prisma.$transaction([
      this.prisma.sales_invoice_code.findMany({
        where: {
          is_paid: false,
          is_delete: false,
          customer_id: data.customerID,
        },
        include: {
          sales_invoice: {
            include: {
              product: true,
              product_unit: true,
            },
          },
          sales_invoice_payment: {
            include: {
              payment_method: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
        skip: (data.page - 1) * data.pageSize,
        take: data.pageSize,
      }),
      this.prisma.sales_invoice_code.count({
        where: {
          is_paid: false,
          is_delete: false,
          customer_id: data.customerID,
        },
      }),
    ]);

    return {
      data: result.map((x) => {
        return SalesInvoiceModel.fromMap(x);
      }),
      count: count,
      total: Number(totalBaris[0]?.total ?? 0),
    };
  }
}
