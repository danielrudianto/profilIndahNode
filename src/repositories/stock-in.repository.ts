import { PrismaClient } from "@prisma/client";
import { IStockIn, IStockInUpdate } from "../interfaces/stock-in.interface";

export class StockInRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  createMany(data: IStockIn[]) {
    return this.prisma.stock_in.createMany({
      data: data.map((x) => {
        return {
          date: x.date,
          product_id: x.product_id,
          quantity: x.quantity,
          price: x.price,
          company_id: x.company_id,
          residue: x.quantity,
          adjustment_case_code_id: x.adjustment_case_code_id,
          adjustment_case_id: x.adjustment_case_id,
          good_receipt_code_id: x.good_receipt_code_id,
          good_receipt_id: x.good_receipt_id,
        };
      }),
    });
  }

  updateMany(data: IStockInUpdate[]) {
    return this.prisma.$transaction(
      data.map((x) => {
        return this.prisma.stock_in.updateMany({
          where: {
            good_receipt_id: x.good_receipt_id,
            good_receipt_code_id: x.good_receipt_code_id,
            adjustment_case_id: x.adjustment_case_id,
            adjustment_case_code_id: x.adjustment_case_code_id,
          },
          data: {
            price: x.price,
          },
        });
      })
    );
  }

  async bulkUpdate(bulkUpdates: Array<any>) {
    const operations = [];

    for (const update of bulkUpdates) {
      if (update.type === "update") {
        operations.push(
          this.prisma.stock_in.update({
            where: { id: update.stockInID },
            data: {
              residue: update.residue,
            },
          })
        );

        operations.push(
          this.prisma.stock_out.update({
            where: {
              id: update.stockOutID,
            },
            data: {
              stock_in_id: update.stockInID,
            },
          })
        );
      }

      if (update.type === "updateAndCreate") {
        operations.push(
          this.prisma.stock_in.update({
            where: { id: update.stockInID },
            data: {
              residue: 0,
            },
          })
        );

        operations.push(
          this.prisma.stock_out.update({
            where: {
              id: update.stockOutID,
            },
            data: {
              quantity: update.quantity,
              stock_in_id: update.stockInID,
            },
          })
        );

        operations.push(
          this.prisma.stock_out.create({
            data: update.stockOut,
          })
        );
      }
    }

    // 🔥 Execute all operations in parallel
    await this.prisma.$transaction(operations);
  }

  async deleteMany(data: IStockInUpdate[]) {
    const where = [];
    for (let i = 0; i < data.length; i++) {
      where.push({
        adjustment_case_id: data[i].adjustment_case_id,
        adjustment_case_code_id: data[i].adjustment_case_code_id,
        good_receipt_id: data[i].good_receipt_id,
        good_receipt_code_id: data[i].good_receipt_code_id,
      });
    }

    const stockIns = await this.prisma.stock_in.findMany({
      where: {
        OR: where,
      },
      include: {
        stock_out: {
          select: {
            id: true,
          },
        },
      },
    });

    const deleteQuery: any[] = [];
    const updateQuery: any[] = [];
    stockIns.forEach((stockIn) => {
      deleteQuery.push(
        this.prisma.stock_in.delete({
          where: {
            id: stockIn.id,
          },
        })
      );

      stockIn.stock_out.forEach((stockOut) => {
        updateQuery.push(
          this.prisma.stock_out.update({
            where: {
              id: stockOut.id,
            },
            data: {
              stock_in_id: null,
            },
          })
        );
      });
    });

    await this.prisma.$transaction(updateQuery);
    await this.prisma.$transaction(deleteQuery);
  }

  async deleteAll() {
    await this.prisma.stock_in.deleteMany({});
  }

  /*
    Pembangunan ulang lapisan dari sejarah penerimaan — definisi harganya
    sama persis dengan jalur hidup HPP #4: nilai bersih baris dikali
    faktor diskon faktur dokumennya (1 - diskon/total baris), per satuan
    dasar. Alokasinya proporsional murni tanpa pelemparan sisa sen; untuk
    pembangunan ulang massal selisih sen itu diterima. Baris terhapus
    (dokumen yang pernah diedit menyimpan baris lamanya) ikut disaring —
    dulu ikut terangkat jadi lapisan dobel.
  */
  async insertFromGoodReceipts() {
    await this.prisma.$queryRawUnsafe(`
        INSERT INTO stock_in (product_id, quantity, price, residue, adjustment_case_id, adjustment_case_code_id, good_receipt_id, good_receipt_code_id, company_id, date)
        SELECT good_receipt.product_id, good_receipt.quantity * IF(good_receipt.product_unit_id IS NULL, 1, product_unit.conversion),
        (good_receipt.price - good_receipt.discount)
          * COALESCE(1 - good_receipt_code.discount / NULLIF(tot.total, 0), 1)
          / IF(good_receipt.product_unit_id IS NULL, 1, product_unit.conversion),
        good_receipt.quantity * IF(good_receipt.product_unit_id IS NULL, 1, product_unit.conversion),
        NULL, NULL, good_receipt.id, good_receipt.good_receipt_code_id, good_receipt_code.company_id, good_receipt_code.date
        FROM good_receipt
        LEFT JOIN product_unit ON good_receipt.product_unit_id = product_unit.id
        JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
        JOIN (
          SELECT good_receipt_code_id, SUM((price - discount) * quantity) AS total
          FROM good_receipt
          WHERE is_delete = 0
          GROUP BY good_receipt_code_id
        ) AS tot ON tot.good_receipt_code_id = good_receipt_code.id
        WHERE good_receipt_code.is_delete = 0
        AND good_receipt.is_delete = 0
        ORDER BY good_receipt_code.date ASC, good_receipt_code.id ASC
      `);
  }

  async insertFromAdjustmentCases() {
    await this.prisma.$queryRawUnsafe(`
        INSERT INTO stock_in (product_id, quantity, price, residue, adjustment_case_id, adjustment_case_code_id, good_receipt_id, good_receipt_code_id, company_id, date)
        SELECT adjustment_case.product_id, adjustment_case.quantity * IF(adjustment_case.product_unit_id IS NULL, 1, product_unit.conversion), 
        adjustment_case.price / IF(adjustment_case.product_unit_id IS NULL, 1, product_unit.conversion), 
        adjustment_case.quantity * IF(adjustment_case.product_unit_id IS NULL, 1, product_unit.conversion),
        adjustment_case.id, adjustment_case.adjustment_case_code_id, NULL, NULL, adjustment_case_code.company_id, adjustment_case_code.date
        FROM adjustment_case
        LEFT JOIN product_unit ON adjustment_case.product_unit_id = product_unit.id
        JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
        WHERE adjustment_case_code.is_delete = 0
        AND adjustment_case.quantity > 0
        ORDER BY adjustment_case_code.date ASC, adjustment_case_code.id ASC
      `);
  }

  async update(data: {
    stockInID: number;
    stockOutID: number;
    residue: number;
  }) {
    const result = await this.prisma.$transaction([
      this.prisma.stock_in.update({
        where: {
          id: data.stockInID,
        },
        data: {
          residue: data.residue,
        },
      }),
      this.prisma.stock_out.update({
        where: {
          id: data.stockOutID,
        },
        data: {
          stock_in_id: data.stockInID,
        },
      }),
    ]);
  }

  async updateAndCreate(data: {
    stockInID: number;
    stockOutID: number;
    residue: number;
    stockOut: any;
  }) {
    return this.prisma.$transaction([
      this.prisma.stock_out.create({
        data: data.stockOut,
      }),
      this.prisma.stock_in.update({
        where: {
          id: data.stockInID,
        },
        data: {
          residue: 0,
        },
      }),
      this.prisma.stock_out.update({
        where: {
          id: data.stockOutID,
        },
        data: {
          quantity: data.residue,
        },
      }),
    ]);
  }

  /*
    id sebagai pemutus seri — lihat catatan di fetchUnassigned milik
    stock-out.repository: FIFO pada tanggal yang sama harus deterministik.
  */
  async fetchManyUnfilled(productIDs: number[]) {
    const stockIn = await this.prisma.stock_in.findMany({
      where: {
        residue: {
          gt: 0,
        },
        product_id: {
          in: productIDs,
        },
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    });

    return stockIn.map((x) => {
      return {
        id: x.id,
        quantity: Number(x.quantity),
        residue: Number(x.residue),
        product_id: x.product_id,
      };
    });
  }

  /**
   * Nilai persediaan per perusahaan PADA suatu tanggal.
   *
   * Sisa sebuah lapisan pada tanggal T = kuantitasnya dikurangi seluruh
   * keluaran tertetapkan yang bertanggal <= T; hanya lapisan bertanggal
   * <= T yang ikut dihitung. Bentuk lamanya membaca kolom residue —
   * angka "sekarang" yang tidak bisa ditanya mundur.
   *
   * Keluaran TANPA induk tidak punya harga pokok, jadi tidak mungkin
   * masuk hitungan — jumlah dan nilai jualnya dikembalikan terpisah
   * supaya laporan bisa jujur, bukan diam-diam menganggapnya nol.
   */
  async calculateAsOf(tanggal: Date): Promise<{
    companies: { id: number; company: string; value: number }[];
    unassigned: { count: number; value: number };
  }> {
    const [nilai, tanpaInduk] = await this.prisma.$transaction([
      this.prisma.$queryRaw<any[]>`
        SELECT company.id, company.name,
          SUM(stock_in.price * (stock_in.quantity - COALESCE(keluar.quantity, 0))) AS value
        FROM stock_in
        JOIN company ON company.id = stock_in.company_id
        LEFT JOIN (
          SELECT stock_out.stock_in_id, SUM(stock_out.quantity) AS quantity
          FROM stock_out
          WHERE stock_out.stock_in_id IS NOT NULL
          AND stock_out.date <= ${tanggal}
          GROUP BY stock_out.stock_in_id
        ) AS keluar ON keluar.stock_in_id = stock_in.id
        WHERE stock_in.date <= ${tanggal}
        GROUP BY company.id, company.name
        ORDER BY value DESC
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT COUNT(*) AS n, COALESCE(SUM(stock_out.quantity * stock_out.price), 0) AS value
        FROM stock_out
        WHERE stock_out.stock_in_id IS NULL
        AND stock_out.quantity > 0
        AND stock_out.date <= ${tanggal}
      `,
    ]);

    return {
      companies: (nilai ?? []).map((x) => {
        return {
          id: Number(x.id),
          company: x.name,
          value: Number(x.value),
        };
      }),
      unassigned: {
        count: Number(tanpaInduk[0]?.n ?? 0),
        value: Number(tanpaInduk[0]?.value ?? 0),
      },
    };
  }

  /*
    Tren nilai gudang: 12 titik, satu per bulan, berakhir di bulan
    `tanggal`. Nilai pada suatu titik = kumulatif masuk dikurangi
    kumulatif keluar-ternilai sejak awal sejarah — dua query GROUP BY
    bulan, saldo berjalannya dihitung di sini; jauh lebih murah daripada
    memanggil calculateAsOf dua belas kali. Titik terakhir memakai batas
    `tanggal` persis, jadi angkanya sama dengan hero halaman.
  */
  async trendAsOf(
    tanggal: Date
  ): Promise<{ year: number; month: number; value: number }[]> {
    const [masuk, keluar] = await this.prisma.$transaction([
      this.prisma.$queryRaw<any[]>`
        SELECT YEAR(stock_in.date) AS tahun, MONTH(stock_in.date) AS bulan,
          SUM(stock_in.price * stock_in.quantity) AS nilai
        FROM stock_in
        WHERE stock_in.date <= ${tanggal}
        GROUP BY tahun, bulan
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT YEAR(stock_out.date) AS tahun, MONTH(stock_out.date) AS bulan,
          SUM(stock_in.price * stock_out.quantity) AS nilai
        FROM stock_out
        JOIN stock_in ON stock_out.stock_in_id = stock_in.id
        WHERE stock_out.date <= ${tanggal}
        GROUP BY tahun, bulan
      `,
    ]);

    /* Kunci bulan absolut (tahun*12 + bulan-1) supaya mudah diurut-jalankan. */
    const delta = new Map<number, number>();
    for (const x of masuk) {
      const kunci = Number(x.tahun) * 12 + Number(x.bulan) - 1;
      delta.set(kunci, (delta.get(kunci) ?? 0) + Number(x.nilai));
    }
    for (const x of keluar) {
      const kunci = Number(x.tahun) * 12 + Number(x.bulan) - 1;
      delta.set(kunci, (delta.get(kunci) ?? 0) - Number(x.nilai));
    }

    const akhir = tanggal.getFullYear() * 12 + tanggal.getMonth();
    let saldo = 0;
    for (const [kunci, nilai] of delta) {
      if (kunci < akhir - 11) {
        saldo += nilai;
      }
    }

    const hasil: { year: number; month: number; value: number }[] = [];
    for (let kunci = akhir - 11; kunci <= akhir; kunci++) {
      saldo += delta.get(kunci) ?? 0;
      hasil.push({
        year: Math.floor(kunci / 12),
        month: (kunci % 12) + 1,
        value: saldo,
      });
    }
    return hasil;
  }

  /*
    Nilai persediaan per merek pada suatu tanggal — bahan sorotan "merek
    apa yang paling banyak mengendap di gudang". Rumus sisanya sama
    dengan calculateAsOf.
  */
  async nilaiPerMerekAsOf(
    tanggal: Date
  ): Promise<{ name: string; value: number }[]> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT product_brand.name,
        SUM(stock_in.price * (stock_in.quantity - COALESCE(keluar.quantity, 0))) AS value
      FROM stock_in
      JOIN product ON product.id = stock_in.product_id
      JOIN product_brand ON product_brand.id = product.product_brand_id
      LEFT JOIN (
        SELECT stock_out.stock_in_id, SUM(stock_out.quantity) AS quantity
        FROM stock_out
        WHERE stock_out.stock_in_id IS NOT NULL
        AND stock_out.date <= ${tanggal}
        GROUP BY stock_out.stock_in_id
      ) AS keluar ON keluar.stock_in_id = stock_in.id
      WHERE stock_in.date <= ${tanggal}
      GROUP BY product_brand.id, product_brand.name
      ORDER BY value DESC
      LIMIT 8
    `;

    return result.map((x) => {
      return {
        name: x.name,
        value: Number(x.value),
      };
    });
  }
}
