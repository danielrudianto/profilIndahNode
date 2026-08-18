import { Prisma, PrismaClient } from "@prisma/client";
import {
  DateHelper,
  formatDate,
  rentangBulan,
  rentangTahun,
} from "../utils/date.helper";
import { IStockoutModel } from "../interfaces/stock-out.interface";
/*
  Prisma 6 tidak lagi mengekspor jalur "@prisma/client/runtime"; kelas
  Decimal kini hidup di namespace Prisma. Alias ini menjaga sisa berkas
  tetap menyebut Decimal seperti sebelumnya — sebagai tipe maupun nilai.
*/
type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

export class StockOutRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async fetchUnassigned() {
    return this.prisma.stock_out.findMany({
      where: {
        stock_in_id: null,
      },
      /*
        id sebagai pemutus seri. Tanpa itu, urutan baris bertanggal sama tidak
        dijamin — dua kali perhitungan bisa memberi HPP berbeda pada data yang
        sama persis.
      */
      orderBy: [{ date: "asc" }, { id: "asc" }],
    });
  }

  async delete() {
    return this.prisma.stock_out.deleteMany({});
  }

  async deleteMany(
    data: {
      sales_invoice_id: number | null;
      sales_invoice_code_id: number | null;
      adjustment_case_id: number | null;
      adjustment_case_code_id: number | null;
    }[]
  ) {
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const stockOuts = await this.prisma.stock_out.findMany({
        where: {
          sales_invoice_id: item.sales_invoice_id,
          sales_invoice_code_id: item.sales_invoice_code_id,
          adjustment_case_id: item.adjustment_case_id,
          adjustment_case_code_id: item.adjustment_case_code_id,
        },
      });

      for (let j = 0; j < stockOuts.length; j++) {
        const stockOut = stockOuts[j];
        if (stockOut.stock_in_id != null) {
          await this.prisma.stock_in.update({
            where: {
              id: stockOut.stock_in_id,
            },
            data: {
              residue: {
                increment: stockOut.quantity,
              },
            },
          });
        }

        await this.prisma.stock_out.delete({
          where: {
            id: stockOut.id,
          },
        });
      }
    }
  }

  /**
   * Menetapkan satu stock_out ke lapisan-lapisan stok masuknya, ATOMIK.
   *
   * Seluruh rencana diterapkan dalam SATU transaksi: baris asli memegang
   * jatah pertama, jatah berikutnya menjadi baris baru, dan bila stoknya
   * kurang, sisanya tetap dicatat sebagai baris tanpa penetapan — jumlah
   * total stock_out tidak pernah berubah. Pendahulunya menulis per pasangan:
   * baris asli sudah dikecilkan sementara sisanya baru hidup di memori,
   * sehingga proses yang mati di tengah menghapus kuantitas itu dari
   * pembukuan secara permanen.
   */
  async assign(data: {
    stockOut: {
      id: number;
      product_id: number;
      sales_invoice_id: number | null;
      sales_invoice_code_id: number | null;
      adjustment_case_id: number | null;
      adjustment_case_code_id: number | null;
      price: Decimal;
      date: Date;
    };
    plan: { stock_in_id: number; quantity: number }[];
    sisa: number;
  }) {
    const salinan = {
      product_id: data.stockOut.product_id,
      price: data.stockOut.price,
      sales_invoice_id: data.stockOut.sales_invoice_id,
      sales_invoice_code_id: data.stockOut.sales_invoice_code_id,
      adjustment_case_id: data.stockOut.adjustment_case_id,
      adjustment_case_code_id: data.stockOut.adjustment_case_code_id,
      date: data.stockOut.date,
    };

    const operasi = [
      this.prisma.stock_out.update({
        where: {
          id: data.stockOut.id,
        },
        data: {
          stock_in_id: data.plan[0].stock_in_id,
          quantity: data.plan[0].quantity,
        },
      }),
      ...data.plan.slice(1).map((jatah) =>
        this.prisma.stock_out.create({
          data: {
            ...salinan,
            quantity: jatah.quantity,
            stock_in_id: jatah.stock_in_id,
          },
        })
      ),
      ...data.plan.map((jatah) =>
        this.prisma.stock_in.update({
          where: {
            id: jatah.stock_in_id,
          },
          data: {
            residue: {
              decrement: jatah.quantity,
            },
          },
        })
      ),
    ];

    if (data.sisa > 0) {
      operasi.push(
        this.prisma.stock_out.create({
          data: {
            ...salinan,
            quantity: data.sisa,
            stock_in_id: null,
          },
        })
      );
    }

    return this.prisma.$transaction(operasi);
  }

  /** Memecah larik menjadi potongan berukuran tetap untuk tulisan massal. */
  private potong<T>(larik: T[], ukuran: number): T[][] {
    const hasil: T[][] = [];
    for (let i = 0; i < larik.length; i += ukuran) {
      hasil.push(larik.slice(i, i + ukuran));
    }
    return hasil;
  }

  /**
   * Menerapkan rencana borongan dari calculateStockOutBulk dalam SATU
   * transaksi: penetapan baris asli lewat tabel temporer + UPDATE JOIN,
   * baris pecahan/sisa lewat createMany, dan pengurangan residue
   * lapisan lewat tabel temporer kedua. Seluruh nilai dikirim sebagai
   * parameter (Prisma.sql/join) — tidak ada teks bebas di query.
   *
   * Tabel temporer hidup per koneksi; transaksi interaktif menjamin
   * semua statement menumpang koneksi yang sama, dan keduanya dibuang
   * sebelum koneksi kembali ke kolam.
   */
  async applyBulkAssignments(data: {
    ubah: { id: number; stock_in_id: number; quantity: number }[];
    tambah: {
      product_id: number;
      quantity: number;
      date: Date;
      price: Decimal;
      stock_in_id: number | null;
      sales_invoice_id: number | null;
      sales_invoice_code_id: number | null;
      adjustment_case_id: number | null;
      adjustment_case_code_id: number | null;
    }[];
    konsumsi: { stock_in_id: number; quantity: number }[];
  }) {
    await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`
          CREATE TEMPORARY TABLE _rencana_hpp (
            id INT PRIMARY KEY,
            stock_in_id INT NOT NULL,
            quantity DECIMAL(12,2) NOT NULL
          )`;
        for (const bagian of this.potong(data.ubah, 5000)) {
          await tx.$executeRaw`
            INSERT INTO _rencana_hpp (id, stock_in_id, quantity)
            VALUES ${Prisma.join(
              bagian.map(
                (u) => Prisma.sql`(${u.id}, ${u.stock_in_id}, ${u.quantity})`
              )
            )}`;
        }
        await tx.$executeRaw`
          UPDATE stock_out
          JOIN _rencana_hpp ON _rencana_hpp.id = stock_out.id
          SET stock_out.stock_in_id = _rencana_hpp.stock_in_id,
              stock_out.quantity = _rencana_hpp.quantity`;

        for (const bagian of this.potong(data.tambah, 5000)) {
          await tx.stock_out.createMany({ data: bagian });
        }

        /*
          residue TIDAK di-increment/decrement — dihitung ulang dari
          kebenarannya: kuantitas lapisan dikurangi seluruh penetapan
          yang kini menempel padanya. Versi decrement pernah meleset
          62.334 unit pada uji dump produksi (bercampur dengan sisa
          keadaan sapuan per-baris yang dihentikan di tengah); hitung
          ulang kebal terhadap drift apa pun sekaligus menyembuhkan
          drift lama yang telanjur tersimpan.
        */
        await tx.$executeRaw`
          UPDATE stock_in
          LEFT JOIN (
            SELECT stock_out.stock_in_id, SUM(stock_out.quantity) AS terpakai
            FROM stock_out
            WHERE stock_out.stock_in_id IS NOT NULL
            GROUP BY stock_out.stock_in_id
          ) AS pakai ON pakai.stock_in_id = stock_in.id
          SET stock_in.residue = stock_in.quantity - COALESCE(pakai.terpakai, 0)`;

        await tx.$executeRaw`DROP TEMPORARY TABLE _rencana_hpp`;
      },
      // Bangun ulang historis menulis ratusan ribu baris — batas waktu
      // bawaan transaksi interaktif (5 detik) jelas tidak cukup.
      { timeout: 30 * 60 * 1000, maxWait: 60 * 1000 }
    );
  }

  /*
    tx diisi ketika pemanggilnya sudah berada di dalam transaksi interaktif,
    sehingga tulisan di sini ikut dibatalkan bila langkah berikutnya gagal.
    Tanpa tx, perilakunya persis seperti sebelumnya.
  */
  async create(data: IStockoutModel[], tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).stock_out.createMany({
      data: data.map((x) => {
        return {
          stock_in_id: null,
          date: x.date,
          product_id: x.product_id,
          quantity: x.quantity,
          sales_invoice_id: x.sales_invoice_id,
          sales_invoice_code_id: x.sales_invoice_code_id,
          adjustment_case_code_id: x.adjustment_case_code_id,
          adjustment_case_id: x.adjustment_case_id,
          price: x.price,
        };
      }),
    });
  }

  async decreaseMany(
    data: {
      sales_invoice_id: number;
      quantity: number;
    }[]
  ) {
    for (let i = 0; i < data.length; i++) {
      let quantity = data[i].quantity;
      while (quantity > 0) {
        if (quantity == 0) {
          break;
        }

        const stockOut = await this.prisma.stock_out.findFirst({
          where: {
            sales_invoice_id: data[i].sales_invoice_id,
          },
          orderBy: {
            stock_in_id: "desc",
          },
        });

        if (!stockOut) {
          console.error(`[error]: Stock out not found`);
          return;
        }

        const stockOutQuantity = Number(stockOut.quantity);

        if (stockOutQuantity > quantity) {
          await this.prisma.stock_out.update({
            where: {
              id: stockOut.id,
            },
            data: {
              quantity: {
                increment: -1 * quantity,
              },
            },
          });

          if (stockOut.stock_in_id != null) {
            await this.prisma.stock_in.update({
              where: {
                id: stockOut.stock_in_id,
              },
              data: {
                residue: {
                  increment: quantity,
                },
              },
            });
          }
          quantity = 0;
          break;
        } else if (stockOutQuantity == quantity) {
          await this.prisma.stock_out.delete({
            where: {
              id: stockOut.id,
            },
          });

          if (stockOut.stock_in_id != null) {
            await this.prisma.stock_in.update({
              where: {
                id: stockOut.stock_in_id,
              },
              data: {
                residue: {
                  increment: quantity,
                },
              },
            });
          }
          quantity = 0;
          break;
        } else {
          await this.prisma.stock_out.delete({
            where: {
              id: stockOut.id,
            },
          });

          if (stockOut.stock_in_id != null) {
            await this.prisma.stock_in.update({
              where: {
                id: stockOut.stock_in_id,
              },
              data: {
                residue: {
                  increment: stockOutQuantity,
                },
              },
            });
          }

          /* Dibulatkan dua desimal — pecahan float 1e-16 membuat while
             berputar sekali lagi tanpa perlu. */
          quantity = Math.round((quantity - stockOutQuantity) * 100) / 100;
        }
      }
    }
  }

  async calculate(month: number, year: number) {
    if (month > 0) {
      // Satu sumber untuk batas periode. Sebelumnya query mentah memakai
      // YEAR()/MONTH() sementara findMany di bawahnya memakai rentang
      // tanggal dengan batas atas yang meleset satu hari — dua bagian dari
      // satu laporan memakai definisi "bulan" yang berbeda.
      const periode = rentangBulan(year, month);
      const [result, unallocated] = await this.prisma.$transaction([
        this.prisma.$queryRaw<any[]>`
            SELECT
              SUM(stock_in.price * stock_out.quantity) AS hpp,
              SUM(stock_out.price * stock_out.quantity) AS sales,
              stock_in.company_id
            FROM stock_out
            LEFT JOIN stock_in ON stock_out.stock_in_id = stock_in.id
            WHERE stock_out.date >= ${periode.mulai}
            AND stock_out.date < ${periode.sebelum}
            GROUP BY stock_in.company_id
          `,
        this.prisma.stock_out.findMany({
          where: {
            stock_in_id: null,
            date: {
              gte: periode.mulai,
              lt: periode.sebelum,
            },
          },
        }),
      ]);

      return {
        data: result.map((x) => {
          return {
            hpp: Number(x.hpp),
            sales: Number(x.sales),
            company_id: x.company_id,
          };
        }),
        unallocated: unallocated.reduce((a, b) => {
          return a + Number(b.quantity) * Number(b.price);
        }, 0),
      };
    } else {
      const periode = rentangTahun(year);
      const [result, unallocated] = await this.prisma.$transaction([
        this.prisma.$queryRaw<any[]>`
            SELECT
              SUM(stock_in.price * stock_out.quantity) AS hpp,
              SUM(stock_out.price * stock_out.quantity) AS sales,
              stock_in.company_id
            FROM stock_out
            LEFT JOIN stock_in ON stock_out.stock_in_id = stock_in.id
            WHERE stock_out.date >= ${periode.mulai}
            AND stock_out.date < ${periode.sebelum}
            GROUP BY stock_in.company_id
          `,
        this.prisma.stock_out.findMany({
          where: {
            stock_in_id: null,
            date: {
              gte: periode.mulai,
              lt: periode.sebelum,
            },
          },
        }),
      ]);

      return {
        data: result.map((x) => {
          return {
            hpp: Number(x.hpp),
            sales: Number(x.sales),
            company_id: x.company_id,
          };
        }),
        unallocated: unallocated.reduce((a, b) => {
          return a + Number(b.quantity) * Number(b.price);
        }, 0),
      };
    }
  }

  async insertFromSalesInvoices() {
    await this.prisma.$queryRawUnsafe(`
        INSERT INTO stock_out (product_id, quantity, date, stock_in_id, price, sales_invoice_id, sales_invoice_code_id, adjustment_case_id, adjustment_case_code_id)
        SELECT sales_invoice.product_id, (sales_invoice.quantity - COALESCE(sr.quantity, 0))* IF(sales_invoice.product_unit_id IS NULL, 1, product_unit.conversion), sales_invoice_code.date,
        NULL, (sales_invoice.price - sales_invoice.discount) / IF(sales_invoice.product_unit_id IS NULL, 1, product_unit.conversion),
        sales_invoice.id, sales_invoice.sales_invoice_code_id, NULL, NULL
        FROM sales_invoice
        LEFT JOIN product_unit ON sales_invoice.product_unit_id = product_unit.id
        LEFT JOIN (
          SELECT SUM(sales_return.quantity) AS quantity, sales_return.sales_invoice_id
          FROM sales_return
          JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
          WHERE sales_return_code.is_confirm = 1
          AND sales_return_code.is_delete = 0
          GROUP BY sales_return.sales_invoice_id
        ) AS sr
        ON sales_invoice.id = sr.sales_invoice_id
        JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
        WHERE sales_invoice_code.is_delete = 0
        AND (sales_invoice.quantity - COALESCE(sr.quantity, 0)) > 0
        ORDER BY sales_invoice_code.date ASC, sales_invoice.id ASC
      `);
    // Baris <= 0 sengaja tidak dilahirkan: retur penuh berarti tidak ada
    // barang keluar bersih (dulu jadi baris 0,00 abadi yang disapu-lewati
    // selamanya), dan retur MELEBIHI penjualan adalah anomali pencatatan
    // yang harus dibereskan di dokumennya — baris minus di stock_out cuma
    // menyembunyikannya. Di dump produksi 17 Agu 2026 anomali itu ada dua:
    // sales_invoice 29034 (jual 4, retur 8) dan 682613 (jual 10, retur 13).
  }

  async insertFromAdjustmentCases() {
    await this.prisma.$queryRawUnsafe(`
        INSERT INTO stock_out (product_id, quantity, date, stock_in_id, price, sales_invoice_id, sales_invoice_code_id, adjustment_case_id, adjustment_case_code_id)
        SELECT adjustment_case.product_id, -1 * adjustment_case.quantity * IF(adjustment_case.product_unit_id IS NULL, 1, product_unit.conversion), adjustment_case_code.date,
        NULL, 0, NULL, NULL, adjustment_case.id, adjustment_case.adjustment_case_code_id
        FROM adjustment_case
        LEFT JOIN product_unit ON adjustment_case.product_unit_id = product_unit.id
        JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
        WHERE adjustment_case_code.is_delete = 0
        AND adjustment_case.quantity < 0
        ORDER BY adjustment_case_code.date ASC, adjustment_case.id ASC
      `);
  }

  async fetchCompanyOutputReport(data: { date: Date; companyID: number }) {
    const result = await this.prisma.stock_out.findMany({
      where: {
        stock_in: {
          company_id: data.companyID,
        },
        date: data.date,
      },
      include: {
        adjustment_case_code: {
          select: {
            name: true,
          },
        },
        sales_invoice_code: {
          select: {
            name: true,
            customer: true,
          },
        },
        product: true,
      },
    });

    return result.map((x) => {
      return {
        reference: x.product.reference,
        description: x.product.description,
        quantity: Number(x.quantity) * -1,
        document:
          x.sales_invoice_code != null
            ? x.sales_invoice_code.name
            : x.adjustment_case_code!.name,
        opponent:
          x.sales_invoice_code != null
            ? x.sales_invoice_code.customer == null
              ? "Retail"
              : x.sales_invoice_code.customer.name
            : "Internal",
      };
    });
  }

  async fetchDailySalesReport(data: { date: Date; type: number[] }) {
    const result = await this.prisma.$queryRawUnsafe<any[]>(`
          SELECT product.id, product.reference, product.description, product_brand.name AS brand_name,
          product_type.name AS type_name, product.unit, product.product_brand_id, product.product_type_id,
          COALESCE(goodReceiptCount.quantity, 0) AS goodReceipt,
          COALESCE(adjustmentCountPlus.quantity, 0) AS adjustmentCaseFound,
          COALESCE(adjustmentCountMinus.quantity, 0) AS adjustmentCaseLost,
          COALESCE(billCount.quantity, 0) AS salesInvoice,
          COALESCE(salesReturnCount.quantity, 0) AS salesReturn
          FROM product
          JOIN product_brand ON product.product_brand_id = product_brand.id
          JOIN product_type ON product.product_type_id = product_type.id
          LEFT JOIN (
            SELECT SUM(sales_invoice.quantity * COALESCE(product_unit.conversion, 1)) * -1 AS quantity, sales_invoice.product_id
            FROM sales_invoice
            LEFT JOIN product_unit ON sales_invoice.product_unit_id = product_unit.id
            JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
            WHERE sales_invoice_code.is_delete = 0
            AND sales_invoice_code.date = ${DateHelper.convertDate(
              data.date,
              formatDate.YYYYMMDD
            )}
            GROUP BY sales_invoice.product_id
          ) AS billCount
          ON product.id = billCount.product_id
          LEFT JOIN (
            SELECT SUM(adjustment_case.quantity * COALESCE(product_unit.conversion, 1)) AS quantity, adjustment_case.product_id
            FROM adjustment_case
            JOIN adjustment_case_code ON adjustment_case_code_id = adjustment_case_code.id
            LEFT JOIN product_unit ON adjustment_case.product_unit_id = product_unit.id
            WHERE adjustment_case_code.is_delete = 0
            AND adjustment_case_code.date = ${DateHelper.convertDate(
              data.date,
              formatDate.YYYYMMDD
            )}
            AND adjustment_case.quantity > 0
            GROUP BY adjustment_case.product_id
          ) AS adjustmentCountPlus
          ON product.id = adjustmentCountPlus.product_id
          LEFT JOIN (
            SELECT SUM(adjustment_case.quantity * COALESCE(product_unit.conversion, 1)) AS quantity, adjustment_case.product_id
            FROM adjustment_case
            JOIN adjustment_case_code ON adjustment_case_code_id = adjustment_case_code.id
            LEFT JOIN product_unit ON adjustment_case.product_unit_id = product_unit.id
            WHERE adjustment_case_code.is_delete = 0
            AND adjustment_case_code.date = ${DateHelper.convertDate(
              data.date,
              formatDate.YYYYMMDD
            )}
            AND adjustment_case.quantity < 0
            GROUP BY adjustment_case.product_id
          ) AS adjustmentCountMinus
          ON product.id = adjustmentCountMinus.product_id
          LEFT JOIN (
            SELECT SUM(good_receipt.quantity * COALESCE(product_unit.conversion, 1)) AS quantity, good_receipt.product_id
            FROM good_receipt
            JOIN good_receipt_code ON good_receipt_code_id = good_receipt_code.id
            LEFT JOIN product_unit ON good_receipt.product_unit_id = product_unit.id
            WHERE good_receipt_code.is_delete = 0
            AND good_receipt_code.date = ${DateHelper.convertDate(
              data.date,
              formatDate.YYYYMMDD
            )}
            GROUP BY good_receipt.product_id
          ) AS goodReceiptCount
          ON product.id = goodReceiptCount.product_id
          LEFT JOIN (
            SELECT SUM(sales_return.quantity * COALESCE(product_unit.conversion, 1)) AS quantity, sales_invoice.product_id
            FROM sales_return
            JOIN sales_return_code ON sales_return_code_id = sales_return_code.id
            JOIN sales_invoice ON sales_return.sales_invoice_id = sales_invoice.id
            LEFT JOIN product_unit ON sales_invoice.product_unit_id = product_unit.id
            WHERE sales_return_code.is_delete = 0
            AND sales_return_code.date = ${DateHelper.convertDate(
              data.date,
              formatDate.YYYYMMDD
            )}
            GROUP BY sales_invoice.product_id
          ) AS salesReturnCount
          ON product.id = salesReturnCount.product_id
          WHERE product_type.id IN (${data.type.join(",")})
          AND product.is_delete = 0
        `);

    return result.map((x) => {
      return {
        reference: x.reference,
        description: x.description,
        product_brand: {
          id: x.product_brand_id,
          name: x.brand_name,
        },
        product_type: {
          id: x.product_type_id,
          name: x.type_name,
        },
        goodReceipt: Number(x.goodReceipt),
        salesInvoice: Number(x.salesinvoice),
        salesReturn: Number(x.salesReturn),
        adjustmentCase: {
          found: Number(x.adjustmentCaseFound),
          lost: Number(x.adjustmentCaseLost),
        },
      };
    });
  }
}
