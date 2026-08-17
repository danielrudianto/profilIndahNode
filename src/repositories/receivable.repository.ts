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
      SELECT sub.id, sub.name, SUM(sub.value) AS value, SUM(sub.payment) AS payment
      FROM (
        SELECT
          (si.value + sales_invoice_code.delivery + sales_invoice_code.service - sales_invoice_code.discount) AS value,
          COALESCE(sip.value, 0) AS payment,
          customer.id,
          customer.name
        FROM sales_invoice_code
        JOIN (
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
      JOIN (
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
      AND (nilai.value + sic.delivery + sic.service - sic.discount - COALESCE(bayar.value, 0))
        <= ${PAYMENT_ROUNDING_TOLERANCE}`;

    return hasil;
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
        nilai.value + sic.delivery + sic.service - sic.discount - COALESCE(bayar.value, 0)
      ), 0) AS total
      FROM sales_invoice_code sic
      JOIN (
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
