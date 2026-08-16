import { ISupplier } from "../interfaces/supplier.interface";
import { PrismaClient } from "@prisma/client";
import SupplierModel from "../models/supplier.model";
import {
  IFetchCommon,
  IFetchCommonResult,
} from "../interfaces/fetch.interface";
import { toPositiveInt } from "../utils/sql.helper";

export class SupplierRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: ISupplier) {
    const result = await this.prisma.supplier.create({
      data: {
        name: data.name,
        address: data.address,
        npwp: data.npwp,
        created_by: data.created_by,
        created_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        address: true,
        npwp: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        created_at: true,
      },
    });

    return new SupplierModel({
      id: result.id,
      name: result.name,
      address: result.address!,
      npwp: result.npwp,
      created_by: result.user.id,
      created_at: result.created_at!,
      can_delete: true,
    });
  }

  async update(data: ISupplier) {
    try {
      const result = await this.prisma.supplier.update({
        where: {
          id: data.id,
        },
        data: {
          name: data.name,
          address: data.address,
          npwp: data.npwp,
          // Kolom supplier.updated_by dan updated_at sudah ada di basis data
          // tetapi tidak pernah diisi, jadi perubahan pada pemasok tidak
          // meninggalkan jejak siapa pun. Repository sejenis — customer,
          // company, payment_method, product_brand, product_type — sudah
          // mengisinya dengan pola yang sama.
          //
          // Nilainya diambil dari data.created_by dan data.created_at karena
          // itulah bidang yang dipakai controller untuk membawa identitas
          // PENYUNTING. Penamaan itu memang membingungkan dan berlaku di
          // seluruh repo; menggantinya berarti menyentuh setiap antarmuka
          // sekaligus, jadi dibiarkan seragam dulu. Kolom created_by dan
          // created_at yang sebenarnya tidak ikut ditulis di sini, sehingga
          // jejak pembuatannya tetap utuh.
          updated_by: data.created_by,
          updated_at: data.created_at,
        },
        select: {
          id: true,
          name: true,
          address: true,
          npwp: true,
          created_by: true,
          created_at: true,
        },
      });

      return new SupplierModel({
        id: result.id,
        name: result.name,
        address: result.address!,
        npwp: result.npwp || null,
        created_by: result.created_by!,
        created_at: result.created_at!,
      });
    } catch (error) {
      console.error(`[error]: Error on updating supplier ${error}`);
      throw new Error("Internal server error");
    }
  }

  async delete(id: number, userID: number) {
    try {
      const result = await this.prisma.supplier.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
          deleted_by: userID,
          deleted_at: new Date(),
        },
      });

      return new SupplierModel({
        id: result.id,
        name: result.name,
        address: result.address!,
        npwp: result.npwp || null,
        created_by: result.created_by!,
        created_at: result.created_at!,
        is_delete: true,
      });
    } catch (error) {
      console.error(`[error]: Error on deleting supplier ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetch(data: IFetchCommon): Promise<IFetchCommonResult<ISupplier>> {
    try {
      const [result, count] = await this.prisma.$transaction([
        this.prisma.$queryRawUnsafe<any[]>(
          `
              SELECT supplier.id, supplier.name, supplier.address, 
              supplier.npwp, user.name AS created_by_name, supplier.created_by,
              supplier.created_at, COALESCE(supplierCount.count, 0) AS count
              FROM supplier
              JOIN user ON supplier.created_by = user.id
              LEFT JOIN (
                SELECT COUNT(good_receipt_code.id) AS count, good_receipt_code.supplier_id
                FROM good_receipt_code
                WHERE is_delete = 0
                GROUP BY good_receipt_code.supplier_id
              ) supplierCount
              ON supplierCount.supplier_id = supplier.id
              WHERE supplier.is_delete = 0
              AND supplier.name LIKE ?
              ORDER BY name ASC
              LIMIT ${toPositiveInt(data.pageSize, 10)}
              OFFSET ${
                toPositiveInt(data.page, 1) * toPositiveInt(data.pageSize, 10) -
                toPositiveInt(data.pageSize, 10)
              }
            `,
          `%${data.keyword ?? ""}%`
        ),
        this.prisma.supplier.count({
          where: {
            is_delete: false,
            name: {
              contains: data.keyword,
            },
          },
        }),
      ]);

      return {
        data: result.map((item) => SupplierModel.fromMap(item)),
        count: count,
      };
    } catch (error) {
      console.error(`[error]: Error on fetching supplier data ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchAutocomplete(keyword: string) {
    try {
      const result = await this.prisma.supplier.findMany({
        where: {
          is_delete: false,
          name: {
            contains: keyword,
          },
        },
        select: {
          id: true,
          name: true,
          address: true,
          npwp: true,
          created_at: true,
          created_by: true,
        },
        orderBy: {
          name: "asc",
        },
        take: 5,
        skip: 0,
      });

      return result.map((item) => SupplierModel.fromMap(item));
    } catch (error) {
      console.error(
        `[error]: Error on fetching autocomplete supplier data ${error}`
      );
      throw new Error("Internal server error");
    }
  }

  async fetchByID(id: number): Promise<SupplierModel | null> {
    try {
      const supplier = await this.prisma.supplier.findUnique({
        where: {
          id: id,
        },
        select: {
          id: true,
          name: true,
          address: true,
          npwp: true,
          created_by: true,
          created_at: true,
          is_delete: true,
        },
      });

      if (!supplier) {
        return null;
      }

      return new SupplierModel({
        id: supplier.id,
        name: supplier.name,
        address: supplier.address!,
        npwp: supplier.npwp || null,
        created_by: supplier.created_by!,
        created_at: supplier.created_at!,
        is_delete: supplier.is_delete!,
      });
    } catch (error) {
      console.error(`[error]: Error on fetching supplier by ID ${error}`);
      throw error;
    }
  }

  /**
   * Laporan belanja pada satu supplier — hanya untuk super administrator.
   *
   * Seluruhnya agregat dari penerimaan barang yang tidak terhapus; tidak ada
   * baris dokumen mentah yang ikut terkirim. Nilai dihitung netto diskon
   * baris pada satuan dokumennya (harga x kuantitas satuan yang sama, jadi
   * tanpa konversi); kuantitas ditampilkan dalam satuan dasar supaya bisa
   * dijumlahkan lintas satuan. Tahun 0 berarti sepanjang waktu.
   */
  async fetchReport(supplierID: number, year: number) {
    try {
      const [ringkasan, merek, barang, tahunTersedia] = await Promise.all([
        this.prisma.$queryRaw<any[]>`
          SELECT
            COALESCE(SUM((gr.price - gr.discount) * gr.quantity), 0) AS total_nilai,
            COUNT(DISTINCT grc.id) AS jumlah_dokumen,
            COUNT(DISTINCT gr.product_id) AS produk_unik,
            MIN(grc.date) AS pertama,
            MAX(grc.date) AS terakhir
          FROM good_receipt gr
          JOIN good_receipt_code grc ON gr.good_receipt_code_id = grc.id
          WHERE grc.supplier_id = ${supplierID}
            AND grc.is_delete = 0
            AND gr.is_delete = 0
            AND (${year} = 0 OR YEAR(grc.date) = ${year})
        `,
        this.prisma.$queryRaw<any[]>`
          SELECT
            pb.name AS merek,
            COUNT(DISTINCT gr.product_id) AS produk_unik,
            COALESCE(SUM(gr.quantity * COALESCE(pu.conversion, 1)), 0) AS kuantitas,
            COALESCE(SUM((gr.price - gr.discount) * gr.quantity), 0) AS nilai
          FROM good_receipt gr
          JOIN good_receipt_code grc ON gr.good_receipt_code_id = grc.id
          JOIN product p ON gr.product_id = p.id
          JOIN product_brand pb ON p.product_brand_id = pb.id
          LEFT JOIN product_unit pu ON gr.product_unit_id = pu.id
          WHERE grc.supplier_id = ${supplierID}
            AND grc.is_delete = 0
            AND gr.is_delete = 0
            AND (${year} = 0 OR YEAR(grc.date) = ${year})
          GROUP BY pb.id, pb.name
          ORDER BY nilai DESC
        `,
        this.prisma.$queryRaw<any[]>`
          SELECT
            p.reference AS referensi,
            p.description AS deskripsi,
            p.unit AS satuan,
            COUNT(DISTINCT grc.id) AS jumlah_dokumen,
            COALESCE(SUM(gr.quantity * COALESCE(pu.conversion, 1)), 0) AS kuantitas,
            COALESCE(SUM((gr.price - gr.discount) * gr.quantity), 0) AS nilai
          FROM good_receipt gr
          JOIN good_receipt_code grc ON gr.good_receipt_code_id = grc.id
          JOIN product p ON gr.product_id = p.id
          LEFT JOIN product_unit pu ON gr.product_unit_id = pu.id
          WHERE grc.supplier_id = ${supplierID}
            AND grc.is_delete = 0
            AND gr.is_delete = 0
            AND (${year} = 0 OR YEAR(grc.date) = ${year})
          GROUP BY p.id, p.reference, p.description, p.unit
          ORDER BY jumlah_dokumen DESC, nilai DESC
          LIMIT 15
        `,
        this.prisma.$queryRaw<any[]>`
          SELECT DISTINCT YEAR(grc.date) AS tahun
          FROM good_receipt_code grc
          WHERE grc.supplier_id = ${supplierID}
            AND grc.is_delete = 0
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
      console.error(`[error]: Error on fetching supplier report ${error}`);
      throw new Error("Internal server error");
    }
  }
}
