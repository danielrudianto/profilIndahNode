import { PrismaClient } from "@prisma/client";
import { ProductUnitModel } from "../models/product-unit.model";
import { IProductUnit } from "../interfaces/product-unit.interface";

export class ProductUnitRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: IProductUnit[]) {
    const result = await this.prisma.product_unit.createMany({
      data: data.map((unit) => {
        return {
          product_id: unit.product_id,
          unit: unit.unit,
          conversion: unit.conversion,
          created_by: unit.created_by!,
          created_at: unit.created_at!,
          sales_price: unit.sales_price,
          sales_discount: unit.sales_discount,
          purchase_price: unit.purchase_price,
          purchase_discount: unit.purchase_discount,
        };
      }),
    });

    return result.count;
  }

  async fetchByItemID(productID: number) {
    const result = await this.prisma.product_unit.findMany({
      where: { product_id: productID },
    });

    return result.map((unit) => {
      return ProductUnitModel.fromMap(unit);
    });
  }

  async fetchByID(id: number) {
    const result = await this.prisma.product_unit.findUnique({
      where: { id: id },
    });

    return result == null ? null : ProductUnitModel.fromMap(result);
  }

  /**
   * Benar bila satuan ini pernah ditunjuk apa pun — dokumen, paket,
   * draf, atau baris turunan stok.
   *
   * Angka inilah yang mengunci conversion: dokumen lama tidak menyimpan
   * hasil konversinya sendiri, hanya menunjuk satuan, jadi mengubah
   * rasio satuan yang sudah terpakai menggeser SELURUH riwayat — stok,
   * kartu stok, dan HPP — tanpa satu dokumen pun tampak berubah.
   */
  async terpakai(id: number): Promise<boolean> {
    const where = { where: { product_unit_id: id } };
    const [faktur, deposit, penerimaan, penyesuaian, draf, paket, kartu] =
      await this.prisma.$transaction([
        this.prisma.sales_invoice.count(where),
        this.prisma.sales_deposit.count(where),
        this.prisma.good_receipt.count(where),
        this.prisma.adjustment_case.count(where),
        this.prisma.draft_bill.count(where),
        this.prisma.package_content.count(where),
        this.prisma.stock_card.count(where),
      ]);

    return (
      faktur + deposit + penerimaan + penyesuaian + draf + paket + kartu > 0
    );
  }

  async createOne(data: IProductUnit) {
    const result = await this.prisma.product_unit.create({
      data: {
        product_id: data.product_id,
        unit: data.unit,
        conversion: data.conversion,
        created_by: data.created_by!,
        created_at: data.created_at!,
        sales_price: data.sales_price,
        sales_discount: data.sales_discount,
        purchase_price: data.purchase_price,
        purchase_discount: data.purchase_discount,
      },
    });

    return ProductUnitModel.fromMap(result);
  }

  /** conversion hanya dikirim pemanggil bila satuannya belum terpakai. */
  async update(id: number, data: { unit: string; conversion?: number }) {
    const result = await this.prisma.product_unit.update({
      where: { id: id },
      data: {
        unit: data.unit,
        ...(data.conversion !== undefined
          ? { conversion: data.conversion }
          : {}),
      },
    });

    return ProductUnitModel.fromMap(result);
  }

  /** Satuan yang belum pernah ditunjuk apa pun boleh benar-benar hilang. */
  async hardDelete(id: number) {
    await this.prisma.product_unit.delete({ where: { id: id } });
  }

  /**
   * Nonaktif untuk satuan yang sudah terpakai: hilang dari dokumen
   * baru, riwayat lama tetap menunjuk baris ini apa adanya.
   */
  async deactivate(id: number, userID: number) {
    await this.prisma.product_unit.update({
      where: { id: id },
      data: {
        is_delete: true,
        deleted_at: new Date(),
        deleted_by: userID,
      },
    });
  }
}
