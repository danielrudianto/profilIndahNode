import { PrismaClient } from "@prisma/client";
import { PAYMENT_ROUNDING_TOLERANCE } from "../constants/receivable.constant";
import { CustomerModel } from "../models/customer.model";
import { ICustomer } from "../interfaces/customer.interface";
import { UserViewModel } from "../models/user.model";
import {
  IFetchCommon,
  IFetchCommonResult,
} from "../interfaces/fetch.interface";

export class CustomerRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: ICustomer): Promise<CustomerModel> {
    try {
      const result = await this.prisma.customer.create({
        data: {
          name: data.name,
          address: data.address,
          npwp: data.npwp,
          pic: data.pic,
          phone_number: data.phone_number,
          created_by: data.created_by!,
          created_at: data.created_at,
        },
        include: {
          user: {
            select: {
              name: true,
              username: true,
              role: true,
            },
          },
        },
      });

      return CustomerModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error on creating customer: ${error}`);
      throw error;
    }
  }

  async update(data: ICustomer): Promise<CustomerModel> {
    try {
      const result = await this.prisma.customer.update({
        where: {
          id: data.id,
        },
        data: {
          name: data.name,
          address: data.address,
          npwp: data.npwp,
          pic: data.pic,
          phone_number: data.phone_number,
          updated_by: data.created_by,
          updated_at: data.created_at,
        },
        include: {
          user: {
            select: {
              name: true,
              username: true,
              role: true,
            },
          },
        },
      });

      return CustomerModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error on updating customer: ${error}`);
      throw error;
    }
  }

  async delete(id: number, userID: number): Promise<CustomerModel> {
    try {
      const result = await this.prisma.customer.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
          deleted_by: userID,
          deleted_at: new Date(),
        },
        include: {
          user: {
            select: {
              name: true,
              username: true,
              role: true,
            },
          },
        },
      });

      return new CustomerModel({
        id: result.id,
        name: result.name,
        address: result.address,
        npwp: result.npwp,
        pic: result.pic,
        phone_number: result.phone_number,
        created_by: result.created_by,
        created_at: result.created_at,
        user: UserViewModel.fromMap(result.user),
        is_delete: result.is_delete,
        deleted_at: result.deleted_at,
        deleted_by: result.deleted_by,
      });
    } catch (error) {
      console.error(`[error]: Error on deleting customer: ${error}`);
      throw error;
    }
  }

  async fetch(data: IFetchCommon): Promise<IFetchCommonResult<CustomerModel>> {
    const { keyword, pageSize, page } = data;

    // Prisma count query
    const countQuery = {
      where: {
        is_delete: false,
        OR: [
          { name: { contains: keyword } },
          { address: { contains: keyword } },
          { npwp: { contains: keyword } },
          { pic: { contains: keyword } },
          { phone_number: { contains: keyword } },
        ],
      },
    };

    // Execute queries in a transaction
    try {
      const [result, count] = await this.prisma.$transaction([
        this.prisma.customer.findMany({
          ...countQuery,
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
        this.prisma.customer.count(countQuery),
      ]);

      return {
        data: result.map((x) => {
          return new CustomerModel({
            id: x.id,
            name: x.name,
            address: x.address,
            npwp: x.npwp,
            pic: x.pic,
            phone_number: x.phone_number,
            created_at: x.created_at,
            is_delete: x.is_delete,
            created_by: x.created_by,
          });
        }),
        count: count,
      };
    } catch (error) {
      console.error(`[error]: Error on fetching customer data: ${error}`);
      throw error;
    }
  }

  async fetchByID(id: number): Promise<CustomerModel | null> {
    try {
      const customer = await this.prisma.$queryRaw<any[]>`
        SELECT customer.id, customer.name, customer.address, 
        customer.pic, customer.npwp, customer.phone_number, 
        IF(COALESCE(itemCount.count, 0) = 0, "1", "0") AS can_delete
        FROM customer
        LEFT JOIN (
          SELECT COUNT(sales_invoice_code.id) AS count, sales_invoice_code.customer_id
          FROM sales_invoice_code
          WHERE sales_invoice_code.is_delete = 0
          AND sales_invoice_code.customer_id = ${id}
          GROUP BY sales_invoice_code.customer_id
        ) itemCount
        ON customer.id = itemCount.customer_id
        WHERE customer.id = ${id}
      `;

      if (!customer) {
        return null;
      }

      if (customer.length == 0) {
        return null;
      }

      const customerData = customer[0];
      return new CustomerModel({
        id: customerData.id,
        name: customerData.name,
        address: customerData.address,
        npwp: customerData.npwp,
        pic: customerData.pic,
        phone_number: customerData.phone_number,
        can_delete: customerData.can_delete == 1,
        is_delete: customerData.is_delete,
      });
    } catch (error) {
      console.error(`[error]: Error on fetching customer by ID: ${error}`);
      throw error;
    }
  }

  async fetchByIDs(ids: number[]): Promise<CustomerModel[]> {
    if (ids.length === 0) return Promise.resolve([]);

    try {
      const result = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT customer.id, IF(COALESCE(itemCount.count, 0) = 0, "1", "0") AS can_delete,
        customer.name, customer.address, customer.npwp, customer.pic, customer.phone_number, customer.is_delete
        FROM customer
        LEFT JOIN (
          SELECT COUNT(sales_invoice_code.id) AS count, sales_invoice_code.customer_id
          FROM sales_invoice_code
          WHERE sales_invoice_code.is_delete = 0
        ) itemCount
        ON customer.id = itemCount.customer_id
        WHERE customer.id IN (${ids.join(",")})
      `);

      return result.map((item) => {
        return new CustomerModel({
          id: item.id,
          name: item.name,
          address: item.address,
          npwp: item.npwp,
          pic: item.pic,
          phone_number: item.phone_number,
          can_delete: item.can_delete == 1,
          is_delete: item.is_delete == 1,
        });
      });
    } catch (error) {
      console.error(`[error]: Error on fetching customers by IDs: ${error}`);
      throw error;
    }
  }

  async fetchAutocomplete(keyword: string): Promise<CustomerModel[]> {
    try {
      const result = await this.prisma.customer.findMany({
        where: {
          is_delete: false,
          OR: [
            {
              name: {
                contains: keyword,
              },
            },
            {
              address: {
                contains: keyword,
              },
            },
            {
              npwp: {
                contains: keyword,
              },
            },
            {
              pic: {
                contains: keyword,
              },
            },
            {
              phone_number: {
                contains: keyword,
              },
            },
          ],
        },
        orderBy: {
          name: "asc",
        },
        take: 5,
        skip: 0,
      });

      return result.map((item) => {
        return new CustomerModel({
          id: item.id,
          name: item.name,
          address: item.address,
          npwp: item.npwp,
          pic: item.pic,
          phone_number: item.phone_number,
          created_at: item.created_at,
          is_delete: item.is_delete,
          created_by: item.created_by,
        });
      });
    } catch (error) {
      console.error(
        `[error]: Error on fetching customer autocomplete: ${error}`
      );
      throw error;
    }
  }

  async fetchSalesStatistics(userID: number): Promise<number> {
    try {
      const count = await this.prisma.customer.count({
        where: {
          created_by: userID,
        },
      });

      return count;
    } catch (error) {
      console.error(`[error]: Error on fetching customer statistics: ${error}`);
      throw error;
    }
  }

  async fetchAll(): Promise<CustomerModel[]> {
    try {
      const result = await this.prisma.customer.findMany({
        where: {
          is_delete: false,
        },
      });

      return result.map((item) => {
        return new CustomerModel({
          id: item.id,
          name: item.name,
          address: item.address,
          npwp: item.npwp,
          pic: item.pic,
          phone_number: item.phone_number,
          created_at: item.created_at,
          is_delete: item.is_delete,
          created_by: item.created_by,
        });
      });
    } catch (error) {
      console.error(`[error]: Error on fetching all customers: ${error}`);
      throw error;
    }
  }

  /*
    Laporan penjualan pada satu pelanggan — cermin fetchReport milik
    SupplierRepository. Nilai memakai baris faktur (harga - diskon) * kuantitas,
    sama dengan peringkat pelanggan di laporan penjualan; diskon/ongkos level
    dokumen sengaja tidak dihitung supaya kedua angka itu selalu cocok.
    Tahun 0 berarti sepanjang waktu.
  */
  async fetchReport(customerID: number, year: number) {
    try {
      const [ringkasan, merek, barang, tahunTersedia] = await Promise.all([
        this.prisma.$queryRaw<any[]>`
          SELECT
            COALESCE(SUM((si.price - si.discount) * si.quantity), 0) AS total_nilai,
            COUNT(DISTINCT sic.id) AS jumlah_dokumen,
            COUNT(DISTINCT si.product_id) AS produk_unik,
            MIN(sic.date) AS pertama,
            MAX(sic.date) AS terakhir
          FROM sales_invoice si
          JOIN sales_invoice_code sic ON si.sales_invoice_code_id = sic.id
          WHERE sic.customer_id = ${customerID}
            AND sic.is_delete = 0
            AND (${year} = 0 OR YEAR(sic.date) = ${year})
        `,
        this.prisma.$queryRaw<any[]>`
          SELECT
            pb.name AS merek,
            COUNT(DISTINCT si.product_id) AS produk_unik,
            COALESCE(SUM(si.quantity * COALESCE(pu.conversion, 1)), 0) AS kuantitas,
            COALESCE(SUM((si.price - si.discount) * si.quantity), 0) AS nilai
          FROM sales_invoice si
          JOIN sales_invoice_code sic ON si.sales_invoice_code_id = sic.id
          JOIN product p ON si.product_id = p.id
          JOIN product_brand pb ON p.product_brand_id = pb.id
          LEFT JOIN product_unit pu ON si.product_unit_id = pu.id
          WHERE sic.customer_id = ${customerID}
            AND sic.is_delete = 0
            AND (${year} = 0 OR YEAR(sic.date) = ${year})
          GROUP BY pb.id, pb.name
          ORDER BY nilai DESC
        `,
        this.prisma.$queryRaw<any[]>`
          SELECT
            p.reference AS referensi,
            p.description AS deskripsi,
            p.unit AS satuan,
            COUNT(DISTINCT sic.id) AS jumlah_dokumen,
            COALESCE(SUM(si.quantity * COALESCE(pu.conversion, 1)), 0) AS kuantitas,
            COALESCE(SUM((si.price - si.discount) * si.quantity), 0) AS nilai
          FROM sales_invoice si
          JOIN sales_invoice_code sic ON si.sales_invoice_code_id = sic.id
          JOIN product p ON si.product_id = p.id
          LEFT JOIN product_unit pu ON si.product_unit_id = pu.id
          WHERE sic.customer_id = ${customerID}
            AND sic.is_delete = 0
            AND (${year} = 0 OR YEAR(sic.date) = ${year})
          GROUP BY p.id, p.reference, p.description, p.unit
          ORDER BY jumlah_dokumen DESC, nilai DESC
          LIMIT 15
        `,
        this.prisma.$queryRaw<any[]>`
          SELECT DISTINCT YEAR(sic.date) AS tahun
          FROM sales_invoice_code sic
          WHERE sic.customer_id = ${customerID}
            AND sic.is_delete = 0
            AND sic.date IS NOT NULL
          ORDER BY tahun DESC
        `,
      ]);

      const r = ringkasan[0] ?? {};
      return {
        summary: {
          totalValue: Number(r.total_nilai ?? 0),
          documentCount: Number(r.jumlah_dokumen ?? 0),
          uniqueProducts: Number(r.produk_unik ?? 0),
          firstDate: r.pertama ?? null,
          lastDate: r.terakhir ?? null,
        },
        brands: merek.map((x) => ({
          name: x.merek,
          uniqueProducts: Number(x.produk_unik),
          quantity: Number(x.kuantitas),
          value: Number(x.nilai),
        })),
        topProducts: barang.map((x) => ({
          reference: x.referensi,
          description: x.deskripsi,
          unit: x.satuan,
          documentCount: Number(x.jumlah_dokumen),
          quantity: Number(x.kuantitas),
          value: Number(x.nilai),
        })),
        availableYears: tahunTersedia.map((x) => Number(x.tahun)),
      };
    } catch (error) {
      console.error(`[error]: Error on fetching customer report ${error}`);
      throw new Error("Internal server error");
    }
  }
  /*
    Piutang BERJALAN pelanggan ini — potret sekarang, sengaja tidak ikut
    saringan tahun laporan. Rumus dan toleransi pembulatannya menyalin
    daftar piutang: sisa <= Rp 5 bukan piutang.
  */
  async fetchOutstandingReceivable(customerID: number): Promise<number> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT SUM(sub.value) AS value, SUM(sub.payment) AS payment
      FROM (
        SELECT
          (COALESCE(si.value, 0) + sales_invoice_code.delivery + sales_invoice_code.service + sales_invoice_code.admin_fee - sales_invoice_code.discount - COALESCE((SELECT SUM(src.receivable_value) FROM sales_return_code src WHERE src.sales_invoice_code_id = sales_invoice_code.id AND src.is_confirm = 1 AND src.is_delete = 0), 0)) AS value,
          COALESCE(sip.value, 0) AS payment
        FROM sales_invoice_code
        /*
          LEFT, bukan INNER. Faktur jasa murni tidak punya baris di
          sales_invoice; INNER JOIN membuangnya, sehingga sisa tagihan
          pelanggan terbaca lebih kecil daripada yang sebenarnya.
        */
        LEFT JOIN (
          SELECT
            SUM(sales_invoice.quantity * (sales_invoice.price - sales_invoice.discount)) AS value,
            sales_invoice.sales_invoice_code_id
          FROM sales_invoice
          JOIN sales_invoice_code AS kode ON kode.id = sales_invoice.sales_invoice_code_id
          WHERE kode.is_paid = false AND kode.is_delete = false
            AND kode.customer_id = ${customerID}
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
            AND kode.customer_id = ${customerID}
          GROUP BY sales_invoice_payment.sales_invoice_code_id
        ) AS sip
        ON sales_invoice_code.id = sip.sales_invoice_code_id
        WHERE sales_invoice_code.is_paid = false
          AND sales_invoice_code.is_delete = false
          AND sales_invoice_code.customer_id = ${customerID}
      ) AS sub`;

    const sisa =
      Number(result[0]?.value ?? 0) - Number(result[0]?.payment ?? 0);
    return sisa > PAYMENT_ROUNDING_TOLERANCE ? sisa : 0;
  }

  /*
    Faktur pelanggan ini, terbaru dulu, berhalaman — untuk kartu daftar
    faktur di laporan pelanggan. Totalnya dihitung di SQL supaya tidak
    menarik ribuan baris item ke Node.
  */
  async fetchInvoices(data: {
    customerID: number;
    page: number;
    pageSize: number;
  }): Promise<{ data: any[]; count: number }> {
    const limit = data.pageSize;
    const offset = (data.page - 1) * data.pageSize;

    const [baris, hitung] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT sic.id, sic.name, sic.date, sic.is_paid,
          SUM(si.quantity * (si.price - si.discount))
            + sic.delivery + sic.service + sic.admin_fee - sic.discount - COALESCE((SELECT SUM(src.receivable_value) FROM sales_return_code src WHERE src.sales_invoice_code_id = sic.id AND src.is_confirm = 1 AND src.is_delete = 0), 0) AS total
        FROM sales_invoice_code sic
        JOIN sales_invoice si ON si.sales_invoice_code_id = sic.id
        WHERE sic.customer_id = ${data.customerID} AND sic.is_delete = false
        GROUP BY sic.id, sic.name, sic.date, sic.is_paid,
          sic.delivery, sic.service, sic.admin_fee, sic.discount
        ORDER BY sic.date DESC, sic.id DESC
        LIMIT ${limit} OFFSET ${offset}`,
      this.prisma.sales_invoice_code.count({
        where: { customer_id: data.customerID, is_delete: false },
      }),
    ]);

    return {
      data: baris.map((x) => ({
        id: Number(x.id),
        name: x.name,
        date: x.date,
        isPaid: Boolean(x.is_paid),
        total: Number(x.total),
      })),
      count: hitung,
    };
  }
}
